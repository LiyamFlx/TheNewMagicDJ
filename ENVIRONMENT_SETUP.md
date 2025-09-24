# Environment Setup Guide

## 🔧 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file in your project root (use `.env.example` as template):

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# YouTube
VITE_YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_API_KEY=your_youtube_api_key  # for serverless APIs

# Spotify (client & server)
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional: Development settings
NODE_ENV=development
```

Optional (recognition, analytics, AI):

VITE_AUDD_API_TOKEN=your_audd_token
AUDD_API_TOKEN=your_audd_token
VITE_ACOUSTID_API_KEY=your_acoustid_key
ACOUSTID_API_KEY=your_acoustid_key
VITE_LASTFM_API_KEY=your_lastfm_key
VITE_LASTFM_SECRET=your_lastfm_secret
OPENAI_API_KEY=your_openai_key   # server-side preferred
GEMINI_API_KEY=your_gemini_key   # server-side preferred

Security: Do not commit real secrets. Prefer server-side vars (no VITE_) whenever possible.

### 3. Verify Setup
```bash
# Check if environment variables are set
npm run env:check

# Start development server with API
npm run dev:api

# Or start just the frontend
npm run dev
```

## 🚀 Vercel Deployment Setup

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Link Project
```bash
vercel link
```

### 3. Set Environment Variables
```bash
# Set production environment variables (examples)
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SPOTIFY_CLIENT_SECRET production
vercel env add YOUTUBE_API_KEY production
vercel env add AUDD_API_TOKEN production
vercel env add ACOUSTID_API_KEY production

# Set for all environments (production, preview, development)
vercel env ls
```

### 4. Deploy
```bash
# Preview deployment
npm run deploy:preview

# Production deployment
npm run deploy
```

## 🧪 Testing Your Setup

### 1. Health Check
```bash
# Local
curl http://localhost:3000/api/spotify-token?health=true

# Production
curl https://your-domain.vercel.app/api/spotify-token?health=true
```

### 2. Token Request
```bash
# Local
curl http://localhost:3000/api/spotify-token

# Production
curl https://your-domain.vercel.app/api/spotify-token
```

### 3. Rate Limit Testing
```bash
# Test rate limiting (will hit limit after 30 requests)
for i in {1..35}; do
  echo "Request $i:"
  curl -w "Status: %{http_code}\n" http://localhost:3000/api/spotify-token
done
```

### 4. Automated Testing
```bash
# Run comprehensive API tests
npm run api:test

# Test all functionality
npm run validate
```

## 📁 Project Structure

```
project/
├── api/                    # Vercel serverless functions
│   ├── spotify-token.ts   # Main Spotify token API endpoint
│   ├── acoustid.ts        # AcoustID audio recognition API
│   ├── audd.ts            # AudD audio recognition API
│   └── tsconfig.json      # API-specific TypeScript config
├── src/                   # Frontend React app
│   ├── components/        # React components
│   ├── services/         # API clients and business logic
│   ├── utils/            # Shared utilities
│   └── types/            # TypeScript type definitions
├── utils/                 # Shared utilities for API
│   ├── idempotency.ts    # Request idempotency handling
│   ├── errors.ts         # Error handling utilities
│   └── http.ts           # HTTP retry and timeout utilities
├── test/                  # Test files
│   └── api/
│       └── test-spotify-token.ts # API integration tests
├── tests/                 # E2E tests
│   ├── qa-validation.spec.ts # QA validation tests
│   └── README.md         # Testing documentation
├── .env.local            # Local environment variables
├── vercel.json           # Vercel configuration
├── package.json          # Enhanced with new scripts
└── ENVIRONMENT_SETUP.md  # This file
```

## 🛠️ Development Workflow

### Daily Development
```bash
# Start development with API support
npm run dev:api

# Run type checking
npm run validate

# Test API locally
npm run api:test

# Check environment setup
npm run env:check
```

### Before Deployment
```bash
# Full validation pipeline
npm run validate

# Build test
npm run test:build

# Deploy to preview
npm run deploy:preview

# Run QA validation tests
npm run test:qa
```

### Production Deployment
```bash
# Deploy to production
npm run deploy
```

## 🔍 Monitoring & Debugging

### View Logs
```bash
# Vercel function logs
vercel logs

# Real-time logs
vercel logs --follow

# Specific function logs
vercel logs --function=api/spotify-token
```

### Health Monitoring
```bash
# Quick health check
npm run api:health

