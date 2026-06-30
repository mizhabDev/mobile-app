import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { RootStackParamList } from '@/core/navigation/navigationTypes';
import { AppText } from '@/shared/components/AppText';
import { GallerySocketServer } from '../services/GallerySocketServer';
import * as MediaLibrary from 'expo-media-library/legacy';

type GalleryHostScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'GalleryHost'
>;

type HostConnectionState = 'waiting' | 'connected' | 'disconnected';

export function GalleryHostScreen({ navigation }: GalleryHostScreenProps) {
  const [viewerCount, setViewerCount] = useState(0);
  const [hostState, setHostState] = useState<HostConnectionState>('waiting');
  const [photoCount, setPhotoCount] = useState(0);
  const [mediaPermission, setMediaPermission] = useState<boolean | null>(null);

  // Animated values for the connection-lost banner
  const bannerAnim = useRef(new Animated.Value(-80)).current;
  const bannerVisible = useRef(false);

  // Pulse for the live indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Request media library permission
    MediaLibrary.requestPermissionsAsync().then(result => {
      setMediaPermission(result.granted);
    });

    // Load photo count using classic getAssetsAsync API
    MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: 1,
    })
      .then(result => setPhotoCount(result.totalCount))
      .catch(() => {});

    // Start the gallery server
    GallerySocketServer.start({
      onViewerConnected: (count) => {
        setViewerCount(count);
        setHostState('connected');
        hideBanner();
      },
      onViewerDisconnected: (count) => {
        setViewerCount(count);
        if (count === 0) {
          setHostState('disconnected');
          showBanner();
        }
      },
    });

    return () => {
      GallerySocketServer.stop();
    };
  }, []);

  // Pulse animation while connected
  useEffect(() => {
    if (hostState === 'connected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [hostState, pulseAnim]);

  const showBanner = useCallback(() => {
    if (bannerVisible.current) return;
    bannerVisible.current = true;
    Animated.spring(bannerAnim, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
    // Auto-hide after 6 s
    setTimeout(hideBanner, 6000);
  }, [bannerAnim]);

  const hideBanner = useCallback(() => {
    bannerVisible.current = false;
    Animated.timing(bannerAnim, {
      toValue: -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [bannerAnim]);

  const stateLabel =
    hostState === 'connected'
      ? `${viewerCount} viewer${viewerCount !== 1 ? 's' : ''} connected`
      : hostState === 'disconnected'
      ? 'Viewer disconnected'
      : 'Waiting for viewer…';

  const dotColor =
    hostState === 'connected'
      ? '#22C55E'
      : hostState === 'disconnected'
      ? '#EF4444'
      : '#F59E0B';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Viewer-disconnected banner */}
      <Animated.View
        style={[styles.disconnectBanner, { transform: [{ translateY: bannerAnim }] }]}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerInner}>
            <Feather name="wifi-off" size={16} color="#FFFFFF" />
            <AppText style={styles.bannerText}>
              Viewer disconnected — gallery is still ready
            </AppText>
            <TouchableOpacity onPress={hideBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Safe area header */}
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle} weight="bold">
            Hosting Gallery
          </AppText>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {/* Content */}
      <View style={styles.content}>
        {/* Animated status circle */}
        <View style={styles.statusSection}>
          <View style={styles.outerRing}>
            <Animated.View style={[styles.outerRingGlow, { opacity: pulseAnim }]} />
            <View style={styles.innerCircle}>
              <MaterialCommunityIcons name="access-point" size={36} color="#8B5CF6" />
            </View>
          </View>

          {/* Status dot + label */}
          <View style={styles.statusRow}>
            <Animated.View
              style={[styles.statusDot, { backgroundColor: dotColor, opacity: pulseAnim }]}
            />
            <AppText style={[styles.stateLabel, { color: dotColor }]}>
              {stateLabel}
            </AppText>
          </View>

          <AppText style={styles.subtitle}>
            {hostState === 'connected'
              ? 'The viewer is browsing your photos remotely. You can continue using your phone normally.'
              : 'Your gallery is being served over Wi-Fi Direct. Waiting for someone to scan and connect.'}
          </AppText>
        </View>

        {/* Stats cards */}
        <View style={styles.cards}>
          <View style={styles.statCard}>
            <Feather name="image" size={20} color="#8B5CF6" />
            <AppText style={styles.statValue} weight="bold">
              {photoCount.toLocaleString()}
            </AppText>
            <AppText style={styles.statLabel}>Photos available</AppText>
          </View>

          <View style={styles.statCard}>
            <Feather name="users" size={20} color="#22C55E" />
            <AppText style={styles.statValue} weight="bold">
              {viewerCount}
            </AppText>
            <AppText style={styles.statLabel}>
              {viewerCount === 1 ? 'Viewer' : 'Viewers'}
            </AppText>
          </View>
        </View>

        {/* Instruction */}
        {mediaPermission === false && (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={16} color="#F59E0B" />
            <AppText style={styles.warningText}>
              Media Library permission denied. Phone B will receive an empty gallery. Please grant permission in Settings.
            </AppText>
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="info" size={14} color="rgba(139,92,246,0.7)" />
          <AppText style={styles.infoText}>
            You can continue shooting photos. They will automatically appear on the connected viewer's screen within a few seconds.
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  disconnectBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#EF4444',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  headerArea: {
    backgroundColor: '#0B1120',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 24,
  },
  statusSection: {
    alignItems: 'center',
    gap: 16,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRingGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  stateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
  },
  cards: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 16,
    padding: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#F59E0B',
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(139,92,246,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
});
