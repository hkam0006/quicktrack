import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { getRuntimeEnv } from '@/src/shared/lib/env';

import type { Database } from './supabase.types';

const runtimeEnv = getRuntimeEnv();

export const supabase = createClient<Database>(
  runtimeEnv.supabaseUrl,
  runtimeEnv.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export type SupabaseClient = typeof supabase;
