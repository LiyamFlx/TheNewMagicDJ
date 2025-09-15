/*
  # Initial Database Schema for MagicDJ

  1. New Tables
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `name` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `playlists` - User playlists
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `description` (text, optional)
      - `type` (text) - 'magic_match' or 'magic_set'
      - `tracks` (jsonb) - array of track objects
      - `total_duration` (integer) - duration in seconds
      - `metadata` (jsonb, optional) - additional playlist metadata
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `sessions` - DJ session records
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `playlist_id` (uuid, references playlists, optional)
      - `name` (text)
      - `started_at` (timestamp)
      - `ended_at` (timestamp, optional)
      - `status` (text) - 'active', 'completed', 'paused'
      - `analytics` (jsonb, optional) - session analytics data
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own profiles, playlists, and sessions
</sql>

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('magic_match', 'magic_set')),
  tracks jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_duration integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  playlist_id uuid REFERENCES playlists(id) ON DELETE SET NULL,
  name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  analytics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Playlists policies
CREATE POLICY "Users can read own playlists"
  ON playlists
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own playlists"
  ON playlists
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON playlists
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON playlists
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can read own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_playlist_id ON sessions(playlist_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();