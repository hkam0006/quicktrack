import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getRuntimeEnv } from '@/src/shared/lib/env';

import { triggerSyncNow } from './sync.service';

const NETWORK_POLL_MS = 15000;

async function probeNetworkReachability(): Promise<boolean> {
  const { supabaseUrl } = getRuntimeEnv();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(supabaseUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    return response.ok || response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function useSyncTriggers(userId: string | null | undefined) {
  const lastConnected = useRef<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let mounted = true;

    const maybeSyncOnReconnect = async () => {
      const isConnected = await probeNetworkReachability();
      if (!mounted) {
        return;
      }

      const wasConnected = lastConnected.current;
      lastConnected.current = isConnected;

      if (isConnected && wasConnected === false) {
        await triggerSyncNow(userId);
      }
    };

    const initialSync = async () => {
      await triggerSyncNow(userId);
      await maybeSyncOnReconnect();
    };

    void initialSync();

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void triggerSyncNow(userId);
      }
    });

    const interval = setInterval(() => {
      void maybeSyncOnReconnect();
    }, NETWORK_POLL_MS);

    return () => {
      mounted = false;
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [userId]);
}
