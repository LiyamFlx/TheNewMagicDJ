import { logger } from '../utils/logger';
import { rateLimiter } from '../utils/rateLimiter';
import { errorHandler } from '../utils/errorHandler';
import { RecognitionResult } from '../types';

interface AudDResponse {
  status: string;
  result?: {
    artist?: string;
    title?: string;
    album?: string;
    release_date?: string;
    label?: string;
    timecode?: string;
    song_link?: string;
    apple_music?: {
      previews?: Array<{
        url: string;
      }>;
    };
    spotify?: {
      external_urls?: {
        spotify: string;
      };
      preview_url?: string;
      id?: string;
    };
  };
}

class AudDService {
  private apiToken: string;
  private baseUrl = 'https://api.audd.io/';

  constructor() {
    this.apiToken = import.meta.env.VITE_AUDD_API_TOKEN;
    // Be quiet in constructor; only warn when used and missing
    if (!this.apiToken) {
      logger.debug('AudDService', 'API token not configured');
    }
  }

  async recognizeAudio(audioData: string | File): Promise<RecognitionResult | null> {
    return logger.trackOperation(
      'AudDService',
      'recognizeAudio',
      async () => {
        if (!this.apiToken) {
          throw errorHandler.createAuthError('AudD');
        }

        // Check rate limit
        const limitCheck = await rateLimiter.checkLimit('audd');
        if (!limitCheck.allowed) {
          const error = errorHandler.createRateLimitError('AudD', limitCheck.retryAfter || 12000);
          errorHandler.handleError(error);
          throw new Error(error.message);
        }

        const formData = new FormData();
        formData.append('api_token', this.apiToken);
        formData.append('return', 'apple_music,spotify');

        if (typeof audioData === 'string') {
          // Base64 audio data
          formData.append('audio', audioData);
        } else {
          // File object
          formData.append('file', audioData);
        }

        const startTime = Date.now();

        try {
          const response = await fetch(this.baseUrl, {
            method: 'POST',
            body: formData
          });

          const responseTime = Date.now() - startTime;
          logger.trackAPICall('audd', 'recognize', responseTime, response.ok);

          if (!response.ok) {
            const error = errorHandler.createAPIError('AudD', 'recognize', response.status, response.statusText);
            errorHandler.handleError(error);
            throw new Error(error.message);
          }

          const data: AudDResponse = await response.json();

          if (data.status !== 'success' || !data.result) {
            logger.info('AudDService', 'No recognition results found');
            return null;
          }

          const result = data.result;
          const recognition: RecognitionResult = {
            title: result.title || 'Unknown Title',
            artist: result.artist || 'Unknown Artist',
            album: result.album,
            confidence: 0.8, // AudD doesn't provide confidence scores
            preview_url: result.spotify?.preview_url || result.apple_music?.previews?.[0]?.url,
            spotify_id: result.spotify?.id
          };

          logger.info('AudDService', 'Track recognized successfully', {
            title: recognition.title,
            artist: recognition.artist,
            hasPreview: !!recognition.preview_url
          });

          return recognition;

        } catch (error) {
          const responseTime = Date.now() - startTime;
          logger.trackAPICall('audd', 'recognize', responseTime, false);

          if (error instanceof TypeError && error.message.includes('fetch')) {
            const networkError = errorHandler.createNetworkError('AudD recognition');
            errorHandler.handleError(networkError);
            throw new Error(networkError.message);
          }

          throw error;
        }
      },
      { 
        audioType: typeof audioData === 'string' ? 'base64' : 'file',
        audioSize: typeof audioData === 'string' ? audioData.length : audioData.size
      }
    );
  }

  isConfigured(): boolean {
    return !!this.apiToken;
  }

  getRemainingRequests(): number {
    return rateLimiter.getRemainingRequests('audd');
  }
}

export const auddService = new AudDService();
