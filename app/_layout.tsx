import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useSyncTriggers } from '@/src/data/sync/use-sync-triggers';
import { getRuntimeEnv } from '@/src/shared/lib/env';
import { AuthProvider, useAuth } from '@/src/features/auth/auth.context';
import { darkThemeTokens } from '@/src/shared/theme/tokens';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isLoading, user, signOut } = useAuth();
  const signingOutForMissingSessionRef = useRef(false);

  useSyncTriggers(user?.id);

  useEffect(() => {
    if (isLoading || session || signingOutForMissingSessionRef.current) {
      return;
    }

    let mounted = true;

    const ensureSignedOutWhenOnline = async () => {
      const { supabaseUrl } = getRuntimeEnv();

      try {
        const response = await fetch(supabaseUrl, { method: 'HEAD' });
        if (!mounted || !response.ok) {
          return;
        }
      } catch {
        return;
      }

      signingOutForMissingSessionRef.current = true;
      try {
        await signOut();
      } finally {
        signingOutForMissingSessionRef.current = false;
      }
    };

    void ensureSignedOutWhenOnline();

    return () => {
      mounted = false;
    };
  }, [isLoading, session, signOut]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: darkThemeTokens.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={darkThemeTokens.accent} />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-transaction"
        options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
