// Supabase playlist service
import { supabase } from "../lib/supabase";
import { AppError } from "../utils/errors";

// simple in-memory cache for a short TTL to reduce DB pressure
const cache = new Map<string, { data: any; expiry: number }>();
const TTL_MS = 15_000; // 15 seconds
function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  if (entry) cache.delete(key);
  return null;
}
function setCached(key: string, data: any) {
  cache.set(key, { data, expiry: Date.now() + TTL_MS });
}

export const supabasePlaylistService = {
  async getUserPlaylists(userId: string) {
    return supabasePlaylistService.getPlaylists(userId);
  },
  async getPlaylists(userId: string) {
    const key = `playlists:${userId}`;
    const fromCache = getCached(key);
    if (fromCache) return fromCache;

    // Select playlists and include normalized tracks via FK relation, alias to avoid name clash
    const { data, error } = await supabase
      .from("playlists")
      .select("id, user_id, name, created_at, updated_at, items:tracks(id, title, artist, bpm, energy, duration, created_at, updated_at)")
      .eq("user_id", userId);

    if (error) throw new AppError('UPSTREAM_ERROR', 'Failed to fetch playlists', { details: { error } });

    // Hydrate to expected shape: playlist.tracks array
    const hydrated = (data || []).map((p: any) => ({
      ...p,
      tracks: (p.items || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        bpm: t.bpm ?? undefined,
        energy: typeof t.energy === 'number' ? Number(t.energy) : undefined,
        duration: t.duration ?? 180,
      })),
      items: undefined,
    }));

    setCached(key, hydrated);
    return hydrated;
  },

  async createPlaylist(userId: string, name: string) {
    const { data, error } = await supabase
      .from("playlists")
      .insert([{ user_id: userId, name }])
      .select()
      .single();
    if (error) throw new AppError('UPSTREAM_ERROR', 'Failed to create playlist', { details: { error } });
    // bust cache for user
    cache.delete(`playlists:${userId}`);
    return data;
  },

  async deletePlaylist(playlistId: string) {
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);
    if (error) throw new AppError('UPSTREAM_ERROR', 'Failed to delete playlist', { details: { error } });
    // best-effort cache bust: we don't know userId here, so clear all playlist caches
    for (const key of cache.keys()) if (key.startsWith('playlists:')) cache.delete(key);
    return true;
  },
};
