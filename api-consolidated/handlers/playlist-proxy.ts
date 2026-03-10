import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SecureSupabaseClient } from '../../lib/supabaseSecure.js';
import { getServerSupabase } from '../lib/supabaseServer.js';

function getServiceClient() {
  return SecureSupabaseClient.getAdminClient();
}

/**
 * Verify the caller's identity via JWT and return their user ID.
 * Falls back to the userId sent in the request body/query ONLY for
 * backwards-compatible GET requests when no auth header is present.
 */
async function authenticateRequest(
  req: VercelRequest,
  fallbackUserId?: string
): Promise<{ userId: string | null; error?: string }> {
  const auth = req.headers.authorization;
  if (auth) {
    try {
      const supabase = getServerSupabase(auth);
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return { userId: null, error: 'Invalid or expired token' };
      return { userId: uid };
    } catch {
      return { userId: null, error: 'Authentication failed' };
    }
  }
  // Allow unauthenticated GET with explicit userId (read-only, RLS still applies)
  if (req.method === 'GET' && fallbackUserId) {
    return { userId: fallbackUserId };
  }
  return { userId: null, error: 'Authorization header required' };
}

// Allowed hosts (dev + production). Also allow project vercel deployments by suffix.
const allowedHosts = new Set<string>([
  'localhost:3000',
  'localhost:3001',
  'localhost:5173',
  '127.0.0.1:3000',
  '127.0.0.1:3001',
  '127.0.0.1:5173',
  'the-new-magic.vercel.app',
]);

