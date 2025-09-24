import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerSupabase } from './lib/supabaseServer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization; // Expect 'Bearer <jwt>' from client
  const supabase = getServerSupabase(auth);

  if (req.method === 'POST') {
    try {
      const body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body || {};
      const { type, payload, session_id, playlist_id } = body;
      if (!type) return res.status(400).json({ error: 'type is required' });

      const { data: user } = await supabase.auth.getUser();
      const user_id = user?.user?.id;
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

      const { data, error } = await supabase
        .from('events')
        .insert([{ user_id, type, payload: payload ?? {}, session_id: session_id ?? null, playlist_id: playlist_id ?? null }])
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, event: data });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'unknown' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data: user } = await supabase.auth.getUser();
      const user_id = user?.user?.id;
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, events: data });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

