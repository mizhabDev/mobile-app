import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View, Alert} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {ScreenContainer} from '@/shared/components/ScreenContainer';
import {SelectionHeader} from '../components/SelectionHeader';
import {PrimaryButton} from '@/shared/components/PrimaryButton';
import {WifiDirectService} from '@/core/services/WifiDirectService';
import {SystemWifiStateService} from '@/core/services/SystemWifiStateService';
import {showWifiDirectReadinessAlert} from '@/core/utils/showWifiDirectReadinessAlert';

type OtherPhoneQRScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OtherPhoneQR'
>;

export function OtherPhoneQRScreen({
  navigation,
  route,
}: OtherPhoneQRScreenProps) {
  const {source} = route.params;
  const [deviceAddress, setDeviceAddress] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  const setupP2P = useCallback(async () => {
    setIsSettingUp(true);
    setSetupError(null);
    setDeviceAddress(null);

    try {
      const readiness = await SystemWifiStateService.getWifiDirectReadiness();
      if (!readiness.ready) {
        setSetupError(readiness.message);
        showWifiDirectReadinessAlert(readiness);
        return;
      }

      const hasPerms = await WifiDirectService.requestPermissions();
      if (!hasPerms) {
        setSetupError('Location and Nearby Devices permissions are required.');
        Alert.alert(
          'Permissions Required',
          'We need Location and Nearby Devices permissions to create a secure WiFi Direct connection.',
        );
        return;
      }

      await WifiDirectService.init();

      const groupInfo = await WifiDirectService.startGroup();
      setDeviceAddress(groupInfo.owner.deviceAddress);
    } catch (error) {
      console.error('WiFi Direct setup failed', error);
      setSetupError('Could not start WiFi Direct. Make sure Wi-Fi is enabled and try again.');
      Alert.alert(
        'Connection Setup Failed',
        'Could not start WiFi Direct. Make sure Wi-Fi is enabled and try again.',
      );
    } finally {
      setIsSettingUp(false);
    }
  }, []);

  useEffect(() => {
    setupP2P();
  }, [setupP2P]);

  const qrData = deviceAddress ? `WIFI_P2P:${deviceAddress}` : 'WAITING_FOR_ADDRESS';

  return (
    <ScreenContainer>
      <SelectionHeader
        showBack
        onBackPress={() => navigation.goBack()}
        title="Connect wirelessly"
        subtitle="Scan this QR code with the other phone to establish a connection"
      />

      <View style={styles.content}>
        <View style={styles.qrContainer}>
          {deviceAddress ? (
            <QRCode
              value={qrData}
              size={200}
              color={colors.textTitle}
              backgroundColor={colors.card}
            />
          ) : setupError ? (
            <AppText style={styles.statusText}>{setupError}</AppText>
          ) : (
            <AppText style={styles.statusText}>Setting up WiFi Direct...</AppText>
          )}
        </View>
        <AppText style={styles.instructions}>
          Open FlashLink on the other device, choose Send Photos, and scan this QR code.
        </AppText>
      </View>

      <View style={styles.footer}>
        {setupError ? (
          <PrimaryButton title="Try Again" onPress={setupP2P} />
        ) : (
          <PrimaryButton
            title={isSettingUp ? 'Preparing Connection...' : 'Done Scanning'}
            disabled={isSettingUp || !deviceAddress}
            onPress={() => {
              navigation.navigate('LiveTransferPlaceholder', {
                source,
              });
            }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  qrContainer: {
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  instructions: {
    textAlign: 'center',
    color: colors.textBody,
    paddingHorizontal: spacing.lg,
  },
  statusText: {
    maxWidth: 220,
    textAlign: 'center',
    color: colors.textBody,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
