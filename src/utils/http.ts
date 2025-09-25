export interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
  retryOn?: number[]; // status codes to retry
  backoffBaseMs?: number; // initial delay
  backoffMaxMs?: number; // cap
  budget?: number; // max total time to spend on retries
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

class CircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private readonly failureThreshold = 5;
  private readonly recoveryTimeMs = 30000; // 30 seconds

  private getKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  private getState(key: string): CircuitBreakerState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
      });
    }
    return this.states.get(key)!;
  }

  canExecute(url: string): boolean {
    const key = this.getKey(url);
    const state = this.getState(key);
    const now = Date.now();

    if (state.state === 'closed') {
      return true;
    }

    if (state.state === 'open') {
      if (now - state.lastFailureTime > this.recoveryTimeMs) {
        state.state = 'half-open';
        return true;
      }
      return false;
    }

    // half-open: allow one request
    return true;
  }

  onSuccess(url: string): void {
    const key = this.getKey(url);
    const state = this.getState(key);
    state.failures = 0;
    state.state = 'closed';
  }

  onFailure(url: string): void {
    const key = this.getKey(url);
    const state = this.getState(key);
    state.failures++;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.failureThreshold) {
      state.state = 'open';
    }
  }
}

const circuitBreaker = new CircuitBreaker();

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 12000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<Response> {
  const {
    retries = 2,
    timeoutMs = 12000,
    retryOn = [429, 500, 502, 503, 504],
    backoffBaseMs = 400,
    backoffMaxMs = 4000,
    budget = 30000, // 30 second max budget
  } = opts;

  const url = typeof input === 'string' ? input : input.toString();
  const startTime = Date.now();

  // Check circuit breaker
  if (!circuitBreaker.canExecute(url)) {
    throw new Error(`Circuit breaker open for ${url}`);
  }

  let attempt = 0;

  while (true) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);

      if (res.ok) {
        circuitBreaker.onSuccess(url);
      } else {
        circuitBreaker.onFailure(url);
      }

      if (retryOn.includes(res.status) && attempt < retries) {
        // Check budget before retrying
        const elapsed = Date.now() - startTime;
        if (elapsed >= budget) {
          throw new Error('Retry budget exceeded');
        }

        const jitter = Math.random() * 200; // Add jitter
        const delay = Math.min(
          backoffBaseMs * Math.pow(2, attempt) + jitter,
          backoffMaxMs
        );
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      return res;
    } catch (err: any) {
      circuitBreaker.onFailure(url);

      if (attempt >= retries) throw err;

      // Check budget before retrying
      const elapsed = Date.now() - startTime;
      if (elapsed >= budget) {
        throw new Error('Retry budget exceeded');
      }

      const jitter = Math.random() * 200; // Add jitter
      const delay = Math.min(
        backoffBaseMs * Math.pow(2, attempt) + jitter,
        backoffMaxMs
      );
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}
