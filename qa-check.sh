#!/bin/bash
BASE_URL="http://localhost:5174"
SPOTIFY_TOKEN_ENDPOINT="$BASE_URL/api/spotify-token"
YOUTUBE_IFRAME_TEST="https://www.youtube.com/embed/dQw4w9WgXcQ"

echo "=== MagicDJ QA Checklist Script ==="
date
echo "Base URL: $BASE_URL"

echo -e "\n[1] Cold Start Time"
START=$(date +%s)
curl -s -o /dev/null -w "Status:%{http_code} Total:%{time_total}s\n" "$BASE_URL"
END=$(date +%s)
echo "Cold start latency: $((END-START)) seconds"

echo -e "\n[2] Spotify Token Endpoint"
curl -s -i -H "Content-Type: application/json" "$SPOTIFY_TOKEN_ENDPOINT" | head -n 8

echo -e "\n[3] YouTube IFrame Readiness"
curl -s -o /dev/null -w "Status:%{http_code} Time:%{time_total}s\n" "$YOUTUBE_IFRAME_TEST"

echo -e "\n[4] Retry & Backoff Simulation"
for i in {1..5}; do
  curl -s -o /dev/null -w "Attempt $i - Status:%{http_code} Time:%{time_total}s\n" "$BASE_URL/api/nonexistent"
  sleep $((i*2))
done

echo -e "\n[5] Stress Test Music Sources"
for src in spotify youtube local; do
  echo "Switching to source: $src"
  curl -s "$BASE_URL/play?source=$src" | head -n 3
  sleep 1
done

echo -e "\n[6] Spotify Token Expiry Simulation"
INVALID_TOKEN="Bearer invalid_token_$(date +%s)"
curl -s -i -H "Authorization: $INVALID_TOKEN" "$SPOTIFY_TOKEN_ENDPOINT" | head -n 8

echo -e "\n[7] Diagnostics Log Tail"
tail -n 20 ./logs/*.log 2>/dev/null || echo "No logs found."

echo -e "\n✅ QA Script Completed."
