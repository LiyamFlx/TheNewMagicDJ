/**
 * SECURE SUPABASE CLIENT CONFIGURATION
 * Centralized, hardened client for production use
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared/database.types';

// Environment validation with fail-fast approach
const requiredEnvVars = {
  url: process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// Validate environment variables
function validateEnvironment() {
  const missing = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value && key !== 'serviceKey') // Service key is optional
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required Supabase environment variables: ${missing.join(', ')}`);
  }

  // Validate URL format
  if (requiredEnvVars.url && !requiredEnvVars.url.startsWith('https://')) {
    throw new Error('Supabase URL must use HTTPS in production');
  }
}

// Validate once on module load
validateEnvironment();

/**
 * PRODUCTION-HARDENED CLIENT FACTORY
 * Creates secure Supabase clients with proper authentication handling
 */
export class SecureSupabaseClient {
  private static clientCache = new Map<string, SupabaseClient<Database>>();

  /**
   * Get client for frontend/authenticated operations
   * Uses anon key with user JWT token
   */
  static getClient(userToken?: string): SupabaseClient<Database> {
    const cacheKey = `client:${userToken || 'anon'}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = createClient<Database>(
        requiredEnvVars.url!,
        requiredEnvVars.anonKey!,
        {
          auth: {
            autoRefreshToken: !!userToken,
            persistSession: !!userToken,
            detectSessionInUrl: false,
            storage: typeof window !== 'undefined' && userToken ? window.localStorage : undefined,
            storageKey: 'sb-auth-token',
            debug: process.env.NODE_ENV === 'development',
            flowType: 'pkce',
          },
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              'x-application-name': 'MagicDJ',
              'x-client-type': 'authenticated',
            },
          },
          // Security configurations
          realtime: {
            params: {
              eventsPerSecond: 10, // Rate limiting
            },
          },
        }
      );

      // Set user session if token provided
      if (userToken) {
        client.auth.setSession({
          access_token: userToken,
          refresh_token: '', // Will be handled by client
        });
      }

      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Get admin client for server-side operations
   * Uses service role key with elevated permissions
   */
  static getAdminClient(): SupabaseClient<Database> {
    if (!requiredEnvVars.serviceKey) {
      throw new Error('Service role key required for admin operations');
    }

    const cacheKey = 'admin:service';

    if (!this.clientCache.has(cacheKey)) {
      const client = createClient<Database>(
        requiredEnvVars.url!,
        requiredEnvVars.serviceKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
          },
          db: {
            schema: 'public',
          },
          global: {
            headers: {
              'x-application-name': 'MagicDJ',
              'x-client-type': 'service-role',
            },
          },
        }
      );

      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Get server client with user context
   * For API routes that need to act on behalf of a user
   */
  static getServerClient(authHeader?: string): SupabaseClient<Database> {
    // Extract token from Authorization header
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (token) {
      return this.getClient(token);
    }

    // Fallback to service role for server operations
    return this.getAdminClient();
  }

  /**
   * Clear all cached clients (for testing or cleanup)
   */
  static clearCache(): void {
    this.clientCache.clear();
  }
}

/**
 * SECURE OPERATIONS HELPERS
 * Type-safe database operations with built-in security
 */
export class SecureOperations {
  /**
   * Verify user has access to playlist
   */
  static async verifyPlaylistAccess(
    client: SupabaseClient<Database>,
    playlistId: string,
    userId: string
  ): Promise<boolean> {
    const { data, error } = await client
      .from('playlists')
      .select('user_id')
      .eq('id', playlistId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === userId;
  }

  /**
   * Sanitize user input for database operations
   */
  static sanitizeInput(input: string, maxLength = 255): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>\"'&]/g, '') // Remove dangerous characters
      .replace(/script/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

// Export singleton instances for convenience
export const supabaseClient = SecureSupabaseClient.getClient();
export const supabaseAdmin = SecureSupabaseClient.getAdminClient();

// Export for server-side use
export { SecureSupabaseClient as default };