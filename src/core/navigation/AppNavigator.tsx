import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {CameraModelSelectionScreen} from '@/features/camera-selection/screens/CameraModelSelectionScreen';
import {LiveTransferPlaceholderScreen} from '@/features/camera-selection/screens/LiveTransferPlaceholderScreen';
import {PhoneModelSelectionScreen} from '@/features/camera-selection/screens/PhoneModelSelectionScreen';
import {SourceSelectionScreen} from '@/features/camera-selection/screens/SourceSelectionScreen';

import {RootStackParamList} from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="SourceSelection"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="SourceSelection" component={SourceSelectionScreen} />
        <Stack.Screen
          name="CameraModelSelection"
          component={CameraModelSelectionScreen}
        />
        <Stack.Screen
          name="PhoneModelSelection"
          component={PhoneModelSelectionScreen}
        />
        <Stack.Screen
          name="LiveTransferPlaceholder"
          component={LiveTransferPlaceholderScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
