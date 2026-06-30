import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/components/AppText';
import type { GalleryConnectionState } from '../types/gallery.types';

type Props = {
  state: GalleryConnectionState;
  photoCount: number;
};

export function ConnectionStatusBar({ state, photoCount }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'connected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
      return undefined;
    }
  }, [state, pulseAnim]);

  const isReconnecting = state === 'reconnecting' || state === 'connecting';
  const isConnected = state === 'connected';

  const dotColor = isConnected ? '#22C55E' : '#F59E0B';
  const label = isConnected
    ? 'Live'
    : state === 'reconnecting'
    ? 'Reconnecting…'
    : 'Connecting…';

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Animated.View
          style={[styles.dot, { backgroundColor: dotColor, opacity: pulseAnim }]}
        />
        <AppText style={[styles.label, { color: dotColor }]}>{label}</AppText>
      </View>

      {isConnected && (
        <AppText style={styles.count}>
          {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
        </AppText>
      )}

      {isReconnecting && (
        <AppText style={styles.reconnectHint}>Will retry automatically</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 20, 35, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  count: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  reconnectHint: {
    fontSize: 11,
    color: '#F59E0B',
    opacity: 0.8,
  },
});
