#!/usr/bin/env node

import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_PORT = 3001;
const BASE_URL = `http://localhost:${TEST_PORT}`;

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  duration?: number;
}

class SpotifyTokenTester {
  private results: TestResult[] = [];
  private server: any = null;

  async startTestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Import the handler dynamically
      import('../../api/spotify-token.ts')
        .then((module) => {
          const handler = module.default;

          this.server = createServer(async (req, res) => {
            // Convert Node.js request/response to Vercel format
            const vercelReq = {
              ...req,
              headers: req.headers,
              method: req.method,
              url: req.url,
              body: {},
              query: new URLSearchParams(req.url?.split('?')[1] || ''),
            };

            const vercelRes = {
              status: (code: number) => {
                res.statusCode = code;
                return vercelRes;
              },
              json: (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data, null, 2));
              },
              setHeader: (name: string, value: string) => {
                res.setHeader(name, value);
              }
            };

            try {
              await handler(vercelReq as any, vercelRes as any);
            } catch (error) {
              console.error('Handler error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal server error' }));
            }
          });

          this.server.listen(TEST_PORT, () => {
            console.log(`🧪 Test server running on ${BASE_URL}`);
            resolve();
          });

          this.server.on('error', reject);
        })
        .catch(reject);
    });
  }

  async stopTestServer(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, status: 'PASS', duration });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        duration
      });
      console.log(`❌ ${name} (${duration}ms): ${error instanceof Error ? error.message : error}`);
    }
  }

  async testHealthCheck(): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/spotify-token?health=true`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Health check returned unhealthy status');
    }

    console.log(`   Health check response:`, data);
  }

  async testTokenRequest(): Promise<void> {
    const response = await fetch(`${BASE_URL}/api/spotify-token`);

    // Should either return 200 with token or 503 if credentials missing
    if (response.status === 200) {
      const data = await response.json();

      if (!data.access_token || !data.token_type) {
        throw new Error('Token response missing required fields');
      }

      console.log(`   Token received: ${data.token_type} ${data.access_token.substring(0, 10)}...`);
      console.log(`   Expires in: ${data.expires_in} seconds`);
    } else if (response.status === 503) {
      const data = await response.json();
      console.log(`   Service unavailable (expected): ${data.error?.message}`);
    } else {
      throw new Error(`Unexpected status: ${response.status} ${response.statusText}`);
    }
  }

  async testRateLimit(): Promise<void> {
    console.log(`   Testing rate limiting...`);

    const requests = [];
    const startTime = Date.now();

    // Send 5 concurrent requests
    for (let i = 0; i < 5; i++) {
      requests.push(fetch(`${BASE_URL}/api/spotify-token`));
    }

    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    // All should succeed or fail gracefully
    for (const response of responses) {
      if (![200, 503, 429].includes(response.status)) {
        throw new Error(`Unexpected rate limit response: ${response.status}`);
      }
    }

    console.log(`   ${requests.length} concurrent requests completed in ${duration}ms`);
  }

  async testIdempotency(): Promise<void> {
    const idempotencyKey = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response1 = await fetch(`${BASE_URL}/api/spotify-token`, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    const response2 = await fetch(`${BASE_URL}/api/spotify-token`, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });

    if (response1.status !== response2.status) {
      throw new Error('Idempotent requests returned different status codes');
    }

    console.log(`   Idempotency key: ${idempotencyKey}`);
    console.log(`   Both requests returned: ${response1.status}`);
  }

  async testErrorHandling(): Promise<void> {
    // Test with invalid idempotency key
    const response = await fetch(`${BASE_URL}/api/spotify-token`, {
      headers: {
        'Idempotency-Key': 'short'  // Too short, should be 16-255 chars
      }
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400 for invalid idempotency key, got ${response.status}`);
    }

    const data = await response.json();
    console.log(`   Invalid idempotency key handled: ${data.error}`);
  }

  printSummary(): void {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log('\n📊 Test Summary:');
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
    }

    const success = failed === 0;
    console.log(`\n${success ? '✅' : '❌'} Tests ${success ? 'PASSED' : 'FAILED'}`);

    if (!success) {
      process.exit(1);
    }
  }
}

// Main test runner
async function main() {
  console.log('🚀 Starting Spotify Token API Tests...\n');

  const tester = new SpotifyTokenTester();

  try {
    await tester.startTestServer();

    await tester.runTest('Health Check', () => tester.testHealthCheck());
    await tester.runTest('Token Request', () => tester.testTokenRequest());
    await tester.runTest('Rate Limiting', () => tester.testRateLimit());
    await tester.runTest('Idempotency', () => tester.testIdempotency());
    await tester.runTest('Error Handling', () => tester.testErrorHandling());

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  } finally {
    await tester.stopTestServer();
    tester.printSummary();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}