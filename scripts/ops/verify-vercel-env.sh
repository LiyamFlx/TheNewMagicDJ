#!/usr/bin/env bash
set -euo pipefail

REQUIRED=(
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET
  YOUTUBE_API_KEY
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
)

OPTIONAL=(
  DURABLE_STORE_URL
  DURABLE_STORE_TOKEN
)

echo "🔎 Checking Vercel Production environment variables..."

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ vercel CLI not found. Install with: npm i -g vercel" >&2
  exit 1
fi

# Try both syntaxes for compatibility
ENV_LIST=$(vercel env ls 2>/dev/null || vercel env ls --environment production 2>/dev/null || true)

if [[ -z "$ENV_LIST" ]]; then
  echo "❌ Could not list Vercel envs. Are you logged in and linked? (vercel login; vercel link)" >&2
  exit 1
fi

echo "---"
echo "$ENV_LIST" | sed -n '1,80p'
echo "---"

MISSING=()
for key in "${REQUIRED[@]}"; do
  if ! echo "$ENV_LIST" | grep -E "\b${key}\b" >/dev/null; then
    MISSING+=("$key")
  fi
done

if ((${#MISSING[@]})); then
  echo "⚠ Missing required env vars in Vercel (production): ${MISSING[*]}"
  echo "Add them with: vercel env add <KEY> production"
  exit 2
fi

echo "✅ Required env vars present."

MISSING_OPT=()
for key in "${OPTIONAL[@]}"; do
  if ! echo "$ENV_LIST" | grep -E "\b${key}\b" >/dev/null; then
    MISSING_OPT+=("$key")
  fi
done

if ((${#MISSING_OPT[@]})); then
  echo "ℹ Optional (KV-backed) env vars missing: ${MISSING_OPT[*]}"
  echo "   Add if you want distributed idempotency and rate limiting."
else
  echo "✅ Optional KV env vars are configured."
fi

echo "Done."

