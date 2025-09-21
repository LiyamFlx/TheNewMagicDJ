interface IdempotencyRecord {
  key: string;
  response: any;
  timestamp: number;
  expiresAt: number;
}

class IdempotencyManager {
  private cache = new Map<string, IdempotencyRecord>();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Clean expired entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.cache.entries()) {
      if (record.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  generateKey(request: Request, body?: any): string {
    const url = new URL(request.url);
    const method = request.method;
    const bodyStr = body ? JSON.stringify(body) : '';
    // Use a Node-safe base64 when window.btoa is unavailable
    const base64 =
      typeof window === 'undefined'
        ? Buffer.from(bodyStr).toString('base64')
        : btoa(bodyStr);
    return `${method}:${url.pathname}:${base64}`;
  }

  store(key: string, response: any): void {
    const now = Date.now();
    this.cache.set(key, {
      key,
      response,
      timestamp: now,
      expiresAt: now + this.TTL_MS,
    });
  }

  retrieve(key: string): any | null {
    const record = this.cache.get(key);
    if (!record) return null;

    if (record.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return record.response;
  }

  isValidKey(key: string): boolean {
    return Boolean(key && key.length >= 16 && key.length <= 255);
  }
}

export const idempotencyManager = new IdempotencyManager();

export function withIdempotency(handler: (req: any, res: any) => Promise<any>) {
  return async (req: any, res: any): Promise<any> => {
    const idempotencyKey =
      req.headers['idempotency-key'] || req.headers['Idempotency-Key'];

    if (!idempotencyKey) {
      return handler(req, res);
    }

    if (!idempotencyManager.isValidKey(idempotencyKey)) {
      return res.status(400).json({
        error: 'Invalid Idempotency-Key header. Must be 16-255 characters.',
      });
    }

    // Check for existing response
    const existingResponse = idempotencyManager.retrieve(idempotencyKey);
    if (existingResponse) {
      return res.status(existingResponse.status).json(existingResponse.body);
    }

    // Execute handler and capture response
    const originalJson = res.json;
    const originalStatus = res.status;
    let capturedStatus = 200;

    res.status = function (code: number) {
      capturedStatus = code;
      return originalStatus.call(this, code);
    };

    res.json = function (body: any) {
      idempotencyManager.store(idempotencyKey, {
        status: capturedStatus,
        body,
      });
      return originalJson.call(this, body);
    };

    return handler(req, res);
  };
}
