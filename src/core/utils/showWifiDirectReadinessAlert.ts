import {Alert} from 'react-native';

import {
  SystemWifiStateService,
  WifiDirectReadiness,
} from '@/core/services/SystemWifiStateService';

export function showWifiDirectReadinessAlert(
  readiness: Exclude<WifiDirectReadiness, {ready: true}>,
  onDismiss?: () => void,
) {
  const buttons = readiness.settingsAction
    ? [
        {
          text: 'Not Now',
          style: 'cancel' as const,
          onPress: onDismiss,
        },
        {
          text: 'Open Settings',
          onPress: () => {
            SystemWifiStateService.openSettings(readiness.settingsAction).finally(
              onDismiss,
            );
          },
        },
      ]
    : [{text: 'OK', onPress: onDismiss}];

  Alert.alert(readiness.title, readiness.message, buttons);
}
