import {NativeModules, Platform} from 'react-native';

type SystemWifiState = {
  wifiEnabled: boolean;
  hotspotEnabled: boolean;
  locationServicesEnabled: boolean;
};

type SystemWifiStateModule = {
  getState: () => Promise<SystemWifiState>;
  openWifiSettings: () => Promise<boolean>;
  openWirelessSettings: () => Promise<boolean>;
  openLocationSettings: () => Promise<boolean>;
};

const nativeModule = NativeModules.SystemWifiState as
  | SystemWifiStateModule
  | undefined;

export type WifiDirectReadiness =
  | {ready: true}
  | {
      ready: false;
      reason:
        | 'unsupported'
        | 'wifiOff'
        | 'hotspotOn'
        | 'locationOff'
        | 'unknown';
      title: string;
      message: string;
      settingsAction?: 'wifi' | 'wireless' | 'location';
    };

export class SystemWifiStateService {
  static async getWifiDirectReadiness(): Promise<WifiDirectReadiness> {
    if (Platform.OS !== 'android') {
      return {
        ready: false,
        reason: 'unsupported',
        title: 'Android Required',
        message: 'WiFi Direct is only available on Android devices.',
      };
    }

    if (!nativeModule) {
      return {
        ready: false,
        reason: 'unknown',
        title: 'WiFi Check Unavailable',
        message: 'Could not check Wi-Fi status. Please make sure Wi-Fi is enabled and hotspot is off.',
        settingsAction: 'wireless',
      };
    }

    try {
      const state = await nativeModule.getState();

      if (state.hotspotEnabled) {
        return {
          ready: false,
          reason: 'hotspotOn',
          title: 'Turn Off Hotspot',
          message: 'WiFi Direct cannot start while your phone hotspot is on. Turn off hotspot, then try again.',
          settingsAction: 'wireless',
        };
      }

      if (!state.wifiEnabled) {
        return {
          ready: false,
          reason: 'wifiOff',
          title: 'Turn On Wi-Fi',
          message: 'WiFi Direct needs Wi-Fi enabled. Turn on Wi-Fi, then try again.',
          settingsAction: 'wifi',
        };
      }

      if (!state.locationServicesEnabled) {
        return {
          ready: false,
          reason: 'locationOff',
          title: 'Turn On Location',
          message: 'Android requires Location Services for WiFi Direct peer discovery. Turn on Location, then try again.',
          settingsAction: 'location',
        };
      }

      return {ready: true};
    } catch (error) {
      console.warn('Could not check Wi-Fi Direct readiness', error);
      return {
        ready: false,
        reason: 'unknown',
        title: 'Check Wi-Fi Settings',
        message: 'Could not check Wi-Fi status. Please make sure Wi-Fi is enabled and hotspot is off.',
        settingsAction: 'wireless',
      };
    }
  }

  static openSettings(action?: 'wifi' | 'wireless' | 'location') {
    if (!nativeModule) {
      return Promise.resolve(false);
    }

    if (action === 'wifi') {
      return nativeModule.openWifiSettings();
    }

    if (action === 'location') {
      return nativeModule.openLocationSettings();
    }

    return nativeModule.openWirelessSettings();
  }
}
