import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutService,
  signUpWithPassword,
  subscribeToAuthChanges,
} from './auth.service';
import type { AuthCredentials, AuthState } from './auth.types';

const initialState: AuthState = {
  session: null,
  user: null,
  isLoading: true,
  errorMessage: null,
};

export function useAuthSession() {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((session) => {
        if (!isMounted) {
          return;
        }

        setState((previous) => ({
          ...previous,
          session,
          user: session?.user ?? null,
          isLoading: false,
        }));
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setState((previous) => ({
          ...previous,
          errorMessage: error instanceof Error ? error.message : 'Failed to load session.',
          isLoading: false,
        }));
      });

    const subscription = subscribeToAuthChanges((_event, session) => {
      if (!isMounted) {
        return;
      }

      setState((previous) => ({
        ...previous,
        session,
        user: session?.user ?? null,
      }));
    });

    return () => {
      isMounted = false;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => {
    setState((previous) => ({ ...previous, errorMessage: null }));
  }, []);

  const signIn = useCallback(async (credentials: AuthCredentials) => {
    setState((previous) => ({ ...previous, isLoading: true, errorMessage: null }));
    try {
      const session = await signInWithPassword(credentials);
      setState((previous) => ({
        ...previous,
        session,
        user: session.user,
        isLoading: false,
        errorMessage: null,
      }));
      return true;
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'Sign in failed.',
      }));
      return false;
    }
  }, []);

  const signUp = useCallback(async (credentials: AuthCredentials) => {
    setState((previous) => ({ ...previous, isLoading: true, errorMessage: null }));
    try {
      const session = await signUpWithPassword(credentials);
      setState((previous) => ({
        ...previous,
        session,
        user: session?.user ?? null,
        isLoading: false,
        errorMessage: null,
      }));
      return true;
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'Sign up failed.',
      }));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, errorMessage: null }));
    try {
      await signOutService();
      setState((previous) => ({
        ...previous,
        session: null,
        user: null,
        isLoading: false,
      }));
      return true;
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : 'Sign out failed.',
      }));
      return false;
    }
  }, []);

  return useMemo(
    () => ({
      ...state,
      clearError,
      signIn,
      signUp,
      signOut,
    }),
    [clearError, signIn, signOut, signUp, state]
  );
}
