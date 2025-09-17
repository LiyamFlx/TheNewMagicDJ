import { Track } from '../types/index';
import config from '../config';

export type AudioSourceType = 'proxy' | 'youtube' | 'demo';

export interface AudioSource {
  type: AudioSourceType;
  url: string;
  title?: string;
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface AudioSourceHealth {
  type: AudioSourceType;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailure?: Date;
  successRate: number;
  avgResponseTime: number;
}

interface CircuitBreaker {
  isOpen: boolean;
  openedAt?: Date;
  failureCount: number;
  readonly failureThreshold: number;
  readonly recoveryTimeoutMs: number;
}

interface SourceMetrics {
  totalRequests: number;
  successfulRequests: number;
  totalResponseTime: number;
  recentFailures: Date[];
}

class AudioSourceService {
  private readonly CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RECOVERY_TIMEOUT = 30000; // 30 seconds
  private readonly RECENT_FAILURES_WINDOW = 300000; // 5 minutes

  private circuitBreakers = new Map<AudioSourceType, CircuitBreaker>();
  private sourceMetrics = new Map<AudioSourceType, SourceMetrics>();
  private sourceHealthCache = new Map<AudioSourceType, AudioSourceHealth>();

  // Royalty-free audio sources for different genres/moods
  private readonly royaltyFreeSources = [
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  ];

  constructor() {
    this.initializeCircuitBreakers();
    this.startHealthMonitoring();
  }

  private initializeCircuitBreakers(): void {
    const types: AudioSourceType[] = ['proxy', 'youtube', 'demo'];

    types.forEach(type => {
      this.circuitBreakers.set(type, {
        isOpen: false,
        failureCount: 0,
        failureThreshold: this.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        recoveryTimeoutMs: this.CIRCUIT_BREAKER_RECOVERY_TIMEOUT
      });

      this.sourceMetrics.set(type, {
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
        recentFailures: []
      });
    });
  }

  private startHealthMonitoring(): void {
    // Update health metrics every minute
    setInterval(() => {
      this.updateHealthMetrics();
    }, 60000);
  }

  private updateHealthMetrics(): void {
    const now = Date.now();

    this.sourceMetrics.forEach((metrics, sourceType) => {
      // Clean up old failures
      metrics.recentFailures = metrics.recentFailures.filter(
        failureTime => now - failureTime.getTime() < this.RECENT_FAILURES_WINDOW
      );

      // Calculate health metrics
      const successRate = metrics.totalRequests > 0
        ? metrics.successfulRequests / metrics.totalRequests
        : 1;

      const avgResponseTime = metrics.successfulRequests > 0
        ? metrics.totalResponseTime / metrics.successfulRequests
        : 0;

      const circuitBreaker = this.circuitBreakers.get(sourceType)!;
      const isHealthy = !circuitBreaker.isOpen &&
                       metrics.recentFailures.length < this.CIRCUIT_BREAKER_FAILURE_THRESHOLD;

      this.sourceHealthCache.set(sourceType, {
        type: sourceType,
        isHealthy,
        consecutiveFailures: circuitBreaker.failureCount,
        lastFailure: metrics.recentFailures.length > 0
          ? metrics.recentFailures[metrics.recentFailures.length - 1]
          : undefined,
        successRate,
        avgResponseTime
      });
    });
  }

  private async recordSuccess(sourceType: AudioSourceType, responseTime: number): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(sourceType)!;
    const metrics = this.sourceMetrics.get(sourceType)!;

    // Reset circuit breaker on success
    circuitBreaker.failureCount = 0;
    circuitBreaker.isOpen = false;
    circuitBreaker.openedAt = undefined;

    // Update metrics
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.totalResponseTime += responseTime;
  }

  private async recordFailure(sourceType: AudioSourceType, error: Error): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(sourceType)!;
    const metrics = this.sourceMetrics.get(sourceType)!;

