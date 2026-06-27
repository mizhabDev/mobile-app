import {
  initialize,
  startDiscoveringPeers,
  stopDiscoveringPeers,
  connect,
  createGroup,
  getAvailablePeers,
  getGroupInfo,
  removeGroup,
  subscribeOnEvent,
  PEERS_UPDATED_ACTION,
  CONNECTION_INFO_UPDATED_ACTION,
  THIS_DEVICE_CHANGED_ACTION,
} from 'react-native-wifi-p2p';
import { PermissionsAndroid, Platform } from 'react-native';

export class WifiDirectService {
  private static isInitialized = false;

  static async requestPermissions() {
    if (Platform.OS !== 'android') return false;
    
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES || 'android.permission.NEARBY_WIFI_DEVICES',
      ]);

      const fineLocationGranted =
        grants['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const coarseLocationGranted =
        grants['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      const nearbyWifiGranted =
        Platform.Version < 33 ||
        grants['android.permission.NEARBY_WIFI_DEVICES'] === PermissionsAndroid.RESULTS.GRANTED;
      
      return (fineLocationGranted || coarseLocationGranted) && nearbyWifiGranted;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  static async init() {
    if (this.isInitialized) return;
    try {
      await initialize();
      this.isInitialized = true;
    } catch (e) {
      console.error('Failed to initialize WiFi Direct', e);
      throw e;
    }
  }

  static async startGroup() {
    try {
      await removeGroup().catch(() => {});
      await createGroup();
      const groupInfo = await this.waitForGroupInfo();
      return groupInfo;
    } catch (e) {
      console.error('Failed to create group', e);
      throw e;
    }
  }

  static async discoverAndConnect(deviceAddress: string) {
    try {
      await startDiscoveringPeers();

      await this.waitForPeer(deviceAddress);
      await connect(deviceAddress);
    } catch (e) {
      console.error('Failed to discover and connect', e);
      throw e;
    } finally {
      stopDiscoveringPeers().catch(() => {});
    }
  }

  private static async waitForGroupInfo() {
    const timeoutMs = 10000;
    const intervalMs = 500;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const groupInfo = await getGroupInfo().catch(() => null);
      if (groupInfo?.owner?.deviceAddress) {
        return groupInfo;
      }
      await this.delay(intervalMs);
    }

    throw new Error('WiFi Direct group was created, but owner info was not available.');
  }

  private static async waitForPeer(deviceAddress: string) {
    const timeoutMs = 15000;
    const intervalMs = 750;
    const normalizedAddress = deviceAddress.toLowerCase();
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const peers = await getAvailablePeers().catch(() => null);
      const devices = peers?.devices ?? [];
      const peer = devices.find(
        device => device.deviceAddress.toLowerCase() === normalizedAddress,
      );

      if (peer) {
        return peer;
      }

      await this.delay(intervalMs);
    }

    throw new Error('Could not find the scanned WiFi Direct device nearby.');
  }

  private static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
}
