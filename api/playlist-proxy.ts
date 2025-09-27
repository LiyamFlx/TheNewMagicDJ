// Simple working version of playlist-proxy without complex imports
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';
  const key = serviceKey || anon;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = getServiceClient();
  const method = req.method || 'GET';
  const action = (req.query.action as string) || (req.body as any)?.action;

  try {
    // Validate Supabase connection
    if (!process.env.VITE_SUPABASE_URL && !process.env.PUBLIC_SUPABASE_URL) {
      return res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'Supabase URL not configured'
      });
    }

    if (!hasServiceKey && method !== 'GET') {
      return res.status(500).json({ error: 'Server missing SUPABASE_SERVICE_ROLE_KEY. Cannot write with anon key under RLS.' });
    }

    if (method === 'GET' && (action === 'list' || !action)) {
      const userId = (req.query.userId as string) || '';
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const { data: playlists, error: playlistError } = await supabase
        .from('playlists')
        .select('id, user_id, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (playlistError) return res.status(500).json({ error: playlistError.message });

      return res.status(200).json({ ok: true, playlists: playlists || [] });
    }

    return res.status(404).json({ error: 'Action not supported in simplified version' });
  } catch (e: any) {
    return res.status(500).json({
      error: 'PLAYLIST_OPERATION_FAILED',
      message: e?.message || 'Internal server error'
    });
  }
}