    // Update circuit breaker
    circuitBreaker.failureCount++;
    if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
      circuitBreaker.isOpen = true;
      circuitBreaker.openedAt = new Date();
    }

    // Update metrics
    metrics.totalRequests++;
    metrics.recentFailures.push(new Date());

    console.error(`AudioSourceService: ${sourceType} source failed:`, error);
  }

  private isCircuitBreakerOpen(sourceType: AudioSourceType): boolean {
    const circuitBreaker = this.circuitBreakers.get(sourceType)!;

    if (!circuitBreaker.isOpen) {
      return false;
    }

    // Check if recovery timeout has passed
    if (circuitBreaker.openedAt) {
      const timeSinceOpened = Date.now() - circuitBreaker.openedAt.getTime();
      if (timeSinceOpened >= circuitBreaker.recoveryTimeoutMs) {
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        circuitBreaker.openedAt = undefined;
        return false;
      }
    }

    return true;
  }

  async getAudioSourcesForTrack(track: Track): Promise<AudioSource[]> {
    const sources: AudioSource[] = [];

    // 1. Proxy source (highest priority)
    if (!this.isCircuitBreakerOpen('proxy')) {
      const proxySource = await this.getProxySource(track);
      if (proxySource) {
        sources.push(proxySource);
      }
    }

    // 2. YouTube source (medium priority)
    if (!this.isCircuitBreakerOpen('youtube')) {
      const youtubeSource = await this.getYouTubeSource(track);
      if (youtubeSource) {
        sources.push(youtubeSource);
      }
    }

    // 3. Demo source (always available as fallback)
    if (!this.isCircuitBreakerOpen('demo')) {
      const demoSource = this.getDemoSource(track);
      sources.push(demoSource);
    }

    return sources;
  }

  private async getProxySource(track: Track): Promise<AudioSource | null> {
    const startTime = Date.now();

    try {
      // For now, use royalty-free sources
      // In production, you'd integrate with music libraries or user uploads
      const randomSource = this.royaltyFreeSources[
        Math.floor(Math.random() * this.royaltyFreeSources.length)
      ];

      const proxyUrl = `${config.API_BASE_URL}/api/proxy-audio?url=${encodeURIComponent(randomSource)}`;

      // Test if the proxy source is reachable
      const response = await fetch(proxyUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Proxy source returned ${response.status}`);
      }

      await this.recordSuccess('proxy', Date.now() - startTime);

      return {
        type: 'proxy',
        url: proxyUrl,
        title: track.title,
        duration: track.duration,
        quality: 'high',
        metadata: {
          originalUrl: randomSource,
          proxied: true
        }
      };

    } catch (error) {
      await this.recordFailure('proxy', error as Error);
      return null;
    }
  }

  private async getYouTubeSource(track: Track): Promise<AudioSource | null> {
    const startTime = Date.now();

    try {
      // Search for the track on YouTube
      const searchQuery = `${track.artist} ${track.title}`.trim();

      // For now, return a placeholder YouTube embed URL
      // In production, you'd use YouTube Data API to search and get actual video IDs
      const videoId = 'dQw4w9WgXcQ'; // Placeholder video ID
      const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;

      await this.recordSuccess('youtube', Date.now() - startTime);

      return {
        type: 'youtube',
        url: embedUrl,
        title: track.title,
        duration: track.duration,
        quality: 'medium',
        metadata: {
          videoId,
          searchQuery,
          embed: true
        }
      };

    } catch (error) {
      await this.recordFailure('youtube', error as Error);
      return null;
    }
  }

  private getDemoSource(track: Track): AudioSource {
    // Generate deterministic demo audio using Web Audio API compatible data URI
    // This creates a silent audio file that will work as a fallback
    const silentAudioDataUri = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEeBDKJ0fPOgzEHIHjJ+tycRw0UW7zv85xrGw5UqObsu2AcBjSO2OzNeSsFJHPN7tmSPwhGn+J+t2ApDS+5vG0t";

    // Track ID-based deterministic properties for demo consistency
    const trackHash = Math.abs(track.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
    const demoIndex = (trackHash % 5) + 1;
    const demoBpm = 120 + ((trackHash % 3) * 10); // 120, 130, or 140 BPM
    const demoKey = ['C', 'D', 'E', 'F', 'G', 'A', 'B'][trackHash % 7];

    return {
      type: 'demo',
      url: silentAudioDataUri,
      title: `${track.title} (Demo)`,
      duration: track.duration || 180,
      quality: 'low',
      metadata: {
        isDemo: true,
        generated: true,
        demoIndex,
        originalTrackId: track.id,
        demoBpm,
        demoKey,
        fallbackReason: 'No audio sources available'
      }
    };
  }

  async testSourceHealth(sourceType: AudioSourceType): Promise<boolean> {
    const startTime = Date.now();

    try {
      switch (sourceType) {
        case 'proxy':
          const testUrl = `${config.API_BASE_URL}/api/proxy-audio?url=${encodeURIComponent(this.royaltyFreeSources[0])}`;
          const response = await fetch(testUrl, { method: 'HEAD' });
          const isHealthy = response.ok;

          if (isHealthy) {
            await this.recordSuccess('proxy', Date.now() - startTime);
          } else {
            await this.recordFailure('proxy', new Error(`Health check failed: ${response.status}`));
          }

          return isHealthy;

        case 'youtube':
          // Test YouTube connectivity (simplified)
          const ytResponse = await fetch('https://www.youtube.com', { method: 'HEAD' });
          const isYtHealthy = ytResponse.ok;

          if (isYtHealthy) {
            await this.recordSuccess('youtube', Date.now() - startTime);
          } else {
            await this.recordFailure('youtube', new Error('YouTube connectivity test failed'));
          }

          return isYtHealthy;

        case 'demo':
          // Demo sources are always healthy
          await this.recordSuccess('demo', Date.now() - startTime);
          return true;

        default:
          return false;
      }
    } catch (error) {
      await this.recordFailure(sourceType, error as Error);
      return false;
    }
  }

  getSourceHealth(sourceType?: AudioSourceType): AudioSourceHealth[] {
    if (sourceType) {
      const health = this.sourceHealthCache.get(sourceType);
      return health ? [health] : [];
    }

    return Array.from(this.sourceHealthCache.values());
  }

  getSourceMetrics(): Map<AudioSourceType, SourceMetrics> {
    return new Map(this.sourceMetrics);
  }

  async runHealthCheck(): Promise<void> {
    console.log('AudioSourceService: Running health check...');

    const healthPromises = (['proxy', 'youtube', 'demo'] as AudioSourceType[])
      .map(sourceType => this.testSourceHealth(sourceType));

    const results = await Promise.allSettled(healthPromises);

    results.forEach((result, index) => {
      const sourceType = ['proxy', 'youtube', 'demo'][index] as AudioSourceType;
      const isHealthy = result.status === 'fulfilled' && result.value;

      console.log(`AudioSourceService: ${sourceType} health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    });

    this.updateHealthMetrics();
  }
}

// Export singleton instance
export const audioSourceService = new AudioSourceService();
export default audioSourceService;