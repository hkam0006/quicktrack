import { Stack } from 'expo-router';

import { useAuth } from '@/src/features/auth/auth.context';
import { AuthLoadingView } from '@/src/features/auth/auth-loading-view';

export default function AuthLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingView />;
  }

  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create Account', headerShown: false }} />
    </Stack>
  );
}
