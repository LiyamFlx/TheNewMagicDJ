import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SecureSupabaseClient } from '../../lib/supabaseSecure.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const start = Date.now();
  const envOk =
    !!(
      process.env.VITE_SUPABASE_URL ||
      process.env.PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ) &&
    !!(
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

  let dbOk = false;
  let dbLatencyMs = 0;
  let errorMsg: string | null = null;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const client = SecureSupabaseClient.getAdminClient();
      await client.from('playlists').select('id').limit(1);
      dbOk = true;
    }
  } catch (e: any) {
    errorMsg = e?.message || 'unknown';
  } finally {
    dbLatencyMs = Date.now() - start;
  }

  const ok = envOk && (dbOk || !process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(ok ? 200 : 500).json({
    ok,
    envOk,
    dbOk,
    dbLatencyMs,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    version: process.env.npm_package_version || null,
    timestamp: new Date().toISOString(),
    error: errorMsg,
  });
}
