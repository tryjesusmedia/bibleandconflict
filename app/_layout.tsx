import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/contexts/AuthContext';
import { ConflictJourneyProvider } from '@/contexts/ConflictJourneyContext';
import { colors } from '@/constants/theme';
import { ReadingBadgeProvider } from '@/components/ReadingBadges';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ConflictJourneyProvider>
          <ReadingBadgeProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.navy } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="reading" />
              <Stack.Screen name="bible-reader" />
            </Stack>
          </ReadingBadgeProvider>
        </ConflictJourneyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
