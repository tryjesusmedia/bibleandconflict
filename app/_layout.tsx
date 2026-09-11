import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConflictJourneyProvider } from '@/contexts/ConflictJourneyContext';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConflictJourneyProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.navy } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="reading" />
            <Stack.Screen name="bible-reader" />
          </Stack>
        </ConflictJourneyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
