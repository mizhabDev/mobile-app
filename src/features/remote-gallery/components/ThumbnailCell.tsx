import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 3;
const GAP = 2;
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS;

type Props = {
  id: string;
  thumbBase64: string | null;
  isNew?: boolean;
  onPress: () => void;
};

export function ThumbnailCell({ id, thumbBase64, isNew = false, onPress }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? -20 : 0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [hasLoaded, setHasLoaded] = useState(false);

  // Shimmer loop while loading
  useEffect(() => {
    if (thumbBase64) return;
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [thumbBase64, shimmerAnim]);

  // Fade in when thumbnail arrives
  useEffect(() => {
    if (!thumbBase64) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [thumbBase64, fadeAnim, slideAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.cell}
    >
      {/* Skeleton placeholder */}
      {!thumbBase64 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.skeleton, { opacity: shimmerOpacity }]}
        />
      )}

      {/* Thumbnail image */}
      {thumbBase64 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${thumbBase64}` }}
            style={styles.image}
            onLoad={() => setHasLoaded(true)}
          />
        </Animated.View>
      )}

      {/* "New" badge */}
      {isNew && (
        <View style={styles.newBadge}>
          <Animated.View style={[styles.newDot]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: GAP / 2,
    backgroundColor: '#1A2035',
    overflow: 'hidden',
  },
  skeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export { CELL_SIZE, COLUMNS, GAP };
