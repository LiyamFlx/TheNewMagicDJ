-- Add critical performance indexes for RLS queries

-- Playlists: user_id is the most common filter in RLS policies
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);

-- Tracks: playlist_id is used in RLS joins to check playlist ownership
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_id ON public.tracks(playlist_id);

-- Sessions: user_id is filtered in RLS policies
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- Analytics logs: session_id is used in RLS joins
CREATE INDEX IF NOT EXISTS idx_analytics_logs_session_id ON public.analytics_logs(session_id);

-- Crowd analytics: session_id is used in RLS joins
CREATE INDEX IF NOT EXISTS idx_crowd_analytics_session_id ON public.crowd_analytics(session_id);

-- AI recommendations: both user_id and session_id for flexible querying
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON public.ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_session_id ON public.ai_recommendations(session_id);

-- Device settings: user_id is the primary filter
CREATE INDEX IF NOT EXISTS idx_device_settings_user_id ON public.device_settings(user_id);

-- Session logs: session_id is used in RLS joins
CREATE INDEX IF NOT EXISTS idx_session_logs_session_id ON public.session_logs(session_id);

-- Composite index for common track queries (playlist + position for ordering)
CREATE INDEX IF NOT EXISTS idx_tracks_playlist_position ON public.tracks(playlist_id, position);

-- Index for timestamp-based queries (common in analytics)
CREATE INDEX IF NOT EXISTS idx_analytics_logs_timestamp ON public.analytics_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_crowd_analytics_timestamp ON public.crowd_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_logs_timestamp ON public.session_logs(timestamp);