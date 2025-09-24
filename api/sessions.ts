import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getServerSupabase } from './lib/supabaseServer.js';

const CreateSessionSchema = z.object({
  name: z.string().min(1).max(200),
  playlist_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization;
  const supabase = getServerSupabase(auth);

  if (req.method === 'GET') {
    const { data: user } = await supabase.auth.getUser();
    const user_id = user?.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user_id)
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, sessions: data });
  }

  if (req.method === 'POST') {
    const raw = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body || {};
    const { name, playlist_id } = CreateSessionSchema.parse(raw);
    const { data: user } = await supabase.auth.getUser();
    const user_id = user?.user?.id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('sessions')
      .insert([{ user_id, playlist_id: playlist_id ?? null, status: 'active', started_at: new Date().toISOString() }])
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, session: data });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
