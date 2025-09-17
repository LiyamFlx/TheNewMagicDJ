# 🤖 QA Validation Test Suite

## Overview

This test suite provides comprehensive CI/CD quality assurance for the MagicDJ platform, implementing NASA-style reliability validation across 10 critical quality gates.

## Test Categories

### 🔒 Critical Quality Gates

1. **CORS & External Resources** - Validates no external audio dependencies cause CORS failures
2. **React & Runtime Stability** - Ensures no React error #300 crashes or infinite loops
3. **Degraded / Demo Mode** - Verifies graceful fallback when APIs are unavailable
4. **Audio Playback** - Tests local WAV generation and AudioContext handling
5. **User Experience Flow** - Validates core navigation and UI responsiveness
6. **API Health Checks** - Tests Spotify token API and error handling
7. **Performance Validation** - Monitors load times and bundle sizes
8. **Deployment Protection** - Verifies Vercel bypass token functionality
9. **Security Validation** - Checks for environment variable leaks
10. **Regression Guardrails** - Prevents known issues from reoccurring

## Running Tests

### Quick Commands

```bash
# Run all QA validation tests
npm run test:qa

# Run with browser UI (for debugging)
npm run test:qa:headed

# Install Playwright browsers (first time setup)
npm run test:install
npm run test:install-deps

# Debug specific test
npm run test:e2e:debug
```

### Environment Variables

```bash
# Required for deployment protection bypass
VERCEL_URL=https://your-deployment.vercel.app
VERCEL_BYPASS_TOKEN=your-bypass-token

# Optional API keys for enhanced validation
SPOTIFY_CLIENT_ID=your-spotify-client-id
VITA_SPOTIFY_CLIENT_ID=fallback-spotify-client-id
```

## Test Configuration

### Playwright Config (`playwright.config.ts`)

- **Multi-browser testing**: Chrome, Firefox, Safari, Mobile
- **Retry strategy**: 2 retries on CI, 0 locally
- **Timeouts**: 60s global, 30s navigation, 10s actions
- **Artifacts**: Screenshots, videos, traces on failure
- **Reporters**: HTML, JSON, GitHub annotations

### CI/CD Integration

The test suite runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

Results are posted as PR comments with pass/fail status and detailed artifact links.

## Test Patterns

### Vercel Deployment Protection Bypass

```typescript
const navigateWithBypass = async (page: Page, path: string = '') => {
  const url = BYPASS_TOKEN
    ? `${BASE_URL}${path}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS_TOKEN}`
    : `${BASE_URL}${path}`;

  await page.goto(url, { waitUntil: 'networkidle' });
};
```

### Error Tracking Pattern

```typescript
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  (page as any).errors = errors;
});
```

### Network Request Monitoring

```typescript
page.on('request', request => {
  const url = request.url();
  if (url.includes('.mp3') || url.includes('.wav')) {
    audioRequests.push(url);
  }
});
```

## Debugging Failed Tests

### 1. View Test Results

Download the `qa-validation-results` artifact from GitHub Actions:
- `test-results/` - Screenshots and videos
- `playwright-report/` - HTML report with detailed traces
- `playwright-report.json` - Machine-readable results

### 2. Run Tests Locally

```bash
# Run with headed browser to see what's happening
npm run test:qa:headed

# Debug specific failing test
npx playwright test --grep "CORS & External Resources" --debug
```

### 3. Common Issues

**CORS Failures**: External audio URLs blocked by browser security
- ✅ Solution: All audio uses local WAV fallback (`preview_url: undefined`)

**React Error #300**: Rapid state updates from cascading failures
- ✅ Solution: Proper error boundaries and cleanup

**API 401/503 Errors**: Deployment protection or missing credentials
- ✅ Solution: Graceful degradation with demo mode indicators

**AudioContext Suspended**: Browser requires user interaction
- ✅ Solution: "Tap to unmute" overlay with proper resume handling

## Test Maintenance

### Adding New Tests

1. Follow the existing pattern with `@qa-validation` tag
2. Use `test.step()` for clear test breakdown
3. Include proper error tracking and assertions
4. Test both success and failure scenarios

### Updating Quality Gates

When adding new features, ensure tests cover:
- Error handling and graceful degradation
- Performance impact (bundle size, load time)
- Security considerations (no credential leaks)
- Browser compatibility across all test browsers

## Performance Benchmarks

- **Page Load**: < 10 seconds for first load
- **Bundle Size**: < 3 assets over 1MB
- **Error Rate**: < 1 error per second (no infinite loops)
- **API Timeouts**: Graceful handling within 30s navigation timeout

## Security Validation

- No environment variables leaked in page source
- No credential exposure in console logs
- Proper handling of external resource blocking
- Secure authentication token handling