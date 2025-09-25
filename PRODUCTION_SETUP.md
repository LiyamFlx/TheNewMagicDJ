# PRODUCTION DEPLOYMENT CHECKLIST

## CRITICAL: Add these environment variables to Vercel Production

Run these commands after deploying to Vercel:

```bash
# 1. Add the missing service role key (CRITICAL)
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwbHBhZWd3cmVoY3hoa3Bma2NuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU5MjcyMSwiZXhwIjoyMDcwMTY4NzIxfQ.1DebJcOTMN_2z2X79abNgIyeOlDVW_d0H2aKKKnf32Q

# 2. Add Spotify credentials (server-side only)
vercel env add SPOTIFY_CLIENT_SECRET production
# Paste: c91bac6324864a6fb7ba7b1de810d24f

# 3. Add other API keys
vercel env add YOUTUBE_API_KEY production
# Paste: AIzaSyAnIaqX86d9r-PCNdzTwpe64dWAq60zRbY

vercel env add AUDD_API_TOKEN production
# Paste: 65eda6d85f7f9156f06f9c8593b8f94

# 4. Redeploy with new environment
vercel --prod
```

## WHAT THIS FIXES:
- ✅ Playlist operations will work (SUPABASE_SERVICE_ROLE_KEY)
- ✅ Spotify API calls secure (server-side secrets only)
- ✅ Audio recognition functional (AUDD_API_TOKEN)
- ✅ YouTube search working (YOUTUBE_API_KEY)

Without these variables, the app will fail to:
- Save/load playlists (401 errors)
- Generate magic sets (no Spotify access)
- Recognize audio (AudD API missing)
- Search YouTube tracks (API missing)