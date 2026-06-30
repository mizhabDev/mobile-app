import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { RootStackParamList } from '@/core/navigation/navigationTypes';
import { AppText } from '@/shared/components/AppText';
import { GallerySocketClient, ClientCallbacks } from '../services/GallerySocketClient';
import { ThumbnailCell, CELL_SIZE, COLUMNS, GAP } from '../components/ThumbnailCell';
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import type {
  GalleryPhoto,
  GalleryConnectionState,
  ThumbnailMap,
  ListResMessage,
} from '../types/gallery.types';

type RemoteGalleryScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'RemoteGallery'
>;

const PAGE_SIZE = 30;

export function RemoteGalleryScreen({ navigation }: RemoteGalleryScreenProps) {
  const [connectionState, setConnectionState] =
    useState<GalleryConnectionState>('connecting');
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [thumbnails, setThumbnails] = useState<ThumbnailMap>({});
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clientRef = useRef<GallerySocketClient | null>(null);
  const hasMoreRef = useRef(true);
  const loadedPagesRef = useRef<Set<number>>(new Set());

  // ── Build thumb request queue ──────────────────────────────────────────────
  const pendingThumbsRef = useRef<string[]>([]);
  const requestingThumbRef = useRef(false);

  const flushThumbQueue = useCallback(() => {
    if (requestingThumbRef.current) return;
    const id = pendingThumbsRef.current.shift();
    if (!id) return;
    requestingThumbRef.current = true;
    clientRef.current?.requestThumbnail(id);
  }, []);

  const enqueueThumb = useCallback(
    (id: string) => {
      if (!pendingThumbsRef.current.includes(id)) {
        pendingThumbsRef.current.push(id);
        flushThumbQueue();
      }
    },
    [flushThumbQueue],
  );

  // ── Client callbacks ───────────────────────────────────────────────────────

  const callbacks = useMemo<ClientCallbacks>(
    () => ({
      onConnectionStateChange(state) {
        setConnectionState(state);
        // When reconnected after drop, re-request first page
        if (state === 'connected') {
          setIsRefreshing(false);
        }
      },

      onPhotoList(msg: ListResMessage) {
        setIsLoadingPage(false);
        setIsRefreshing(false);
        setTotalPhotos(msg.total);
        hasMoreRef.current = (msg.page + 1) * PAGE_SIZE < msg.total;

        setPhotos(prev => {
          // Merge without duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = msg.photos.filter(p => !existingIds.has(p.id));
          return msg.page === 0 ? msg.photos : [...prev, ...newOnes];
        });

        // Queue thumbnail requests for new photos
        msg.photos.forEach(p => enqueueThumb(p.id));
      },

      onThumbnail(id, base64) {
        setThumbnails(prev => ({ ...prev, [id]: base64 }));
        requestingThumbRef.current = false;
        flushThumbQueue();
      },

      onFullImage(id, base64) {
        // Navigate to viewer — pass full image
        navigation.navigate('FullImageViewer', {
          photoId: id,
          thumbBase64: thumbnails[id] ?? null,
          fullBase64: base64,
        });
      },

      onNewPhoto(photo) {
        setPhotos(prev => {
          if (prev.find(p => p.id === photo.id)) return prev;
          return [photo, ...prev];
        });
        setTotalPhotos(prev => prev + 1);
        setNewPhotoIds(prev => new Set([...prev, photo.id]));
        enqueueThumb(photo.id);
        // Clear "new" badge after 5 s
        setTimeout(() => {
          setNewPhotoIds(prev => {
            const next = new Set(prev);
            next.delete(photo.id);
            return next;
          });
        }, 5000);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueueThumb, flushThumbQueue, navigation, thumbnails],
  );

  // ── Connect on mount, cleanup on unmount ──────────────────────────────────

  useEffect(() => {
    const client = new GallerySocketClient(callbacks);
    clientRef.current = client;
    client.connect();

    return () => {
      client.destroy();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load next page ─────────────────────────────────────────────────────────

  const loadNextPage = useCallback(() => {
    if (isLoadingPage || !hasMoreRef.current) return;
    const nextPage = currentPage + 1;
    if (loadedPagesRef.current.has(nextPage)) return;
    loadedPagesRef.current.add(nextPage);
    setCurrentPage(nextPage);
    setIsLoadingPage(true);
    clientRef.current?.requestPage(nextPage);
  }, [isLoadingPage, currentPage]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPhotos([]);
    setThumbnails({});
    setCurrentPage(0);
    loadedPagesRef.current.clear();
    hasMoreRef.current = true;
    clientRef.current?.requestPage(0);
  }, []);

  // ── Tap thumbnail → request full image ────────────────────────────────────

  const onThumbnailPress = useCallback(
    (photo: GalleryPhoto) => {
      navigation.navigate('FullImageViewer', {
        photoId: photo.id,
        thumbBase64: thumbnails[photo.id] ?? null,
        fullBase64: null,
      });
      clientRef.current?.requestFullImage(photo.id);
    },
    [navigation, thumbnails],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: GalleryPhoto }) => (
      <ThumbnailCell
        key={item.id}
        id={item.id}
        thumbBase64={thumbnails[item.id] ?? null}
        isNew={newPhotoIds.has(item.id)}
        onPress={() => onThumbnailPress(item)}
      />
    ),
    [thumbnails, newPhotoIds, onThumbnailPress],
  );

  const keyExtractor = useCallback((item: GalleryPhoto) => item.id, []);

  const ListEmptyComponent = useMemo(
    () =>
      connectionState === 'connected' ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="image" size={40} color="rgba(139,92,246,0.5)" />
          </View>
          <AppText style={styles.emptyTitle} weight="bold">
            No photos yet
          </AppText>
          <AppText style={styles.emptySubtitle}>
            Photos captured on the host device will appear here automatically.
          </AppText>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="wifi" size={36} color="rgba(255,255,255,0.15)" />
          <AppText style={[styles.emptySubtitle, { marginTop: 12 }]}>
            Waiting for connection…
          </AppText>
        </View>
      ),
    [connectionState],
  );

  const ListFooterComponent = useMemo(
    () =>
      isLoadingPage ? (
        <View style={styles.footerLoader}>
          <Feather name="loader" size={18} color="rgba(139,92,246,0.7)" />
          <AppText style={styles.footerText}>Loading more…</AppText>
        </View>
      ) : null,
    [isLoadingPage],
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoMark}>
              <Feather name="camera" size={14} color="#8B5CF6" />
            </View>
            <AppText style={styles.headerTitle} weight="bold">
              Remote Gallery
            </AppText>
          </View>
          <View style={styles.headerRight}>
            {totalPhotos > 0 && (
              <View style={styles.countPill}>
                <AppText style={styles.countText}>{totalPhotos}</AppText>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Live Status Bar */}
      <ConnectionStatusBar state={connectionState} photoCount={totalPhotos} />

      {/* Photo Grid */}
      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={COLUMNS}
        contentContainerStyle={photos.length === 0 ? styles.emptyContainer : styles.grid}
        showsVerticalScrollIndicator={false}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        getItemLayout={(_, index) => ({
          length: CELL_SIZE + GAP,
          offset: (CELL_SIZE + GAP) * Math.floor(index / COLUMNS),
          index,
        })}
        removeClippedSubviews
        windowSize={10}
        maxToRenderPerBatch={12}
        initialNumToRender={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1120',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countPill: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
  },
  countText: {
    fontSize: 12,
    color: '#C4B5FD',
    fontWeight: '600',
  },
  grid: {
    paddingTop: GAP,
    paddingHorizontal: GAP / 2,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(139,92,246,0.7)',
  },
});
