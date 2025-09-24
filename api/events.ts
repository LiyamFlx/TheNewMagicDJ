import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getServerSupabase } from './lib/supabaseServer.js';

const EventSchema = z.object({
  type: z.string().min(1).max(100),
  payload: z.record(z.any()).optional().default({}),
  session_id: z.string().uuid().optional(),
  playlist_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization; // Expect 'Bearer <jwt>' from client
  const supabase = getServerSupabase(auth);

  if (req.method === 'POST') {
    try {
      const bodyRaw =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { type, payload, session_id, playlist_id } =
        EventSchema.parse(bodyRaw);

      const { data: user } = await supabase.auth.getUser();
      const user_id = user?.user?.id;
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            user_id,
            type,
            payload: payload ?? {},
            session_id: session_id ?? null,
            playlist_id: playlist_id ?? null,
          },
        ])
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, event: data });
    } catch (e: any) {
      const message = e?.message || 'invalid_request';
      const code = e?.name === 'ZodError' ? 400 : 500;
      return res.status(code).json({ error: message });
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
