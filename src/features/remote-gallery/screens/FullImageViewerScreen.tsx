import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { RootStackParamList } from '@/core/navigation/navigationTypes';
import { AppText } from '@/shared/components/AppText';

type FullImageViewerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FullImageViewer'
>;

export function FullImageViewerScreen({ route, navigation }: FullImageViewerScreenProps) {
  const { photoId, thumbBase64, fullBase64: initialFull } = route.params;

  const [fullBase64, setFullBase64] = useState<string | null>(initialFull ?? null);
  const [isLoading, setIsLoading] = useState(!initialFull);
  const [loadError, setLoadError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Fade in full image when it arrives
  const fullFadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (fullBase64) {
      Animated.timing(fullFadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [fullBase64, fullFadeAnim]);

  // Dismiss handler
  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
    ]).start(() => navigation.goBack());
  }, [fadeAnim, scaleAnim, navigation]);

  // Swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy * 0.4);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          dismiss();
        } else {
          Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const displaySource = fullBase64
    ? { uri: `data:image/jpeg;base64,${fullBase64}` }
    : thumbBase64
    ? { uri: `data:image/jpeg;base64,${thumbBase64}` }
    : null;

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      {...panResponder.panHandlers}
    >
      <StatusBar hidden />

      {/* Background blur layer (thumb while loading full) */}
      {thumbBase64 && !fullBase64 && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${thumbBase64}` }}
          style={[StyleSheet.absoluteFill, styles.blurBackground]}
          blurRadius={18}
        />
      )}

      {/* Main image */}
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {displaySource ? (
          <>
            {/* Thumb shown immediately */}
            {thumbBase64 && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${thumbBase64}` }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
            {/* Full image fades in on top when ready */}
            {fullBase64 && (
              <Animated.Image
                source={{ uri: `data:image/jpeg;base64,${fullBase64}` }}
                style={[StyleSheet.absoluteFill, styles.image, { opacity: fullFadeAnim }]}
                resizeMode="contain"
              />
            )}
          </>
        ) : (
          <View style={styles.noImage}>
            <Feather name="image" size={48} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {/* Loading spinner while full-res is incoming */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
            <AppText style={styles.loadingText}>Loading full resolution…</AppText>
          </View>
        )}

        {loadError && (
          <View style={styles.loadingOverlay}>
            <Feather name="alert-circle" size={24} color="rgba(255,100,100,0.8)" />
            <AppText style={styles.loadingText}>Failed to load</AppText>
          </View>
        )}
      </Animated.View>

      {/* Close button */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Swipe hint */}
      <View style={styles.swipeHint}>
        <View style={styles.swipeBar} />
        <AppText style={styles.swipeLabel}>Swipe down to close</AppText>
      </View>
    </Animated.View>
  );
}

const { width: W, height: H } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  blurBackground: {
    opacity: 0.5,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: W,
    height: H,
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: W,
    height: H * 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  closeButton: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  swipeBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  swipeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
});
