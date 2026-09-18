import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { conflictBackend } from '@/lib/conflictBackend';

// Deliberately ignore the old shared EXPO_PUBLIC_SUPABASE_* build variables.
const { url, key, storageKey } = conflictBackend(
  process.env.EXPO_PUBLIC_CONFLICT_SUPABASE_URL,
  process.env.EXPO_PUBLIC_CONFLICT_SUPABASE_PUBLISHABLE_KEY,
);

const storage = Platform.OS === 'web'
  ? {
      getItem: (k: string) => AsyncStorage.getItem(k),
      setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
      removeItem: (k: string) => AsyncStorage.removeItem(k),
    }
  : {
      getItem: (k: string) => SecureStore.getItemAsync(k),
      setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
      removeItem: (k: string) => SecureStore.deleteItemAsync(k),
    };

export const supabase = createClient(url, key, {
  auth: {
    storage,
    storageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
