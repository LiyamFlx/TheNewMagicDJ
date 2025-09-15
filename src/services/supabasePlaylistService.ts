// Supabase playlist service
import { supabase } from "../lib/supabase";

export const supabasePlaylistService = {
  async getUserPlaylists(userId: string) {
    return supabasePlaylistService.getPlaylists(userId);
  },
  async getPlaylists(userId: string) {
    const { data, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  },

  async createPlaylist(userId: string, name: string) {
    const { data, error } = await supabase
      .from("playlists")
      .insert([{ user_id: userId, name }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deletePlaylist(playlistId: string) {
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);
    if (error) throw error;
    return true;
  },
};