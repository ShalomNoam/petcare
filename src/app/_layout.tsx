import {
  Assistant_400Regular,
  Assistant_600SemiBold,
  Assistant_700Bold,
} from '@expo-google-fonts/assistant';
import {
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  Rubik_900Black,
  useFonts,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { initNotifications } from '@/lib/notifications';
import { ensureRTL } from '@/lib/rtl';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

ensureRTL();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // One useFonts call for all faces (Rubik + Assistant).
  const [fontsLoaded, fontError] = useFonts({
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    Rubik_900Black,
    Assistant_400Regular,
    Assistant_600SemiBold,
    Assistant_700Bold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Route guards:
 *   not configured, signed out → setup notice (+ "try demo mode")
 *   signed out               → (auth): phone → SMS code
 *   demo mode                → like signed in, data stays on the device
 *   signed in, no first name → welcome (name + optional ID)
 *   signed in with a name    → (app)
 */
function RootNavigator() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  useEffect(() => {
    initNotifications();
  }, []);

  if (loading) return null;

  const signedIn = !!user;
  const hasName = !!profile?.first_name;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
      <Stack.Protected guard={!isSupabaseConfigured && !signedIn}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={isSupabaseConfigured && !signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasName}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && hasName}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="style-guide" />
    </Stack>
  );
}
