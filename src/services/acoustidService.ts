import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';
import { errorHandler } from '../utils/errorHandler';
import { RecognitionResult } from '../types';
import { fetchWithRetry } from '../utils/http';

interface AcoustIDResponse {
  status: string;
  results?: Array<{
    score: number;
    id: string;
    recordings?: Array<{
      id: string;
      title?: string;
      artists?: Array<{
        name: string;
      }>;
      releases?: Array<{
        title: string;
        date?: {
          year: number;
        };
      }>;
      duration?: number;
    }>;
  }>;
}

class AcoustIDService {
  private apiKey: string;
  private baseUrl = 'https://api.acoustid.org/v2/lookup';

  constructor() {
    this.apiKey = import.meta.env.VITE_ACOUSTID_API_KEY;
    // Be quiet in constructor; only warn when used and missing
    if (!this.apiKey) {
      logger.debug('AcoustIDService', 'API key not configured');
    }
  }

  async recognizeFingerprint(fingerprint: string, duration: number): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'AcoustIDService',
      'recognizeFingerprint',
      async () => {
        // Validate fingerprint format - AcoustID fingerprints should be much longer
        if (!fingerprint || fingerprint.length < 20) {
          logger.warn('AcoustIDService', 'Invalid fingerprint format, skipping AcoustID lookup', {
            fingerprintLength: fingerprint?.length || 0,
            duration
          });
          return null;
        }

        const useProxy = !this.apiKey;

        // Check rate limit
        const limitCheck = await rateLimiter.checkLimit('acoustid');
        if (!limitCheck.allowed) {
          const error = errorHandler.createRateLimitError('AcoustID', limitCheck.retryAfter || 20000);
          errorHandler.handleError(error);
          throw new Error(error.message);
        }

        const params = new URLSearchParams({
          meta: 'recordings+releasegroups+compress',
          fingerprint,
          duration: duration.toString(),
          format: 'json'
        });
        if (this.apiKey) params.set('client', this.apiKey);

        const startTime = Date.now();

        try {
          const url = useProxy ? `/api/acoustid?${new URLSearchParams({ fingerprint, duration: duration.toString() }).toString()}` : `${this.baseUrl}?${params.toString()}`;
          const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'MagicDJ/1.0'
            }
          }, { timeoutMs: 15000, retries: 2 });

          const responseTime = Date.now() - startTime;
          logger.trackAPICall('acoustid', 'lookup', responseTime, response.ok);

          if (!response.ok) {
            const error = errorHandler.createAPIError('AcoustID', 'lookup', response.status, response.statusText);
            errorHandler.handleError(error);
            throw new Error(error.message);
          }

          const data: AcoustIDResponse = await response.json();

          if (data.status !== 'ok' || !data.results || data.results.length === 0) {
            logger.info('AcoustIDService', 'No recognition results found');
            return null;
          }

          // Find the best match
          const bestResult = data.results
            .filter(result => result.recordings && result.recordings.length > 0)
            .sort((a, b) => b.score - a.score)[0];

          if (!bestResult || !bestResult.recordings) {
            return null;
          }

          const recording = bestResult.recordings[0];
          const artist = recording.artists?.[0]?.name || 'Unknown Artist';
          const title = recording.title || 'Unknown Title';
          const album = recording.releases?.[0]?.title;

          const result: RecognitionResult = {
            title,
            artist,
            album,
            confidence: bestResult.score,
            duration: recording.duration
          };

          logger.info('AcoustIDService', 'Track recognized successfully', {
            title,
            artist,
            confidence: bestResult.score
          });

          return result;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('acoustid', 'lookup', responseTime, false);

          if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = errorHandler.createNetworkError('AcoustID recognition');
            errorHandler.handleError(networkError);
            throw new Error(networkError.message);
          }

          throw error;
        }
      },
      { fingerprintLength: fingerprint.length, duration }
    );
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getRemainingRequests(): number {
    return rateLimiter.getRemainingRequests('acoustid');
  }
}

export const acoustidService = new AcoustIDService();
