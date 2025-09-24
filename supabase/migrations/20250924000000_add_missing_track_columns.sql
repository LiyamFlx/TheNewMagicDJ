-- Add missing columns to tracks table that the frontend expects

-- Add thumbnail column for track images
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS thumbnail TEXT;

-- Add other commonly used columns that might be missing
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Update comment
COMMENT ON TABLE public.tracks IS 'Audio tracks with metadata, including thumbnails and source URLs';