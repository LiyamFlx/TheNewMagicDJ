export interface RetryOptions {
  retries?: number;
  timeoutMs?: number;
  retryOn?: number[]; // status codes to retry
  backoffBaseMs?: number; // initial delay
  backoffMaxMs?: number;  // cap
}

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
  } = opts;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (retryOn.includes(res.status) && attempt < retries) {
        const delay = Math.min(backoffBaseMs * Math.pow(2, attempt) + Math.random() * 200, backoffMaxMs);
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt >= retries) throw err;
      const delay = Math.min(backoffBaseMs * Math.pow(2, attempt) + Math.random() * 200, backoffMaxMs);
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
}

