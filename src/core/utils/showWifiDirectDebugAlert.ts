import {Alert} from 'react-native';
import * as Clipboard from 'expo-clipboard';

export function showWifiDirectDebugAlert(
  title: string,
  message: string,
  debugLog: string,
  onDismiss?: () => void,
) {
  const body = debugLog ? `${message}\n\nDebug log:\n${debugLog}` : message;

  Alert.alert(title, body, [
    {
      text: 'Copy Debug',
      onPress: () => {
        Clipboard.setStringAsync(body).finally(onDismiss);
      },
    },
    {
      text: 'OK',
      style: 'cancel',
      onPress: onDismiss,
    },
  ]);
}
