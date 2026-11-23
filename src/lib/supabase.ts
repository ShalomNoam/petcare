import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/** False until .env is filled in – the app shows a setup notice instead of crashing. */
export const isSupabaseConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT-REF'));

export const supabase = createClient<Database>(
  isSupabaseConfigured ? url! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? key! : 'placeholder',
  {
    auth: {
      storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
