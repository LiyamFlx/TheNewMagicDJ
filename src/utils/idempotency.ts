interface IdempotencyRecord {
  key: string;
  response: any;
  timestamp: number;
  expiresAt: number;
}

// Shared storage adapter interface
interface StorageAdapter {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
}

class MemoryAdapter implements StorageAdapter {
  private cache = new Map<string, IdempotencyRecord>();
  async get(key: string): Promise<any | null> {
    const rec = this.cache.get(key);
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return rec.response;
  }
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    this.cache.set(key, {
      key,
      response: value,
      timestamp: now,
      expiresAt: now + ttlSeconds * 1000,
    });
  }
}

class KvAdapter implements StorageAdapter {
  constructor(_ttlSeconds: number) {}
  async get(key: string): Promise<any | null> {
    const { kv } = await import('../../utils/kv.js');
    const raw = await kv.get(`idem:${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const { kv } = await import('../../utils/kv.js');
    await kv.setex(`idem:${key}`, ttlSeconds, JSON.stringify(value));
  }
}

class IdempotencyManager {
  private readonly TTL_SECONDS = 24 * 60 * 60; // 24 hours
  private adapter: StorageAdapter;

  constructor() {
    // Choose adapter based on env
    if (process.env.DURABLE_STORE_URL && process.env.DURABLE_STORE_TOKEN) {
      this.adapter = new KvAdapter(this.TTL_SECONDS);
    } else {
      this.adapter = new MemoryAdapter();
      // In-memory cleanup loop (browser only or long-lived)
      if (typeof window !== 'undefined') {
        setInterval(() => this.cleanup?.(), 60 * 60 * 1000);
      }
    }
  }

  private cleanup?(): void;

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

  async store(key: string, response: any): Promise<void> {
    await this.adapter.set(key, response, this.TTL_SECONDS);
  }

  async retrieve(key: string): Promise<any | null> {
    return this.adapter.get(key);
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
    const existingResponse = await idempotencyManager.retrieve(idempotencyKey);
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
      // Fire and forget; do not block response
      Promise.resolve(idempotencyManager.store(idempotencyKey, {
        status: capturedStatus,
        body,
      })).catch(() => {});
      return originalJson.call(this, body);
    };

    return handler(req, res);
  };
}
