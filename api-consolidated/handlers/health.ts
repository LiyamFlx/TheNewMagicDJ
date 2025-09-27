import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from '../lib/supabaseServer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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

    const supabase = getServerSupabase(req.headers.authorization);
    // Lightweight reachability check (RLS may return empty, that's fine)
    const { error } = await supabase.from('playlists').select('id').limit(1);
    const dbLatencyMs = Date.now() - start;

    const ok = envOk && !error;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(ok ? 200 : 500).json({
      ok,
      envOk,
      dbOk: !error,
      dbLatencyMs,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      version: process.env.npm_package_version || null,
      timestamp: new Date().toISOString(),
      error: error?.message || null,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'unknown' });
  }
}
