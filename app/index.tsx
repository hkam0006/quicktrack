import { Redirect } from 'expo-router';

import { useAuth } from '@/src/features/auth/auth.context';
import { AuthLoadingView } from '@/src/features/auth/auth-loading-view';

export default function IndexScreen() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <AuthLoadingView />;
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Redirect href="/(tabs)" />;
}
