import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ReceiveScreen} from '@/features/receive/screens/ReceiveScreen';
import {CameraGalleryScreen} from '@/features/receive/screens/CameraGalleryScreen';
import {FlashLinkRoleSelectionScreen} from '@/features/flashlink/screens/FlashLinkRoleSelectionScreen';
import {QRScannerScreen} from '@/features/flashlink/screens/QRScannerScreen';
import {RemoteGalleryScreen} from '@/features/remote-gallery/screens/RemoteGalleryScreen';
import {FullImageViewerScreen} from '@/features/remote-gallery/screens/FullImageViewerScreen';
import {GalleryHostScreen} from '@/features/remote-gallery/screens/GalleryHostScreen';

import {RootStackParamList} from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="FlashLinkRoleSelection"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="CameraDetection" component={ReceiveScreen} />
        <Stack.Screen name="CameraGallery" component={CameraGalleryScreen} />
        <Stack.Screen
          name="FlashLinkRoleSelection"
          component={FlashLinkRoleSelectionScreen}
        />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        {/* ── Remote Gallery ──────────────────────────────────── */}
        <Stack.Screen
          name="RemoteGallery"
          component={RemoteGalleryScreen}
          options={{animation: 'fade'}}
        />
        <Stack.Screen
          name="FullImageViewer"
          component={FullImageViewerScreen}
          options={{animation: 'fade', presentation: 'transparentModal'}}
        />
        <Stack.Screen
          name="GalleryHost"
          component={GalleryHostScreen}
          options={{animation: 'slide_from_bottom'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
