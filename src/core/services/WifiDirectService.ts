import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  connect,
  cancelConnect,
  createGroup,
  getAvailablePeers,
  getConnectionInfo,
  getGroupInfo,
  removeGroup,
  subscribeOnEvent,
  PEERS_UPDATED_ACTION,
  CONNECTION_INFO_UPDATED_ACTION,
  THIS_DEVICE_CHANGED_ACTION,
} from 'react-native-wifi-p2p';
import { PermissionsAndroid, Platform } from 'react-native';
import {SystemWifiStateService} from '@/core/services/SystemWifiStateService';
import {WifiDirectDebugLog} from '@/core/services/WifiDirectDebugLog';

type WifiP2pDevice = {
  deviceAddress: string;
  deviceName?: string;
  isGroupOwner?: boolean;
  status?: number;
};

type WifiP2pConnectionInfo = {
  groupFormed: boolean;
  isGroupOwner: boolean;
  groupOwnerAddress: {
    hostAddress: string;
    isLoopbackAddress: boolean;
  } | null;
};

type WifiP2pGroupInfo = {
  interface: string;
  networkName: string;
  passphrase: string;
  owner: {
    deviceAddress: string;
    deviceName: string;
    status: number;
  };
};

type WifiP2pQrPayload = {
  type: 'ENTE_PHOTO_WIFI_DIRECT';
  version: number;
  hostId: string;
  // NOTE: hostDeviceName and hostDeviceAddress are intentionally omitted from v3+
  // Android 10+ returns placeholder MACs (02:00:00:00:00:00) so these fields
  // cannot be used for peer matching. Only hostId identifies the session.
  hostDeviceName?: string;
  hostDeviceAddress?: string;
  networkName?: string;
};

export class WifiDirectError extends Error {
  constructor(
    message: string,
    public readonly phase: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'WifiDirectError';
  }
}

export class WifiDirectService {
  private static isInitialized = false;
  private static readonly logPrefix = '[WiFiDirect]';
  private static diagnosticsSubscriptions: Array<{remove: () => void}> = [];
  private static lastPeerSnapshot: WifiP2pDevice[] = [];
  private static lastPermissions: Record<string, string> = {};

