// Runtime environment validation
// Import this in layout.tsx or API routes to fail fast on missing config

const requiredServerEnvs = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

const requiredPublicEnvs = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function validateServerEnv() {
  const missing: string[] = [];
  for (const key of requiredServerEnvs) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Copy .env.example to .env.local and fill in the values."
    );
  }
}

export function validatePublicEnv() {
  const missing: string[] = [];
  for (const key of requiredPublicEnvs) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.warn(
      `Missing public environment variables: ${missing.join(", ")}`
    );
  }
}
