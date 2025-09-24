import { createClient } from '@supabase/supabase-js';

export function getServerSupabase(authorization?: string) {
  const url = process.env.VITE_SUPABASE_URL
    || process.env.PUBLIC_SUPABASE_URL
    || process.env.NEXT_PUBLIC_SUPABASE_URL
    || '';
  const anon = process.env.VITE_SUPABASE_ANON_KEY
    || process.env.PUBLIC_SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || '';

  const client = createClient(url, anon, {
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

