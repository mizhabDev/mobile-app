import React from 'react';
import {StyleSheet, View, TouchableOpacity, Dimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Feather, MaterialCommunityIcons} from '@expo/vector-icons';

import {RootStackParamList} from '@/core/navigation/navigationTypes';
import {colors} from '@/core/theme/colors';
import {spacing} from '@/core/theme/spacing';
import {AppText} from '@/shared/components/AppText';
import {radius} from '@/core/theme/radius';

type FlashLinkRoleSelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FlashLinkRoleSelection'
>;

export function FlashLinkRoleSelectionScreen({
  navigation,
}: FlashLinkRoleSelectionScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconContainer}>
             <MaterialCommunityIcons name="access-point" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle} weight="bold">FlashLink</AppText>
          <View style={styles.headerIconContainer}>
             <MaterialCommunityIcons name="radar" size={24} color="#FFFFFF" />
          </View>
        </View>

        {/* Title and Subtitle */}
        <View style={styles.titleContainer}>
          <AppText style={styles.title} weight="bold">Ready to Transfer?</AppText>
          <AppText style={styles.subtitle}>
            Select your role to establish a secure connection.
          </AppText>
        </View>

        {/* Cards */}
        <View style={styles.cardsContainer}>
          {/* Send Photos Card */}
          <TouchableOpacity 
            style={[styles.card, styles.sendCard]} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <View style={styles.cardIconWrapper}>
              <View style={[styles.cardIconBase, styles.cardIconSend]}>
                <Feather name="upload" size={32} color="#FFFFFF" />
              </View>
            </View>
            <AppText style={styles.cardTitle} weight="bold">Send Photos</AppText>
            <AppText style={styles.cardSubtitle}>Share your library securely</AppText>
          </TouchableOpacity>

          {/* Receive Photos Card */}
          <TouchableOpacity 
            style={[styles.card, styles.receiveCard]} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('CameraDetection')}
          >
            <View style={styles.cardIconWrapper}>
              <View style={[styles.cardIconBase, styles.cardIconReceive]}>
                <Feather name="download" size={32} color="#94A3B8" />
              </View>
            </View>
            <AppText style={styles.cardTitle} weight="bold">Receive Photos</AppText>
            <AppText style={styles.cardSubtitleReceive}>Wait for a sender connection</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.flashLinkBackground,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  titleContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  cardsContainer: {
    gap: spacing.lg,
  },
  card: {
    borderRadius: 32,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
  },
  sendCard: {
    backgroundColor: colors.flashLinkPrimary,
    shadowColor: colors.flashLinkPrimary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  receiveCard: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardIconWrapper: {
    marginBottom: spacing.lg,
  },
  cardIconBase: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconSend: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardIconReceive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  cardSubtitleReceive: {
    fontSize: 14,
    color: '#94A3B8',
  },
});
