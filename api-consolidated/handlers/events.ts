import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getServerSupabase } from '../lib/supabaseServer';

const EventSchema = z.object({
  type: z.string().min(1).max(100),
  payload: z.record(z.any()).optional().default({}),
  session_id: z.string().uuid().optional(),
  playlist_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization; // Expect 'Bearer <jwt>' from client
  const supabase = getServerSupabase(auth);
  const getUserId = async () => (await supabase.auth.getUser()).data?.user?.id;

  if (req.method === 'POST') {
    try {
      const bodyRaw =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { type, payload, session_id, playlist_id } =
        EventSchema.parse(bodyRaw);

      const user_id = await getUserId();
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
      const user_id = await getUserId();
      if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

      const { session_id, playlist_id, type, limit } = req.query as Record<string, string | undefined>;
      const resultLimit = Math.max(1, Math.min(Number(limit) || 100, 500));

      let query = supabase.from('events').select('*').eq('user_id', user_id);
      if (session_id) query = query.eq('session_id', session_id);
      if (playlist_id) query = query.eq('playlist_id', playlist_id);
      if (type) query = query.eq('type', type);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(resultLimit);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, events: data });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
