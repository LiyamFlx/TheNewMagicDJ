#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-${VERCEL_URL:-}}
TOKEN=${2:-${TOKEN:-}}

if [[ -z "$BASE_URL" ]]; then
  echo "Usage: $0 <base_url> [jwt_token]" >&2
  echo "Example: $0 https://your-app.vercel.app eyJhbGci..." >&2
  exit 1
fi

echo "🔎 Verifying endpoints on: $BASE_URL"

echo "\n[1/3] GET /api/health"
curl -sS "$BASE_URL/api/health" | jq . || curl -sS "$BASE_URL/api/health"

if [[ -n "$TOKEN" ]]; then
  echo "\n[2/3] GET /api/sessions (authorized)"
  curl -sS -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/sessions" | jq . || true

  echo "\n[3/3] POST /api/events (authorized)"
  curl -sS -X POST -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
    -d '{"type":"diagnostic.ping","payload":{"ts":'"$(date +%s)"'}}' \
    "$BASE_URL/api/events" | jq . || true
else
  echo "\nℹ Provide a JWT token as second arg to verify authorized endpoints (sessions/events)."
fi

echo "\nDone."

