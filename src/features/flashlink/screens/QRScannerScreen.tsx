import React, {useState, useEffect, useRef} from 'react';
import {StyleSheet, View, TouchableOpacity, Dimensions, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Feather} from '@expo/vector-icons';
import {WifiDirectService} from '@/core/services/WifiDirectService';
import {SystemWifiStateService} from '@/core/services/SystemWifiStateService';
import {showWifiDirectReadinessAlert} from '@/core/utils/showWifiDirectReadinessAlert';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {PrimaryButton} from '@/shared/components/PrimaryButton';

type QRScannerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'QRScanner'
>;

export function QRScannerScreen({navigation}: QRScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const requestedCameraPermission = useRef(false);

  useEffect(() => {
    if (!requestedCameraPermission.current && !permission?.granted) {
      requestedCameraPermission.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = async ({type, data}: {type: string; data: string}) => {
    if (scanned) return;
    setScanned(true);
    
    if (data.startsWith('WIFI_P2P:')) {
      const macAddress = data.replace('WIFI_P2P:', '');
      setIsConnecting(true);

      const readiness = await SystemWifiStateService.getWifiDirectReadiness();
      if (!readiness.ready) {
        showWifiDirectReadinessAlert(readiness, () => {
          setIsConnecting(false);
          setScanned(false);
        });
        return;
      }
      
      const hasPerms = await WifiDirectService.requestPermissions();
      if (!hasPerms) {
        Alert.alert(
          'Connection Failed',
          'We need Location and Nearby Devices permissions to securely connect to the other device.',
        );
        setIsConnecting(false);
        setScanned(false);
        return;
      }

      try {
        await WifiDirectService.init();
        await WifiDirectService.discoverAndConnect(macAddress);
        
        // Once connected, navigate to a placeholder screen
        navigation.navigate('LiveTransferPlaceholder', {
          source: 'otherPhone',
        });
      } catch (e) {
        Alert.alert(
          'Connection Error',
          'Could not connect to the host device. Keep both phones close together with Wi-Fi enabled, then scan again.',
        );
        setScanned(false);
      } finally {
        setIsConnecting(false);
      }
    } else {
      Alert.alert(
        'Invalid QR Code',
        'Please scan a valid EntePhoto connection code.',
        [{text: 'OK', onPress: () => setScanned(false)}],
      );
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <AppText style={styles.permissionText}>Preparing camera...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <AppText style={styles.permissionText}>
            We need your permission to show the camera to scan the QR code.
          </AppText>
          <PrimaryButton title="Grant Permission" onPress={requestPermission} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: spacing.md}}>
             <AppText style={{color: colors.primary}}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        onMountError={() =>
          setCameraError('Could not open the camera. Close any app using it and try again.')
        }
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      <SafeAreaView style={[styles.overlay, StyleSheet.absoluteFill]} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <Feather name="x" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle} weight="bold">Scan QR Code</AppText>
          <View style={{width: 40}} />
        </View>

        {/* Scanner Overlay Frame */}
        <View style={styles.scannerFrameContainer}>
          <View style={styles.scannerFrame} />
          <AppText style={styles.instructions}>
            {cameraError ?? (isConnecting ? 'Connecting with WiFi Direct...' : 'Align the QR code within the frame to connect.')}
          </AppText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const {width} = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: '#FFF',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  scannerFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: frameSize,
    height: frameSize,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginBottom: spacing.xl,
  },
  instructions: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
