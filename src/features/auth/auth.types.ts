import type { Session, User } from '@supabase/supabase-js';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials extends AuthCredentials {
  confirmPassword: string;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  errorMessage: string | null;
}