  static async requestPermissions() {
    if (Platform.OS !== 'android') return false;
    
    try {
      const requestedPermissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        'android.permission.ACCESS_WIFI_STATE',
        'android.permission.CHANGE_WIFI_STATE',
        PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES || 'android.permission.NEARBY_WIFI_DEVICES',
      ] as Parameters<typeof PermissionsAndroid.requestMultiple>[0];
      const grants = (await PermissionsAndroid.requestMultiple(
        requestedPermissions,
      )) as Record<string, string>;
      this.lastPermissions = grants;

      const fineLocationGranted =
        grants['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const coarseLocationGranted =
        grants['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const nearbyWifiGranted =
        Platform.Version < 33 ||
        grants['android.permission.NEARBY_WIFI_DEVICES'] === PermissionsAndroid.RESULTS.GRANTED;
      const accessWifiGranted =
        grants['android.permission.ACCESS_WIFI_STATE'] === PermissionsAndroid.RESULTS.GRANTED ||
        grants['android.permission.ACCESS_WIFI_STATE'] == null;
      const changeWifiGranted =
        grants['android.permission.CHANGE_WIFI_STATE'] === PermissionsAndroid.RESULTS.GRANTED ||
        grants['android.permission.CHANGE_WIFI_STATE'] == null;
      
      this.log('permissions', grants);
      return (
        (fineLocationGranted || coarseLocationGranted) &&
        nearbyWifiGranted &&
        accessWifiGranted &&
        changeWifiGranted
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  static async init() {
    if (this.isInitialized) return;
    try {
      this.log('initialize:start');
      const initialized = await initialize();
      if (!initialized) {
        throw new WifiDirectError('WifiP2pManager.initialize returned false.', 'initialize');
      }
      this.isInitialized = true;
      this.attachDiagnostics();
      this.log('initialize:success');
    } catch (e) {
      this.log('initialize:failure', e);
      this.log('onFailure:initialize', this.describeFailure(e));
      throw this.toWifiDirectError(e, 'initialize', 'Failed to initialize WiFi Direct.');
    }
  }

  static async startHostGroup() {
    try {
      await this.cleanup();

      this.log('groupCreated:start');
      await createGroup();
      const groupInfo = await this.waitForGroupInfo();
      this.log('groupCreated:success', this.sanitizeGroupInfo(groupInfo));

      await this.startDiscovery('hostDiscoverable');
      return groupInfo;
    } catch (e) {
      this.log('groupCreated:failure', e);
      this.log('onFailure:createGroup', this.describeFailure(e));
      throw this.toWifiDirectError(e, 'groupCreated', 'Failed to create WiFi Direct group.');
    }
  }

  static async discoverAndConnect(
    payload: WifiP2pQrPayload,
    onSelectPeer?: (peers: WifiP2pDevice[]) => Promise<WifiP2pDevice>,
  ) {
    try {
      // ── Step 1: Guarantee clean state ─────────────────────────────────────
      // 'framework is busy' means a stale group/connection is still active.
      // A stale group makes Phone B appear as a Group Owner, which causes
      // GO-vs-GO negotiation failure when it tries to join Phone A's group.
      // Retry cleanup up to 5 times (5 s total) until the framework accepts it.
      await this.cleanupWithRetry('receiverPre', 5, 1000);

      // Brief settle delay so the Wi-Fi Direct state machine is fully idle
      // before we start discovery. Without this, discoverPeers can still get
      // 'framework is busy' immediately after a successful removeGroup.
      await this.delay(500);

      await this.startDiscovery('receiverDiscover');

      const peer = await this.waitForPeer(payload, onSelectPeer);
      this.log('connect:peerListBeforeConnect', {
        count: this.lastPeerSnapshot.length,
        peers: this.describePeers(this.lastPeerSnapshot),
      });
      this.log('connect:start', {
        deviceAddress: peer.deviceAddress,
        deviceName: peer.deviceName,
        isGroupOwner: peer.isGroupOwner,
        status: peer.status,
      });
      await connect(peer.deviceAddress);
      this.log('connect:success', {
        connectedAddress: peer.deviceAddress,
        deviceName: peer.deviceName,
      });

      const connectionInfo = await this.waitForConnectionInfo();
      this.log('connectionInfoAvailable:connected', connectionInfo);
      return connectionInfo;
    } catch (e) {
      this.log('connect:failure', this.describeFailure(e));
      this.log('onFailure:connect', this.describeFailure(e));
      throw await this.enrichError(
        this.toWifiDirectError(e, 'connect', 'Failed to connect to WiFi Direct host.'),
        payload,
      );
    } finally {
      stopDiscoveringPeers().catch(error => this.log('stopDiscoveringPeers:ignored', error));
    }
  }

  static async cleanup() {
    this.log('cleanup:start');
    await cancelConnect().catch(error => this.log('cancelConnect:cleanupIgnored', error));
    await stopDiscoveringPeers().catch(error =>
      this.log('stopDiscoveringPeers:cleanupIgnored', error),
    );
    await removeGroup().catch(error => this.log('removeGroup:cleanupIgnored', error));
    this.log('cleanup:complete');
  }

  static createQrPayload(groupInfo: WifiP2pGroupInfo) {
    // v3 payload: only hostId is used for session identification.
    // MAC address (hostDeviceAddress) is intentionally omitted — Android 10+
    // always returns the privacy placeholder 02:00:00:00:00:00, which is useless
    // for peer matching. Device name is also omitted to avoid encoding
    // "Unknown Device" which cannot be matched against real discovered peers.
    const payload: WifiP2pQrPayload = {
      type: 'ENTE_PHOTO_WIFI_DIRECT',
      version: 3,
      hostId: this.generateUUID(),
      networkName: groupInfo.networkName,
    };

    const encodedPayload = `WIFI_P2P:${JSON.stringify(payload)}`;
    this.log('qrPayload:create', payload);
    return encodedPayload;
  }

  static parseQrPayload(data: string) {
    if (!data.startsWith('WIFI_P2P:')) {
      throw new WifiDirectError('QR code is not an EntePhoto WiFi Direct code.', 'qrParse');
    }

    const rawPayload = data.replace('WIFI_P2P:', '');

    if (rawPayload.startsWith('{')) {
      const payload = JSON.parse(rawPayload) as Partial<WifiP2pQrPayload>;
      if (payload.type !== 'ENTE_PHOTO_WIFI_DIRECT') {
        throw new WifiDirectError('QR code does not contain valid host information.', 'qrParse');
      }

      // v3+: only hostId is required. No name or MAC matching.
      if (payload.version && payload.version >= 3 && payload.hostId) {
        this.log('qrPayload:parseV3', {hostId: payload.hostId, version: payload.version});
        return payload as WifiP2pQrPayload;
      }

      // v2: hostId present — treat the same as v3 for connection purposes.
      // hostDeviceName may be present but will NOT be used for peer matching
      // because Android 10+ may have encoded "Unknown Device".
      if (payload.version === 2 && payload.hostId) {
        this.log('qrPayload:parseV2', {hostId: payload.hostId});
        // Return without hostDeviceName so waitForPeer ignores it
        return {
          type: 'ENTE_PHOTO_WIFI_DIRECT',
          version: 2,
          hostId: payload.hostId,
          networkName: payload.networkName,
        } as WifiP2pQrPayload;
      }

      // v1 legacy: had hostDeviceAddress, attempt MAC match as last resort
      if (payload.version === 1 && payload.hostDeviceAddress) {
        this.log('qrPayload:parseV1', payload);
        return {
          type: 'ENTE_PHOTO_WIFI_DIRECT',
          version: 1,
          hostId: 'legacy-v1',
          hostDeviceAddress: payload.hostDeviceAddress,
          networkName: payload.networkName,
        } as WifiP2pQrPayload;
      }

      throw new WifiDirectError('Unsupported QR code version or missing fields.', 'qrParse');
    }

    // Legacy plain-text MAC address format
    const legacyPayload: WifiP2pQrPayload = {
      type: 'ENTE_PHOTO_WIFI_DIRECT',
      version: 1,
      hostId: 'legacy-v0',
      hostDeviceAddress: rawPayload,
    };
    this.log('qrPayload:parseLegacy', legacyPayload);
    return legacyPayload;
  }

  static getReadableError(error: unknown) {
    if (error instanceof WifiDirectError) {
      return `${error.message} (${error.phase})`;
    }

    if (typeof error === 'object' && error && 'message' in error) {
      return String(error.message);
    }

    return 'Unknown WiFi Direct error.';
  }

  static getDebugLog() {
    return WifiDirectDebugLog.text();
  }

  static clearDebugLog() {
    WifiDirectDebugLog.clear();
  }

  private static async startDiscovery(phase: string) {
    try {
      this.log('discoverPeers:start', phase);
      const status = await startDiscoveringPeers();
      this.log('discoverPeers:success', {phase, status});
    } catch (error) {
      this.log('discoverPeers:failure', {phase, error});
      this.log('onFailure:discoverPeers', {
        phase,
        failure: this.describeFailure(error),
      });
      throw this.toWifiDirectError(error, 'discoverPeers', 'Failed to start WiFi Direct peer discovery.');
    }
  }

  private static async waitForGroupInfo(): Promise<WifiP2pGroupInfo> {
    const timeoutMs = 10000;
    const intervalMs = 500;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const groupInfo = await getGroupInfo().catch(error => {
        this.log('groupInfo:pollFailure', error);
        this.log('onFailure:requestGroupInfo', this.describeFailure(error));
        return null;
      });
      if (groupInfo?.owner?.deviceAddress) {
        this.log('onGroupInfoAvailable', this.sanitizeGroupInfo(groupInfo));
        return groupInfo;
      }
      await this.delay(intervalMs);
    }

    throw new Error('WiFi Direct group was created, but owner info was not available.');
  }

  /**
   * Selects a peer to connect to after discovery.
   *
   * Strategy (Android 10+ compatible — no MAC or device-name matching):
   *   1. Collect all discovered peers for up to 30 s.
   *   2. Filter for Group Owners (isGroupOwner === true), since the host
   *      calls createGroup() before displaying the QR code.
   *   3. If exactly one Group Owner exists → connect immediately.
   *   4. If multiple Group Owners exist → invoke the optional onSelectPeer
   *      callback so the UI can show a selection dialog; fall back to the
   *      first Group Owner if no callback is provided.
   *   5. If no Group Owners are found but at least one peer exists, pick
   *      the first peer and log a warning (graceful fallback).
   *   6. If no peers at all are found within the timeout, throw.
   *
   * The QR payload is used only to identify the session (hostId).
   * It is NEVER used to filter or reject discovered peers.
   */
  private static async waitForPeer(
    payload: WifiP2pQrPayload,
    onSelectPeer?: (peers: WifiP2pDevice[]) => Promise<WifiP2pDevice>,
  ): Promise<WifiP2pDevice> {
    const timeoutMs = 30000;
    const intervalMs = 750;
    const startedAt = Date.now();

    this.log('peerDiscovery:start', {
      hostId: payload.hostId,
      strategy: 'groupOwnerFirst — no MAC/name matching',
    });

    while (Date.now() - startedAt < timeoutMs) {
      const peers = await getAvailablePeers().catch(error => {
        this.log('peersChanged:pollFailure', error);
        this.log('onFailure:requestPeers', this.describeFailure(error));
        return null;
      });

      const devices: WifiP2pDevice[] = peers?.devices ?? [];
      this.lastPeerSnapshot = devices;

      const peerSnapshot = {
        count: devices.length,
        devices: this.describePeers(devices),
      };
      this.log('peersChanged', peerSnapshot);
      this.log('onPeersAvailable', peerSnapshot);

      if (devices.length === 0) {
        // No peers yet — keep polling
        await this.delay(intervalMs);
        continue;
      }

      // Prefer Group Owners because the host always calls createGroup()
      const groupOwners = devices.filter(d => d.isGroupOwner === true);

      this.log('peerDiscovery:candidates', {
        total: devices.length,
        groupOwners: groupOwners.length,
        peers: this.describePeers(devices),
      });

      if (groupOwners.length === 1) {
        // Exactly one Group Owner — connect directly, no ambiguity
        this.log('peerMatch:singleGroupOwner', this.describePeers(groupOwners)[0]);
        return groupOwners[0];
      }

      if (groupOwners.length > 1) {
        // Multiple Group Owners — ask the caller to resolve via UI dialog
        if (onSelectPeer) {
          this.log('peerMatch:multipleGroupOwners:promptUser', {count: groupOwners.length});
          const chosen = await onSelectPeer(groupOwners);
          this.log('peerMatch:userSelected', this.describePeers([chosen])[0]);
          return chosen;
        }
        // No dialog callback — take the first Group Owner and warn
        this.log('peerMatch:multipleGroupOwners:autoFirst', {count: groupOwners.length});
        return groupOwners[0];
      }

      // No Group Owner found yet, but peers exist — keep polling for a bit
      // before falling back, in case the host's group creation is still in
      // progress. Fall back only in the last 5 s of the timeout window.
      const elapsed = Date.now() - startedAt;
      if (elapsed >= timeoutMs - 5000) {
        // Last-resort fallback: pick the first available peer
        this.log('peerMatch:noGroupOwner:fallbackFirst', {
          warning: 'No Group Owner found; using first available peer as fallback',
          peer: this.describePeers([devices[0]])[0],
        });
        return devices[0];
      }

      await this.delay(intervalMs);
    }

    throw new WifiDirectError(
      this.createPeerNotFoundMessage(payload),
      'peerDiscovery',
    );
  }

  private static async waitForConnectionInfo(): Promise<WifiP2pConnectionInfo> {
    const timeoutMs = 45000; // extended: some devices need >30 s for WPS handshake
    const pollIntervalMs = 750;
    const startedAt = Date.now();

    this.log('waitForConnectionInfo:start', {timeoutMs});

    // ── Hybrid: event subscription + polling ──────────────────────────────
    // Subscribe to the CONNECTION_INFO_UPDATED_ACTION broadcast so we react
    // the instant Android confirms group formation, without waiting up to
    // pollIntervalMs between polls.  The subscription resolves the outer
    // promise immediately; the poll loop is a safety net for devices that
    // fire the broadcast before the subscription is registered.
    return new Promise<WifiP2pConnectionInfo>((resolve, reject) => {
      let settled = false;
      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let subscription: {remove: () => void} | null = null;

      const tryResolve = (info: WifiP2pConnectionInfo, source: string) => {
        if (settled) return;
        // groupFormed must be true.  groupOwnerAddress CAN be transiently null
        // on some AOSP builds when the group first forms — accept it and let
        // the caller read the address from getGroupInfo() if needed.
        if (!info.groupFormed) return;
        settled = true;
        if (pollTimer) clearTimeout(pollTimer);
        subscription?.remove();
        this.log(`connectionInfoAvailable:resolved:${source}`, info);
        resolve(info);
      };

      const tryReject = (reason: string) => {
        if (settled) return;
        settled = true;
        if (pollTimer) clearTimeout(pollTimer);
        subscription?.remove();
        reject(new Error(reason));
      };

      // Event-based path
      subscription = subscribeOnEvent(CONNECTION_INFO_UPDATED_ACTION, (info: WifiP2pConnectionInfo) => {
        this.log('connectionInfoAvailable:broadcast', info);
        this.log('onConnectionInfoAvailable:broadcast', info);
        tryResolve(info, 'broadcast');
      });

      // Poll-based path (safety net)
      const poll = async () => {
        if (settled) return;
        if (Date.now() - startedAt >= timeoutMs) {
          tryReject('Android accepted the connect request, but no WiFi Direct group was formed.');
          return;
        }

        const info = await getConnectionInfo().catch(error => {
          this.log('connectionInfoAvailable:pollFailure', error);
          this.log('onFailure:requestConnectionInfo', this.describeFailure(error));
          return null;
        });

        if (info) {
          this.log('connectionInfoAvailable', info);
          this.log('onConnectionInfoAvailable', info);
          tryResolve(info, 'poll');
        }

        if (!settled) {
          pollTimer = setTimeout(poll, pollIntervalMs);
        }
      };

      // Start first poll immediately
      poll();
    });
  }

  /**
   * Retry cancelConnect + removeGroup until the framework accepts both
   * (i.e. neither throws) or until maxAttempts is reached.
   *
   * The 'framework is busy' error (code 2) means a stale P2P group or
   * connection is still being torn down.  Waiting and retrying is the
   * only safe remedy — there is no Android API to force-reset the stack.
   */
  private static async cleanupWithRetry(
    phase: string,
    maxAttempts: number,
    delayBetweenMs: number,
  ) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let cancelOk = false;
      let removeOk = false;

      await cancelConnect()
        .then(() => { cancelOk = true; })
        .catch(err => {
          this.log(`cancelConnect:retry${attempt}`, this.describeFailure(err));
        });

      await removeGroup()
        .then(() => { removeOk = true; })
        .catch(err => {
          this.log(`removeGroup:retry${attempt}`, this.describeFailure(err));
        });

      this.log(`cleanup:attempt${attempt}`, {phase, cancelOk, removeOk});

      if (cancelOk && removeOk) {
        this.log('cleanup:success', {phase, attempts: attempt});
        return;
      }

      if (attempt < maxAttempts) {
        await this.delay(delayBetweenMs);
      }
    }
    // Even if cleanup didn't fully succeed, proceed — the connect attempt
    // below may still work if the stale group is old enough to be ignored.
    this.log('cleanup:exhausted', {phase, maxAttempts});
  }

  private static toWifiDirectError(error: unknown, phase: string, fallbackMessage: string) {
    if (error instanceof WifiDirectError) {
      return error;
    }

    if (typeof error === 'object' && error) {
      const message = 'message' in error ? String(error.message) : fallbackMessage;
      const code = 'code' in error ? ` Android reason code: ${String(error.code)}.` : '';
      return new WifiDirectError(`${message}${code}`, phase, error);
    }

    return new WifiDirectError(fallbackMessage, phase, error);
  }

  private static async enrichError(error: WifiDirectError, payload?: WifiP2pQrPayload) {
    const state = await SystemWifiStateService.getState();
    const diagnostics = {
      phase: error.phase,
      androidVersion: Platform.Version,
      grantedPermissions: this.lastPermissions,
      wifiState: state,
      qrDeviceName: payload?.hostDeviceName,
      qrMacAddress: payload?.hostDeviceAddress,
      peerCount: this.lastPeerSnapshot.length,
      discoveredPeers: this.lastPeerSnapshot.map(peer => ({
        deviceName: peer.deviceName,
        deviceAddress: peer.deviceAddress,
        status: peer.status,
        isGroupOwner: peer.isGroupOwner,
      })),
    };

    this.log('failureDiagnostics', diagnostics);
    return new WifiDirectError(
      `${error.message}\n\n${this.formatDiagnostics(diagnostics)}`,
      error.phase,
      error.cause,
    );
  }

  private static createPeerNotFoundMessage(payload: WifiP2pQrPayload) {
    return [
      'Could not find the scanned WiFi Direct device nearby.',
      `QR device name: ${payload.hostDeviceName ?? 'unknown'}`,
      `QR MAC address: ${payload.hostDeviceAddress || 'unknown'}`,
      `Peers discovered: ${this.lastPeerSnapshot.length}`,
      `Peer names: ${this.lastPeerSnapshot.map(peer => peer.deviceName || 'unnamed').join(', ') || 'none'}`,
    ].join('\n');
  }

  private static formatDiagnostics(diagnostics: Record<string, unknown>) {
    return Object.entries(diagnostics)
      .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
      .join('\n');
  }

  private static formatValue(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private static sanitizeGroupInfo(groupInfo: WifiP2pGroupInfo) {
    return {
      interface: groupInfo.interface,
      networkName: groupInfo.networkName,
      owner: groupInfo.owner,
      hasPassphrase: Boolean(groupInfo.passphrase),
    };
  }

  private static describePeers(devices: WifiP2pDevice[]) {
    return devices.map(device => ({
      deviceAddress: device.deviceAddress,
      deviceName: device.deviceName,
      status: device.status,
      isGroupOwner: device.isGroupOwner,
    }));
  }

  private static describeFailure(error: unknown): Record<string, unknown> {
    if (error instanceof WifiDirectError) {
      return {
        phase: error.phase,
        message: error.message,
        cause: this.describeFailure(error.cause),
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    if (typeof error === 'object' && error) {
      return {
        code: 'code' in error ? error.code : undefined,
        message: 'message' in error ? error.message : undefined,
        raw: error,
      };
    }

    return {message: String(error)};
  }

  private static log(message: string, data?: unknown) {
    WifiDirectDebugLog.add(`${this.logPrefix} ${message}`, data);
    if (data === undefined) {
      console.info(`${this.logPrefix} ${message}`);
      return;
    }

    console.info(`${this.logPrefix} ${message}`, data);
  }

  private static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static subscribeToPeers(callback: (peers: any) => void) {
    return subscribeOnEvent(PEERS_UPDATED_ACTION, callback);
  }

  static subscribeToConnection(callback: (info: any) => void) {
    return subscribeOnEvent(CONNECTION_INFO_UPDATED_ACTION, callback);
  }

  static subscribeToThisDevice(callback: (info: any) => void) {
    return subscribeOnEvent(THIS_DEVICE_CHANGED_ACTION, callback);
  }

  static unsubscribe(subscription: any) {
    if (subscription && typeof subscription.remove === 'function') {
      subscription.remove();
    }
  }

  private static attachDiagnostics() {
    if (this.diagnosticsSubscriptions.length > 0) {
      return;
    }

    this.diagnosticsSubscriptions = [
      this.subscribeToPeers(peers => {
        this.log('peersChanged:broadcast', peers);
        this.log('onPeersAvailable:broadcast', peers);
      }),
      this.subscribeToConnection(info =>
        {
          this.log('connectionInfoAvailable:broadcast', info);
          this.log('onConnectionInfoAvailable:broadcast', info);
        },
      ),
      this.subscribeToThisDevice(info => {
        this.log('thisDeviceChanged:broadcast', info);
        this.log('onGroupInfoAvailable:broadcast', info);
      }),
    ].filter(Boolean);
  }
}
