import { SecureSupabaseClient } from '../../lib/supabaseSecure.js';

export function getServerSupabase(authHeader?: string) {
  return SecureSupabaseClient.getServerClient(authHeader);
}

