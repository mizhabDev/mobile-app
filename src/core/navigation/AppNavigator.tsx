import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {CameraModelSelectionScreen} from '@/features/camera-selection/screens/CameraModelSelectionScreen';
import {LiveTransferPlaceholderScreen} from '@/features/camera-selection/screens/LiveTransferPlaceholderScreen';
import {OtherPhoneQRScreen} from '@/features/camera-selection/screens/OtherPhoneQRScreen';
import {SourceSelectionScreen} from '@/features/camera-selection/screens/SourceSelectionScreen';
import {FlashLinkRoleSelectionScreen} from '@/features/flashlink/screens/FlashLinkRoleSelectionScreen';
import {QRScannerScreen} from '@/features/flashlink/screens/QRScannerScreen';

import {RootStackParamList} from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="FlashLinkRoleSelection"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="SourceSelection" component={SourceSelectionScreen} />
        <Stack.Screen
          name="CameraModelSelection"
          component={CameraModelSelectionScreen}
        />
        <Stack.Screen
          name="OtherPhoneQR"
          component={OtherPhoneQRScreen}
        />
        <Stack.Screen
          name="LiveTransferPlaceholder"
          component={LiveTransferPlaceholderScreen}
        />
        <Stack.Screen
          name="FlashLinkRoleSelection"
          component={FlashLinkRoleSelectionScreen}
        />
        <Stack.Screen
          name="QRScanner"
          component={QRScannerScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
