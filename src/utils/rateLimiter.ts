interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Initialize rate limits from environment
    this.configs.set('spotify', {
      maxRequests: parseInt(import.meta.env.VITE_SPOTIFY_RATE_LIMIT) || 50,
      windowMs: 60000, // 1 minute
      retryAfterMs: 5000
    });

    this.configs.set('acoustid', {
      maxRequests: parseInt(import.meta.env.VITE_ACOUSTID_RATE_LIMIT) || 3,
      windowMs: 60000, // 1 minute
      retryAfterMs: 20000
    });

    this.configs.set('audd', {
      maxRequests: parseInt(import.meta.env.VITE_AUDD_RATE_LIMIT) || 5,
      windowMs: 60000, // 1 minute
      retryAfterMs: 12000
    });

    this.configs.set('lastfm', {
      maxRequests: 50,
      windowMs: 60000,
      retryAfterMs: 5000
    });

    this.configs.set('youtube', {
      maxRequests: 100,
      windowMs: 60000,
      retryAfterMs: 3000
    });

    this.configs.set('gemini', {
      maxRequests: 60,
      windowMs: 60000,
      retryAfterMs: 2000
    });
  }

  async checkLimit(service: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = this.configs.get(service);
    if (!config) {
      return { allowed: true };
    }

    const now = Date.now();
    const entry = this.limits.get(service);

    if (!entry || now >= entry.resetTime) {
      // Reset or initialize
      this.limits.set(service, {
        count: 1,
        resetTime: now + config.windowMs,
        blocked: false
      });
      return { allowed: true };
    }

    if (entry.blocked && now < entry.resetTime) {
      return { 
        allowed: false, 
        retryAfter: entry.resetTime - now 
      };
    }

    if (entry.count >= config.maxRequests) {
      entry.blocked = true;
      return { 
        allowed: false, 
        retryAfter: config.retryAfterMs || (entry.resetTime - now)
      };
    }

    entry.count++;
    return { allowed: true };
  }

  async waitForLimit(service: string): Promise<void> {
    const check = await this.checkLimit(service);
    if (!check.allowed && check.retryAfter) {
      await new Promise(resolve => setTimeout(resolve, check.retryAfter));
      return this.waitForLimit(service); // Recursive check
    }
  }

  getRemainingRequests(service: string): number {
    const config = this.configs.get(service);
    const entry = this.limits.get(service);
    
    if (!config || !entry) {
      return config?.maxRequests || Infinity;
    }

    return Math.max(0, config.maxRequests - entry.count);
  }

  getResetTime(service: string): number | null {
    const entry = this.limits.get(service);
    return entry ? entry.resetTime : null;
  }

  reset(service?: string): void {
    if (service) {
      this.limits.delete(service);
    } else {
      this.limits.clear();
    }
  }
}

export const rateLimiter = new RateLimiter();