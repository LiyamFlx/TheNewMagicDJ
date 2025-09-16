-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Users can manage their own playlists" ON playlists FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own sessions" ON sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage tracks in their playlists" ON tracks FOR ALL USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = tracks.playlist_id AND p.user_id = auth.uid()));

-- Helper indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_id ON tracks(playlist_id);
