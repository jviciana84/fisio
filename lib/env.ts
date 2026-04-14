const requiredEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AUTH_CHALLENGE_SECRET: process.env.AUTH_CHALLENGE_SECRET,
} as const;

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
}

export const env = requiredEnv;
