import Constants from 'expo-constants';

interface RuntimeEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

interface ExpoExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

let cachedEnv: RuntimeEnv | null = null;

function readExpoExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function sanitizeEnvValue(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const hasWrappedQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  return hasWrappedQuotes ? trimmed.slice(1, -1) : trimmed;
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const sanitizedValue = sanitizeEnvValue(value);
    if (sanitizedValue) {
      return sanitizedValue;
    }
  }

  return undefined;
}

function requireNonEmpty(value: string | undefined, key: keyof RuntimeEnv): string {
  if (!value) {
    throw new Error(`Missing required runtime config: ${key}`);
  }

  return value;
}

function requireValidUrl(value: string, key: keyof RuntimeEnv): string {
  try {
    const parsed = new URL(value);
    console.log(parsed)
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Expected HTTP(S) URL');
    }
    return value;
  } catch {
    throw new Error(
      `Invalid runtime config for ${key}. Received: ${JSON.stringify(
        value
      )}. Expected an HTTP(S) Supabase API URL (for local: http://127.0.0.1:54321).`
    );
  }
}

export function getRuntimeEnv(): RuntimeEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const extra = readExpoExtra();

  const supabaseUrl = requireValidUrl(
    requireNonEmpty(
      firstNonEmpty(extra.supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL),
      'supabaseUrl'
    ),
    'supabaseUrl'
  );

  const supabaseAnonKey = requireNonEmpty(
    firstNonEmpty(
      extra.supabaseAnonKey,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      process.env.SUPABASE_ANON_KEY
    ),
    'supabaseAnonKey'
  );

  cachedEnv = {
    supabaseUrl,
    supabaseAnonKey,
  };

  return cachedEnv;
}
