import TcpSocket from 'react-native-tcp-socket';
import * as FileSystem from 'expo-file-system';
import { MediaStoreWatcher } from './MediaStoreWatcher';

import type {
  GalleryPhoto,
  ListReqMessage,
  ThumbReqMessage,
  FullReqMessage,
  SocketMessage,
} from '../types/gallery.types';

const SERVER_PORT = 8787;
const KEEPALIVE_INTERVAL_MS = 10000;

export type ServerCallbacks = {
  onViewerConnected: (viewerCount: number) => void;
  onViewerDisconnected: (viewerCount: number) => void;
};

type ClientSession = {
  socket: any;
  buffer: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readAsBase64(uri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (err) {
    console.warn('[GalleryServer] readAsBase64 failed for', uri, err);
    return null;
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

export class GallerySocketServer {
  private static server: any = null;
  private static watcher = new MediaStoreWatcher();
  private static clients: Map<string, ClientSession> = new Map();
  private static clientIdCounter = 0;
  private static keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private static callbacks: ServerCallbacks | null = null;
  private static isRunning = false;

  static start(callbacks: ServerCallbacks) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.callbacks = callbacks;
    this.clients.clear();

    this.server = TcpSocket.createServer((socket: any) => {
      const clientId = `client-${++this.clientIdCounter}`;
      const session: ClientSession = { socket, buffer: '' };
      this.clients.set(clientId, session);

      console.log(`[GalleryServer] viewer connected: ${clientId}`);
      callbacks.onViewerConnected(this.clients.size);

      socket.on('data', (data: { toString(): string }) => {
        this.handleData(clientId, data.toString());
      });

      socket.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[GalleryServer] viewer disconnected: ${clientId}`);
        callbacks.onViewerDisconnected(this.clients.size);
      });

      socket.on('error', (err: Error) => {
        console.warn(`[GalleryServer] socket error for ${clientId}:`, err.message);
        this.clients.delete(clientId);
        callbacks.onViewerDisconnected(this.clients.size);
      });
    });

    this.server.listen({ port: SERVER_PORT, host: '0.0.0.0' }, () => {
      console.log(`[GalleryServer] listening on port ${SERVER_PORT}`);
    });

    this.server.on('error', (err: Error) => {
      console.error('[GalleryServer] server error:', err.message);
    });

    // Keepalive pings
    this.keepaliveTimer = setInterval(() => {
      this.broadcast({ type: 'PING' });
    }, KEEPALIVE_INTERVAL_MS);

    // Watch for new photos and push to all viewers
    this.watcher.start((photo: GalleryPhoto) => {
      this.broadcast({ type: 'NEW_PHOTO', photo: { ...photo, uri: '' } });
    });
  }

  static stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    this.watcher.stop();

    if (this.keepaliveTimer != null) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }

    for (const session of this.clients.values()) {
      try { session.socket.destroy(); } catch {}
    }
    this.clients.clear();

    try { this.server?.close(); } catch {}
    this.server = null;
    this.callbacks = null;
    console.log('[GalleryServer] stopped');
  }

  // ── Message handling ────────────────────────────────────────────────────────

  private static handleData(clientId: string, chunk: string) {
    const session = this.clients.get(clientId);
    if (!session) return;

    session.buffer += chunk;
    const lines = session.buffer.split('\n');
    session.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg: SocketMessage = JSON.parse(trimmed);
        this.handleMessage(clientId, msg);
      } catch {
        console.warn('[GalleryServer] bad message from', clientId, trimmed.slice(0, 80));
      }
    }
  }

  private static handleMessage(clientId: string, msg: SocketMessage) {
    switch (msg.type) {
      case 'LIST_REQ':
        this.handleListReq(clientId, msg).catch(e =>
          console.warn('[GalleryServer] LIST_REQ error', e),
        );
        break;
      case 'THUMB_REQ':
        this.handleThumbReq(clientId, msg).catch(e =>
          console.warn('[GalleryServer] THUMB_REQ error', e),
        );
        break;
      case 'FULL_REQ':
        this.handleFullReq(clientId, msg).catch(e =>
          console.warn('[GalleryServer] FULL_REQ error', e),
        );
        break;
      case 'PONG':
        break;
      default:
        break;
    }
  }

  private static async handleListReq(clientId: string, msg: ListReqMessage) {
    const { photos, total } = await MediaStoreWatcher.getPage(msg.page, msg.pageSize);
    this.sendTo(clientId, {
      type: 'LIST_RES',
      total,
      page: msg.page,
      // Strip local URIs before sending — client requests thumb/full separately
      photos: photos.map(p => ({ ...p, uri: '' })),
    });
  }

  private static async handleThumbReq(clientId: string, msg: ThumbReqMessage) {
    // asset.id on Android is the content URI string
    const base64 = await readAsBase64(msg.id);
    if (!base64) return;

    this.sendTo(clientId, {
      type: 'THUMB_RES',
      id: msg.id,
      length: base64.length,
      mimeType: 'image/jpeg',
      data: base64,
    });
  }

  private static async handleFullReq(clientId: string, msg: FullReqMessage) {
    const base64 = await readAsBase64(msg.id);
    if (!base64) return;

    this.sendTo(clientId, {
      type: 'FULL_RES',
      id: msg.id,
      length: base64.length,
      mimeType: 'image/jpeg',
      data: base64,
    });
  }

  // ── Transport helpers ───────────────────────────────────────────────────────

  private static sendTo(clientId: string, msg: object) {
    const session = this.clients.get(clientId);
    if (!session) return;
    try {
      session.socket.write(JSON.stringify(msg) + '\n');
    } catch (err) {
      console.warn('[GalleryServer] sendTo failed:', err);
    }
  }

  private static broadcast(msg: object) {
    const payload = JSON.stringify(msg) + '\n';
    for (const [, session] of this.clients) {
      try { session.socket.write(payload); } catch {}
    }
  }
}
