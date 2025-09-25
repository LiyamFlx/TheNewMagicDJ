#!/bin/bash
# Production Environment Setup Script
# Run this after deploying to Vercel to configure all required environment variables

set -e

echo "🚀 Setting up production environment variables..."

# Check if we're logged into Vercel
if ! vercel whoami &>/dev/null; then
    echo "❌ Please run 'vercel login' first"
    exit 1
fi

# Required environment variables for production
REQUIRED_VARS=(
    "SUPABASE_SERVICE_ROLE_KEY"
    "SPOTIFY_CLIENT_SECRET"
    "YOUTUBE_API_KEY"
    "AUDD_API_TOKEN"
    "ACOUSTID_API_KEY"
)

echo "📋 Checking required environment variables..."

# Read values from .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Please create it first."
    exit 1
fi

# Function to get env value from .env.local
get_env_value() {
    local key=$1
    local value=$(grep "^${key}=" .env.local | head -1 | cut -d'=' -f2- | tr -d '"')
    echo "$value"
}

# Set each required variable in Vercel production
for var in "${REQUIRED_VARS[@]}"; do
    value=$(get_env_value "$var")
    if [ -z "$value" ]; then
        echo "⚠️  $var not found in .env.local - skipping"
        continue
    fi

    echo "✅ Setting $var in production..."
    if ! vercel env add "$var" production <<< "$value" &>/dev/null; then
        echo "⚠️  Failed to set $var (may already exist)"
    fi
done

# Set public variables
PUBLIC_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "VITE_SPOTIFY_CLIENT_ID"
    "VITE_YOUTUBE_API_KEY"
    "VITE_FEATURE_STATUS"
)

for var in "${PUBLIC_VARS[@]}"; do
    value=$(get_env_value "$var")
    if [ -z "$value" ]; then
        continue
    fi

    echo "✅ Setting $var in production..."
    if ! vercel env add "$var" production <<< "$value" &>/dev/null; then
        echo "⚠️  Failed to set $var (may already exist)"
    fi
done

echo "✨ Production environment setup complete!"
echo "🔄 Run 'vercel --prod' to deploy with the new environment variables"