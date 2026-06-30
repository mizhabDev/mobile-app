import TcpSocket from 'react-native-tcp-socket';
import type {
  GalleryPhoto,
  SocketMessage,
  GalleryConnectionState,
  ListResMessage,
  ThumbResMessage,
  FullResMessage,
  NewPhotoMessage,
} from '../types/gallery.types';

const SERVER_PORT = 8787;
// Android Wi-Fi Direct Group Owner always uses this address on the P2P interface
const GROUP_OWNER_ADDRESS = '192.168.49.1';

const RECONNECT_DELAYS = [2000, 4000, 8000, 15000, 30000]; // exponential backoff
const KEEPALIVE_TIMEOUT_MS = 30000;
const PAGE_SIZE = 30;

export type ClientCallbacks = {
  onConnectionStateChange: (state: GalleryConnectionState) => void;
  onPhotoList: (msg: ListResMessage) => void;
  onThumbnail: (id: string, base64: string) => void;
  onFullImage: (id: string, base64: string) => void;
  onNewPhoto: (photo: GalleryPhoto) => void;
};

export class GallerySocketClient {
  private socket: any = null;
  private buffer = '';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPongAt = Date.now();
  private callbacks: ClientCallbacks;
  private destroyed = false;

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  connect() {
    if (this.destroyed) return;
    this.callbacks.onConnectionStateChange('connecting');
    this._connect();
  }

  destroy() {
    this.destroyed = true;
    this._clearTimers();
    try { this.socket?.destroy(); } catch {}
    this.socket = null;
  }

  requestPage(page: number) {
    this._send({ type: 'LIST_REQ', page, pageSize: PAGE_SIZE });
  }

  requestThumbnail(id: string) {
    this._send({ type: 'THUMB_REQ', id });
  }

  requestFullImage(id: string) {
    this._send({ type: 'FULL_REQ', id });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _connect() {
    if (this.destroyed) return;

    try {
      const socket = TcpSocket.createConnection(
        {
          port: SERVER_PORT,
          host: GROUP_OWNER_ADDRESS,
          tls: false,
        },
        () => {
          console.log('[GalleryClient] connected to', GROUP_OWNER_ADDRESS);
          this.reconnectAttempt = 0;
          this.lastPongAt = Date.now();
          this.callbacks.onConnectionStateChange('connected');
          this._startKeepaliveWatch();
          // Immediately request first page of photos
          this.requestPage(0);
        },
      );

      socket.on('data', (data: { toString(): string }) => {
        this._handleData(data.toString());
      });

      socket.on('close', () => {
        if (this.destroyed) return;
        console.log('[GalleryClient] connection closed — scheduling reconnect');
        this.callbacks.onConnectionStateChange('reconnecting');
        this._scheduleReconnect();
      });

      socket.on('error', (err: Error) => {
        if (this.destroyed) return;
        console.warn('[GalleryClient] socket error:', err.message);
        this.callbacks.onConnectionStateChange('reconnecting');
        this._scheduleReconnect();
      });

      this.socket = socket;
    } catch (err) {
      console.warn('[GalleryClient] createConnection threw:', err);
      this._scheduleReconnect();
    }
  }

  private _handleData(chunk: string) {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg: any = JSON.parse(trimmed);
        this._handleMessage(msg as SocketMessage);
      } catch {
        console.warn('[GalleryClient] unparseable message:', trimmed.slice(0, 80));
      }
    }
  }

  private _handleMessage(msg: SocketMessage & { data?: string }) {
    switch (msg.type) {
      case 'LIST_RES':
        this.callbacks.onPhotoList(msg as ListResMessage);
        break;

      case 'THUMB_RES': {
        const thumbMsg = msg as ThumbResMessage & { data?: string };
        if (thumbMsg.data) {
          this.callbacks.onThumbnail(thumbMsg.id, thumbMsg.data);
        }
        break;
      }

      case 'FULL_RES': {
        const fullMsg = msg as FullResMessage & { data?: string };
        if (fullMsg.data) {
          this.callbacks.onFullImage(fullMsg.id, fullMsg.data);
        }
        break;
      }

      case 'NEW_PHOTO':
        this.callbacks.onNewPhoto((msg as NewPhotoMessage).photo);
        break;

      case 'PING':
        this._send({ type: 'PONG' });
        this.lastPongAt = Date.now();
        break;

      case 'PONG':
        this.lastPongAt = Date.now();
        break;

      default:
        break;
    }
  }

  private _send(msg: object) {
    if (!this.socket) return;
    try {
      this.socket.write(JSON.stringify(msg) + '\n');
    } catch (err) {
      console.warn('[GalleryClient] send failed:', err);
    }
  }

  private _scheduleReconnect() {
    this._clearTimers();
    if (this.destroyed) return;

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;

    console.log(`[GalleryClient] reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) this._connect();
    }, delay);
  }

  private _startKeepaliveWatch() {
    this._clearKeepalive();
    const check = () => {
      if (this.destroyed) return;
      const elapsed = Date.now() - this.lastPongAt;
      if (elapsed > KEEPALIVE_TIMEOUT_MS) {
        console.warn('[GalleryClient] keepalive timeout — reconnecting');
        try { this.socket?.destroy(); } catch {}
        this.callbacks.onConnectionStateChange('reconnecting');
        this._scheduleReconnect();
        return;
      }
      this.keepaliveTimer = setTimeout(check, 5000);
    };
    this.keepaliveTimer = setTimeout(check, 5000);
  }

  private _clearKeepalive() {
    if (this.keepaliveTimer != null) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }

  private _clearTimers() {
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._clearKeepalive();
  }
}
