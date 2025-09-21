// =============================================================================
// HEALTH CHECK API ENDPOINT
// =============================================================================
// Production-ready health monitoring endpoint for infrastructure monitoring

import type { VercelRequest, VercelResponse } from '@vercel/node';
import apiConfig from './config.js';
import { createSpotifyTokenManager } from '../utils/tokenCache.js';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../shared/database.types.js';
import {
  performHealthCheck,
  checkProductionReadiness,
  metrics,
  errorTracker,
  type HealthCheckConfig
} from '../utils/monitoring.js';
import { ApiLogger } from '../utils/apiUtils.js';
import { normalizeError } from '../src/utils/errors.js';

// Initialize clients for health checks
const supabase = createClient<Database>(
  apiConfig.SUPABASE_URL || '',
  apiConfig.SUPABASE_SERVICE_ROLE_KEY || ''
);

const spotifyTokenManager = createSpotifyTokenManager(
  apiConfig.SPOTIFY_CLIENT_ID,
  apiConfig.SPOTIFY_CLIENT_SECRET
);

/**
 * Health check endpoint
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Detailed health check with all services
 * GET /api/health?readiness=true - Production readiness check
 * GET /api/health?metrics=true - Include metrics summary
 */
export default async function healthHandler(req: VercelRequest, res: VercelResponse) {
  const context = ApiLogger.createContext(req);

  // Always allow health checks regardless of method
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET requests allowed' }
    });
  }

  ApiLogger.logRequest(context, 'Health check request received');

  try {
    const detailed = req.query.detailed === 'true';
    const includeReadiness = req.query.readiness === 'true';
    const includeMetrics = req.query.metrics === 'true';

    // Get Spotify token for health check (if needed)
    let spotifyToken: string | undefined;
    if (detailed) {
      try {
        spotifyToken = await spotifyTokenManager.getClientToken();
      } catch (error) {
        // Token failure will be caught in health check
        console.warn('Failed to get Spotify token for health check:', error);
      }
    }

    // Configure health check
    const healthConfig: HealthCheckConfig = {
      includeDatabase: detailed,
      includeSpotify: detailed,
      includeYouTube: detailed,
      includeProcess: true, // Always check process health
      supabaseClient: detailed ? supabase : undefined,
      spotifyToken,
      youtubeApiKey: apiConfig.YOUTUBE_API_KEY,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Perform health check
    const health = await performHealthCheck(healthConfig);

    // Basic response
    const response: any = {
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
      version: health.version,
    };

    // Add detailed checks if requested
    if (detailed) {
      response.checks = health.checks;
    } else {
      // Include summary for basic check
      response.summary = {
        total: health.checks.length,
        healthy: health.checks.filter(c => c.status === 'healthy').length,
        degraded: health.checks.filter(c => c.status === 'degraded').length,
        unhealthy: health.checks.filter(c => c.status === 'unhealthy').length,
      };
    }

    // Add production readiness if requested
    if (includeReadiness) {
      const readinessChecks = checkProductionReadiness();
      response.readiness = {
        checks: readinessChecks,
        ready: readinessChecks.every(c => c.status === 'pass'),
      };
    }

    // Add metrics if requested
    if (includeMetrics) {
      const allMetrics = metrics.getMetrics();
      const errorSummary = errorTracker.getErrorSummary();

      response.metrics = {
        collected: allMetrics.length,
        errors: errorSummary,
        recent: allMetrics.slice(-10), // Last 10 metrics
      };
    }

    // Set appropriate status code based on health
    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 200; // Still serving but with warnings
    } else if (health.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Type', 'application/json');

    ApiLogger.logRequest(context, 'Health check completed', {
      status: health.status,
      detailed,
      statusCode
    });

    return res.status(statusCode).json(response);

  } catch (error: any) {
    const normalized = normalizeError(error, {
      code: 'HEALTH_CHECK_ERROR',
      message: 'Health check failed',
    });

    ApiLogger.logError(context, normalized);

    // Track the error
    errorTracker.report(error, { endpoint: 'health' }, 'high');

    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      status: 'unhealthy',
      error: {
        code: normalized.code,
        message: normalized.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// Export for testing
export { healthHandler };

