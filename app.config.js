const appJson = require('./app.json');
const fs = require('node:fs');
const path = require('node:path');

const baseConfig = appJson.expo;

function loadEnvFileValues() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const values = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      continue;
    }

    values[key] = value;
  }

  return values;
}

const envFileValues = loadEnvFileValues();

function pickEnvValue(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
}

module.exports = () => ({
  ...baseConfig,
  extra: {
    ...(baseConfig.extra || {}),
    supabaseUrl: pickEnvValue(
      process.env.SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      envFileValues.SUPABASE_URL,
      envFileValues.EXPO_PUBLIC_SUPABASE_URL
    ),
    supabaseAnonKey: pickEnvValue(
      process.env.SUPABASE_ANON_KEY,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      envFileValues.SUPABASE_ANON_KEY,
      envFileValues.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ),
  },
});