# Or manually
curl -s https://your-domain.vercel.app/api/spotify-token?health=true | jq
```

### Debug API Issues
1. **Check correlation IDs in logs** for request tracing
2. **Use health endpoint** (`/api/spotify-token?health=true`) for diagnostics
3. **Verify environment variables** are set with `npm run env:check`
4. **Test rate limiting behavior** with multiple concurrent requests
5. **Monitor function duration** in Vercel dashboard

## 🔄 Common Tasks

### Update Spotify Credentials
```bash
# Update in Vercel
vercel env rm VITA_SPOTIFY_CLIENT_ID
vercel env add VITA_SPOTIFY_CLIENT_ID

vercel env rm VITA_SPOTIFY_CLIENT_SECRET
vercel env add VITA_SPOTIFY_CLIENT_SECRET

# Redeploy to apply changes
vercel --prod
```

### Clear Cache & Restart
```bash
# Clear local cache
npm run clean

# Clear everything and reinstall
npm run clean:all

# Restart development server
npm run dev:api
```

### Performance Monitoring
- **Function Duration**: Monitor in Vercel dashboard
- **Rate Limiting**: Check effectiveness with `npm run api:test`
- **Token Cache**: Hit rates logged in function output
- **Error Tracking**: Use correlation IDs in error logs

## ⚡ Performance Tips

1. **Token Caching**: Tokens are cached for ~58 minutes (2min buffer)
2. **Rate Limiting**: 30 requests per minute per IP address
3. **Request Deduplication**: Concurrent requests share the same token fetch
4. **Memory Management**: Rate limit buckets auto-cleanup every 5 minutes
5. **Monitoring**: Use correlation IDs for request tracing
6. **Circuit Breaker**: Automatic failure detection and recovery

## 🚨 Troubleshooting

### Common Issues

1. **"Missing credentials" error**
   ```bash
   # Verify environment variables
   npm run env:check

   # Check Vercel environment
   vercel env ls
   ```

2. **Rate limiting too aggressive**
   - Adjust `BUCKET_MAX` in `api/spotify-token.ts`
   - Consider IP whitelisting for development
   - Use idempotency keys for repeated requests

3. **Token fetch timeouts**
   - Check Spotify API status: https://developer.spotify.com/documentation/web-api/
   - Verify network connectivity
   - Review timeout settings in configuration

4. **CORS errors**
   - Verify `vercel.json` headers configuration
   - Check API endpoint accessibility
   - Ensure proper domain whitelisting

5. **Function timeout errors**
   - Monitor function duration in Vercel dashboard
   - Optimize API calls and reduce processing time
   - Consider increasing `maxDuration` in `vercel.json`

### Development Issues

1. **TypeScript errors in API**
   ```bash
   # Run API type checking
   npm run typecheck:api

   # Check specific file
   npx tsc --noEmit api/spotify-token.ts
   ```

2. **Import resolution issues**
   - Verify `api/tsconfig.json` configuration
   - Check relative import paths
   - Ensure utility files exist in `utils/` directory

3. **Hot reload not working**
   ```bash
   # Restart development server
   npm run dev:api

   # Or use Vite only
   npm run dev
   ```

### API Testing Issues

1. **Test server startup fails**
   - Check port 3001 availability
   - Verify Node.js version compatibility
   - Ensure all dependencies are installed

2. **Health check fails**
   - Verify API endpoint is running
   - Check environment variables
   - Review error logs for specific issues

## 📊 Performance Benchmarks

- **API Response Time**: < 200ms for cached tokens
- **First Token Fetch**: < 2 seconds including Spotify API call
- **Rate Limit Window**: 60 seconds with 30 request limit
- **Cache Hit Rate**: > 95% for production traffic
- **Function Cold Start**: < 1 second initialization

## 🔒 Security Considerations

- **Environment Variables**: Never commit secrets to repository
- **API Keys**: Rotate Spotify credentials periodically
- **Rate Limiting**: Protects against abuse and API quota exhaustion
- **Idempotency**: Prevents duplicate operations and data corruption
- **CORS Headers**: Configured for secure cross-origin requests
- **Security Headers**: X-Frame-Options, CSP, and XSS protection enabled

## 🎯 Best Practices

1. **Use idempotency keys** for critical operations
2. **Monitor rate limits** and adjust as needed
3. **Cache tokens effectively** to reduce API calls
4. **Handle errors gracefully** with proper fallbacks
5. **Log correlation IDs** for request tracing
6. **Test locally** before deploying to production
7. **Monitor function performance** and optimize regularly

## 📚 Additional Resources

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