function isAllowedHost(host: string): boolean {
  if (!host) return false;
  if (allowedHosts.has(host)) return true;
  // Allow Vercel preview deployments matching the project's exact naming pattern
  if (host.endsWith('.vercel.app') && /^the-new-magic(-[a-z0-9]+)?-/.test(host)) return true;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set JSON content type header first
  res.setHeader('Content-Type', 'application/json');

  const startTime = Date.now();
  const method = req.method || 'GET';
  const action = (req.query.action as string) || (req.body as any)?.action;
  const host = req.headers.host || "";

  // Host validation
  if (!isAllowedHost(host)) {
    return res.status(400).json({
      error: "INVALID_HOST",
      message: "Host not valid or supported",
      received: host,
      allowed: Array.from(allowedHosts)
    });
  }

  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = getServiceClient();

  try {
    // Validate Supabase connection
    if (!process.env.VITE_SUPABASE_URL && !process.env.PUBLIC_SUPABASE_URL) {
      return res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'Supabase URL not configured',
        code: 'MISSING_SUPABASE_URL'
      });
    }
    if (!hasServiceKey && method !== 'GET') {
      res.setHeader('X-MagicDJ-Hint', 'Set SUPABASE_SERVICE_ROLE_KEY on server');
      return res.status(500).json({
        error: 'Server missing SUPABASE_SERVICE_ROLE_KEY. Cannot write to playlists with anon key under RLS.',
        code: 'MISSING_SERVICE_KEY'
      });
    }
    if (method === 'GET' && (action === 'list' || !action)) {
      const queryUserId = (req.query.userId as string) || (req.query.user_id as string) || '';
      const { userId, error: authError } = await authenticateRequest(req, queryUserId);
      if (!userId) return res.status(401).json({ error: authError || 'Unauthorized', code: 'UNAUTHORIZED' });
      // userId is already validated by authenticateRequest above

      const { data: playlists, error: playlistError } = await supabase
        .from('playlists')
        .select('id, user_id, name, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (playlistError) {
        console.error("Supabase list error:", playlistError.message);
        return res.status(500).json({
          error: playlistError.message,
          code: 'PLAYLIST_FETCH_ERROR'
        });
      }

      const ids = (playlists || []).map(p => p.id);
      let tracksByPlaylist: Record<string, any[]> = {};
      if (ids.length > 0) {
        const { data: tracks, error } = await supabase
          .from('tracks')
          .select('id, playlist_id, title, artist, bpm, energy, duration, position, spotify_id, youtube_id')
          .in('playlist_id', ids)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("Supabase tracks fetch error:", error.message);
          return res.status(500).json({
            error: error.message,
            code: 'TRACKS_FETCH_ERROR'
          });
        }

        (tracks || []).forEach(t => {
          tracksByPlaylist[t.playlist_id] = tracksByPlaylist[t.playlist_id] || [];
          tracksByPlaylist[t.playlist_id].push(t);
        });
      }
      const combined = (playlists || []).map(p => ({ ...p, tracks: tracksByPlaylist[p.id] || [] }));
      return res.status(200).json({ ok: true, playlists: combined });
    }

    if (method === 'POST' && action === 'save') {
      let parsedBody;
      try {
        parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const { playlist } = parsedBody;
      const { userId, error: authError } = await authenticateRequest(req);
      if (!userId) return res.status(401).json({ error: authError || 'Unauthorized', code: 'UNAUTHORIZED' });
      if (!playlist) return res.status(400).json({
        error: 'Missing playlist payload',
        code: 'MISSING_PAYLOAD'
      });

      const playlistName = String(playlist.name || '').trim().slice(0, 200);
      const playlistDescription = playlist.description ? String(playlist.description).slice(0, 2000) : null;
      const payload = {
        id: playlist.id || undefined,
        name: playlistName || 'Untitled Playlist',
        user_id: userId,
        description: playlistDescription,
      };
      const { data: saved, error: upsertErr } = await supabase
        .from('playlists')
        .upsert(payload)
        .select()
        .single();
      if (upsertErr) return res.status(500).json({
        error: upsertErr.message,
        code: 'PLAYLIST_SAVE_ERROR'
      });

      // Save tracks if provided
      const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
      if (tracks.length) {
        const sanitized = tracks
          .map((t: any, idx: number) => {
            const source_url =
              t.source_url || t.url || t.youtube_url || t.preview_url || null;
            return {
              playlist_id: saved.id,
              title: String(t.title || 'Untitled').slice(0, 500),
              artist: String(t.artist || 'Unknown').slice(0, 500),
              bpm: typeof t.bpm === 'number' ? Math.floor(t.bpm) : null,
              energy: typeof t.energy === 'number' ? Math.floor(t.energy) : null,
              duration:
                typeof t.duration === 'number' ? Math.floor(t.duration) : 180,
              position: typeof t.position === 'number' ? t.position : idx,
              spotify_id: t.spotify_id ?? null,
              youtube_id: t.youtube_id ?? null,
              preview_url: t.preview_url ?? null,
              thumbnail: t.thumbnail ?? null,
              source_url,
            };
          })
          .filter(
            (row: any) =>
              row.title &&
              Boolean(
                row.spotify_id || row.youtube_id || row.preview_url || row.source_url
              )
          );
        // Upsert in chunks to be safe
        const chunkSize = 500;
        for (let i = 0; i < sanitized.length; i += chunkSize) {
          const slice = sanitized.slice(i, i + chunkSize);
          const { error } = await supabase.from('tracks').upsert(slice);
          if (error) return res.status(500).json({
            error: error.message,
            code: 'TRACKS_SAVE_ERROR'
          });
        }
      }

      return res.status(200).json({ ok: true, playlist: { ...saved, tracks: playlist.tracks || [] } });
    }

    if (method === 'PATCH' && action === 'update') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const { id, updates } = body;
      const { userId, error: authError } = await authenticateRequest(req);
      if (!userId) return res.status(401).json({ error: authError || 'Unauthorized', code: 'UNAUTHORIZED' });
      if (!id) return res.status(400).json({
        error: 'Missing playlist id',
        code: 'MISSING_ID'
      });
      const patch: any = {};
      if (typeof updates?.name === 'string') patch.name = updates.name.trim();
      if (typeof updates?.description === 'string') patch.description = updates.description;
      patch.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('playlists')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) return res.status(500).json({
        error: error.message,
        code: 'PLAYLIST_UPDATE_ERROR'
      });
      return res.status(200).json({ ok: true, playlist: data });
    }

    if (method === 'DELETE' && (action === 'delete' || !action)) {
      let parsedBody: any = {};
      try {
        parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid JSON in request body',
          code: 'INVALID_JSON'
        });
      }
      const { userId, error: authError } = await authenticateRequest(req);
      if (!userId) return res.status(401).json({ error: authError || 'Unauthorized', code: 'UNAUTHORIZED' });
      const id = (req.query.id as string) || (parsedBody as any).id;
      if (!id) return res.status(400).json({
        error: 'Missing id',
        code: 'MISSING_ID'
      });
      // Always enforce user_id to prevent cross-user deletion
      const { error } = await supabase.from('playlists').delete().eq('id', id).eq('user_id', userId);
      if (error) return res.status(500).json({
        error: error.message,
        code: 'PLAYLIST_DELETE_ERROR'
      });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error('[playlist-proxy] Error:', {
      error: e?.message || 'unknown',
      method,
      action,
      duration,
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    });

    const isDev = process.env.VERCEL_ENV === 'development' || process.env.NODE_ENV === 'development';
    return res.status(500).json({
      error: 'PLAYLIST_OPERATION_FAILED',
      message: isDev ? (e?.message || 'Internal server error') : 'Internal server error',
      code: e?.code || 'UNKNOWN_ERROR',
      duration,
      ...(isDev && { stack: e?.stack }),
    });
  }
}
