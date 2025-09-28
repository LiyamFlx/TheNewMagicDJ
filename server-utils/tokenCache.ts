// =============================================================================
// UNIFIED TOKEN CACHING SYSTEM
// =============================================================================
// Provides centralized token management with automatic refresh for external APIs

import { fetchWithRetry } from './apiUtils.js';

export interface TokenInfo {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  tokenType?: string;
}

export interface TokenCacheOptions {
  bufferTimeMs?: number; // How early to refresh before expiry (default: 5 minutes)
  maxRetries?: number;
  retryDelayMs?: number;
}

export class TokenCache {
  private tokens = new Map<string, TokenInfo>();
  private refreshPromises = new Map<string, Promise<TokenInfo>>();
  private readonly defaultBufferMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a valid token, refreshing if necessary
   */
  async getToken(
    service: string,
    refreshFn: () => Promise<TokenInfo>,
    options: TokenCacheOptions = {}
  ): Promise<string> {
    const { bufferTimeMs = this.defaultBufferMs } = options;
    const cached = this.tokens.get(service);
    const now = Date.now();

    // Return cached token if still valid with buffer
    if (cached && cached.expiresAt > now + bufferTimeMs) {
      return cached.accessToken;
    }

    // Check if refresh is already in progress
    if (this.refreshPromises.has(service)) {
      const token = await this.refreshPromises.get(service)!;
      return token.accessToken;
    }

    // Start refresh process
    const refreshPromise = this.refreshToken(service, refreshFn, options);
    this.refreshPromises.set(service, refreshPromise);

    try {
      const token = await refreshPromise;
      return token.accessToken;
    } finally {
      this.refreshPromises.delete(service);
    }
  }

  /**
   * Refresh a token with retry logic
   */
  private async refreshToken(
    service: string,
    refreshFn: () => Promise<TokenInfo>,
    options: TokenCacheOptions
  ): Promise<TokenInfo> {
    const { maxRetries = 3, retryDelayMs = 1000 } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const token = await refreshFn();
        this.tokens.set(service, token);
        return token;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay =
          retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Token refresh failed after all retries');
  }

  /**
   * Manually set a token (useful for testing or external token sources)
   */
  setToken(service: string, token: TokenInfo): void {
    this.tokens.set(service, token);
  }

  /**
   * Clear a token from cache (force refresh on next request)
   */
  clearToken(service: string): void {
    this.tokens.delete(service);
    this.refreshPromises.delete(service);
  }

  /**
   * Get cached token info without refreshing
   */
  getCachedToken(service: string): TokenInfo | undefined {
    return this.tokens.get(service);
  }

  /**
   * Check if a token is cached and valid
   */
  isTokenValid(service: string, bufferTimeMs = this.defaultBufferMs): boolean {
    const token = this.tokens.get(service);
    return token ? token.expiresAt > Date.now() + bufferTimeMs : false;
  }
}

/**
 * Spotify-specific token management
 */
export class SpotifyTokenManager {
  private cache = new TokenCache();
  private readonly SERVICE_KEY = 'spotify_client_credentials';

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {}

  /**
   * Get a valid Spotify client credentials token
   */
  async getClientToken(): Promise<string> {
    return this.cache.getToken(
      this.SERVICE_KEY,
      () => this.fetchClientCredentialsToken(),
      { bufferTimeMs: 5 * 60 * 1000 } // 5 minute buffer
    );
  }

  /**
   * Fetch new client credentials token from Spotify
   */
  private async fetchClientCredentialsToken(): Promise<TokenInfo> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    const response = await fetchWithRetry(
      'https://accounts.spotify.com/api/token',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
      { retries: 3, timeoutMs: 10000 }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Spotify token request failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000, // Convert to milliseconds
      tokenType: data.token_type || 'Bearer',
    };
  }

  /**
   * Clear cached token (force refresh)
   */
  clearCache(): void {
    this.cache.clearToken(this.SERVICE_KEY);
  }

  /**
   * Check if current token is valid
   */
  isTokenValid(): boolean {
    return this.cache.isTokenValid(this.SERVICE_KEY);
  }

  /**
   * Get token info for debugging
   */
  getTokenInfo(): TokenInfo | undefined {
    return this.cache.getCachedToken(this.SERVICE_KEY);
  }
}

/**
 * Global token cache instances
 */
export const globalTokenCache = new TokenCache();

/**
 * Create Spotify token manager with environment variables
 */
export function createSpotifyTokenManager(
  clientId?: string,
  clientSecret?: string
): SpotifyTokenManager {
  const id = clientId || process.env.SPOTIFY_CLIENT_ID || '';
  const secret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET || '';

  return new SpotifyTokenManager(id, secret);
}

/**
 * Request batching utility for external API calls
 */
export class RequestBatcher {
  private batches = new Map<
    string,
    {
      requests: Array<{
        resolve: (value: any) => void;
        reject: (error: any) => void;
      }>;
      timeout: NodeJS.Timeout;
    }
  >();

  /**
   * Batch multiple identical requests into a single API call
   */
  async batch<T>(
    key: string,
    fn: () => Promise<T>,
    delayMs: number = 50
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let batch = this.batches.get(key);

      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(async () => {
            const currentBatch = this.batches.get(key);
            if (!currentBatch) return;

            this.batches.delete(key);

            try {
              const result = await fn();
              currentBatch.requests.forEach(req => req.resolve(result));
            } catch (error) {
              currentBatch.requests.forEach(req => req.reject(error));
            }
          }, delayMs),
        };

        this.batches.set(key, batch);
      }

      batch.requests.push({ resolve, reject });
    });
  }

  /**
   * Clear all pending batches
   */
  clear(): void {
    for (const [key, batch] of this.batches) {
      clearTimeout(batch.timeout);
      batch.requests.forEach(req => req.reject(new Error('Batch cleared')));
    }
    this.batches.clear();
  }
}

// Export singleton batcher
export const requestBatcher = new RequestBatcher();
