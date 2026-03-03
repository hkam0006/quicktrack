import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useSyncTriggers } from '@/src/data/sync/use-sync-triggers';
import { AuthProvider, useAuth } from '@/src/features/auth/auth.context';
import { AuthLoadingView } from '@/src/features/auth/auth-loading-view';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { isLoading, user, session } = useAuth();
  const isAuthenticated = Boolean(session);

  useSyncTriggers(user?.id);

  if (isLoading) {
    return <AuthLoadingView />;
  }

  return (
    <Stack
      key={isAuthenticated ? 'authenticated' : 'anonymous'}
      screenOptions={{
        headerShown: false,
      }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-transaction"
            options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }}
          />
        </>
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
