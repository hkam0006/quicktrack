import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from '@/src/data/remote/supabase.client';

import type { AuthCredentials } from './auth.types';

function toAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Authentication failed. Please try again.';
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(toAuthErrorMessage(error));
  }

  return data.session;
}

export async function signInWithPassword(credentials: AuthCredentials): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error || !data.session) {
    throw new Error(toAuthErrorMessage(error));
  }

  return data.session;
}

export async function signUpWithPassword(credentials: AuthCredentials): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw new Error(toAuthErrorMessage(error));
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(toAuthErrorMessage(error));
  }
}

export function subscribeToAuthChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
