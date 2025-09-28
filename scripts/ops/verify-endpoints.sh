#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-${VERCEL_URL:-}}
TOKEN=${2:-${TOKEN:-}}
BYPASS=${3:-${VERCEL_BYPASS_TOKEN:-}}
USER_ID=${4:-${MAGICDJ_TEST_USER_ID:-}}

if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 <base_url> [jwt_token]" >&2
  echo "Example: $0 https://your-app.vercel.app eyJhbGci..." >&2
  exit 1
fi

echo "🔎 Verifying endpoints on: $BASE_URL"

# If a Vercel protection bypass token is provided, set the cookie first
COOKIE_JAR=$(mktemp)
if [[ -n "$BYPASS" ]]; then
  echo "\n[0/3] Setting Vercel protection bypass cookie"
  # Hit a lightweight endpoint to set the cookie
  curl -sS -c "$COOKIE_JAR" \
    "$BASE_URL/api/health?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=$BYPASS" >/dev/null || true
fi

echo "\n[1/3] GET /api/health"
if [[ -n "$BYPASS" ]]; then
  curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/health" | jq . || curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/health"
else
  curl -sS "$BASE_URL/api/health" | jq . || curl -sS "$BASE_URL/api/health"
fi

if [[ -n "$TOKEN" ]]; then
  echo "\n[2/3] GET /api/sessions (authorized)"
  if [[ -n "$BYPASS" ]]; then
    curl -sS -b "$COOKIE_JAR" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/sessions" | jq . || true
  else
    curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/sessions" | jq . || true
  fi

  echo "\n[3/3] POST /api/events (authorized)"
  if [[ -n "$BYPASS" ]]; then
    curl -sS -b "$COOKIE_JAR" -X POST -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d '{"type":"diagnostic.ping","payload":{"ts":'"$(date +%s)"'}}' \
    "$BASE_URL/api/events" | jq . || true
  else
    curl -sS -X POST -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d '{"type":"diagnostic.ping","payload":{"ts":'"$(date +%s)"'}}' \
    "$BASE_URL/api/events" | jq . || true
  fi
else
  echo "\nℹ Provide a JWT token as second arg to verify authorized endpoints (sessions/events)."
fi

echo "\n[Extra] GET /api/spotify-token"
if [[ -n "$BYPASS" ]]; then
  curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/spotify-token" | jq . || curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/spotify-token"
else
  curl -sS "$BASE_URL/api/spotify-token" | jq . || curl -sS "$BASE_URL/api/spotify-token"
fi

if [[ -n "$USER_ID" ]]; then
  echo "\n[Extra] GET /api/playlist-proxy?action=list&userId=$USER_ID"
  if [[ -n "$BYPASS" ]]; then
    curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/playlist-proxy?action=list&userId=$USER_ID" | jq . || true
  else
    curl -sS "$BASE_URL/api/playlist-proxy?action=list&userId=$USER_ID" | jq . || true
  fi
fi

echo "\n[Extra] GET /api/youtube-search?q=daft%20punk&maxResults=1"
if [[ -n "$BYPASS" ]]; then
  curl -sS -b "$COOKIE_JAR" "$BASE_URL/api/youtube-search?q=daft%20punk&maxResults=1" | jq . || true
else
  curl -sS "$BASE_URL/api/youtube-search?q=daft%20punk&maxResults=1" | jq . || true
fi

echo "\nDone."

# Cleanup
rm -f "$COOKIE_JAR" || true
