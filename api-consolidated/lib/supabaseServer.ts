import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/database.types';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create client with service role key for server-side operations
export function getServerSupabase(authHeader?: string): SupabaseClient<Database> {
  if (supabaseServiceKey && !authHeader) {
    // Use service role key for backend operations
    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Use anon key with user's JWT token
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    client.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
  }

  return client;
}