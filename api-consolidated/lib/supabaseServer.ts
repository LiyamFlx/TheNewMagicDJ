import { SecureSupabaseClient } from '../../lib/supabaseSecure';

export function getServerSupabase(authHeader?: string) {
  return SecureSupabaseClient.getServerClient(authHeader);
}

