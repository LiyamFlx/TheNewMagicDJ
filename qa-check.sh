#!/bin/bash
# QA Checklist Script for MagicDJ Platform
# Runs stress tests, edge case checks, and latency benchmarks

BASE_URL="http://localhost:5174"
SPOTIFY_TOKEN_ENDPOINT="http://localhost:5174/api/spotify-token"
YOUTUBE_IFRAME_TEST="https://www.youtube.com/embed/dQw4w9WgXcQ"

echo "=== MagicDJ QA Checklist Script ==="
date

# 1. Cold Start Test
echo -e "\n[1] Cold Start Time"
START=$(date +%s%3N)
curl -s -o /dev/null -w "Status:%{http_code} Total:%{time_total}s\n" "$BASE_URL"
END=$(date +%s%3N)
echo "Cold start latency: $((END-START)) ms"

# 2. Spotify Token API Check
echo -e "\n[2] Spotify Token Endpoint"
curl -s -i -H "Content-Type: application/json" "$SPOTIFY_TOKEN_ENDPOINT" | head -n 5

# 3. YouTube Readiness Check (simulate iframe load)
echo -e "\n[3] YouTube IFrame Readiness"
curl -s -o /dev/null -w "Status:%{http_code} Time:%{time_total}s\n" "$YOUTUBE_IFRAME_TEST"

# 4. Retry Simulation for Unavailable API
echo -e "\n[4] Retry & Backoff Simulation"
for i in {1..5}; do
  START=$(date +%s%3N)
  curl -s -o /dev/null -w "Attempt $i - Status:%{http_code} Time:%{time_total}s\n" "http://localhost:5174/api/nonexistent"
  END=$(date +%s%3N)
  sleep $((i*2)) # exponential backoff
done

# 5. Stress Test Music Sources
echo -e "\n[5] Stress Test Music Sources"
for src in spotify youtube local; do
  echo "Switching to source: $src"
  curl -s "$BASE_URL/play?source=$src" | head -n 3
  sleep 1
done

# 6. Log Diagnostics
echo -e "\n[6] Diagnostics Log Tail"
tail -n 20 ./logs/*.log 2>/dev/null || echo "No logs found."

echo -e "\n✅ QA Script Completed."
