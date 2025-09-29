/**
 * Audio Performance Monitor Service
 *
 * Comprehensive real-time monitoring of audio performance metrics
 * including latency, jitter, buffer health, and connection stability
 */

import { logger } from '../utils/logger';

export interface PerformanceMetrics {
  // Latency metrics
  latency: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;

  // Jitter metrics
  jitter: number;
  avgJitter: number;
  maxJitter: number;

  // Buffer health
  bufferHealth: number;
  bufferUnderruns: number;

  // Connection metrics
  connectionStability: number;
  dropouts: number;

  // Performance grade
  overallGrade: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  // Timestamp
  timestamp: number;
}

export interface PerformanceThresholds {
  latency: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  jitter: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  bufferHealth: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface AudioTroubleshootingInfo {
  issues: Array<{
    type: 'latency' | 'jitter' | 'buffer' | 'connection';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation: string;
  }>;
  recommendations: string[];
  systemDiagnostics: {
    audioContextState: string;
    sampleRate: number;
    outputLatency?: number;
    baseLatency?: number;
  };
}

class AudioPerformanceMonitor {
  private isMonitoring = false;
  private metrics: PerformanceMetrics[] = [];
  private currentMetrics: PerformanceMetrics | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;

  // Performance tracking
  private latencyHistory: number[] = [];
  private jitterHistory: number[] = [];
  private bufferHealthHistory: number[] = [];
  private lastAudioTime = 0;
  private dropoutCount = 0;
  private bufferUnderrunCount = 0;

  // Thresholds based on QA criteria
  private readonly thresholds: PerformanceThresholds = {
    latency: {
      excellent: 50,   // < 50ms
      good: 100,       // 50-100ms
      fair: 200,       // 100-200ms
      poor: 500        // 200-500ms (>500ms = critical)
    },
    jitter: {
      excellent: 5,    // < 5ms
      good: 10,        // 5-10ms
      fair: 20,        // 10-20ms
      poor: 50         // 20-50ms (>50ms = critical)
    },
    bufferHealth: {
      excellent: 90,   // > 90%
      good: 70,        // 70-90%
      fair: 50,        // 50-70%
      poor: 30         // 30-50% (<30% = critical)
    }
  };

  /**
   * Initialize performance monitoring
   */
  async initializeMonitoring(): Promise<void> {
    try {
      // Create AudioContext for performance measurement
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Set up analyser for real-time monitoring
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Try to get microphone access for input monitoring
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: this.audioContext.sampleRate
          }
        });

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        source.connect(this.analyser);
      } catch (error) {
        logger.warn('AudioPerformanceMonitor', 'Microphone access denied, continuing without input monitoring', error);
      }

      logger.info('AudioPerformanceMonitor', 'Performance monitoring initialized', {
        sampleRate: this.audioContext.sampleRate,
        outputLatency: (this.audioContext as any).outputLatency,
        baseLatency: (this.audioContext as any).baseLatency
      });

    } catch (error) {
      logger.error('AudioPerformanceMonitor', 'Failed to initialize performance monitoring', error);
      throw error;
    }
  }

  /**
   * Start real-time performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metrics = [];
    this.lastAudioTime = performance.now();

    // Monitor every 100ms for real-time data
    this.monitoringInterval = setInterval(() => {
      this.measurePerformance();
    }, 100);

    logger.info('AudioPerformanceMonitor', 'Real-time monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    logger.info('AudioPerformanceMonitor', 'Performance monitoring stopped');
  }

  /**
   * Measure current performance metrics
   */
  private measurePerformance(): void {
    if (!this.audioContext) return;

    const now = performance.now();

    // Measure latency (time between measurement calls)
    const currentLatency = now - this.lastAudioTime;
    this.latencyHistory.push(currentLatency);

    // Calculate jitter (variance in latency)
    const avgLatency = this.calculateAverage(this.latencyHistory);
    const jitter = Math.abs(currentLatency - avgLatency);
    this.jitterHistory.push(jitter);

    // Measure buffer health
    const bufferHealth = this.measureBufferHealth();
    this.bufferHealthHistory.push(bufferHealth);

    // Keep only last 100 measurements (10 seconds of data)
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
      this.jitterHistory.shift();
      this.bufferHealthHistory.shift();
    }

    // Create current metrics
    this.currentMetrics = {
      latency: currentLatency,
      avgLatency: this.calculateAverage(this.latencyHistory),
      maxLatency: Math.max(...this.latencyHistory),
      minLatency: Math.min(...this.latencyHistory),

      jitter: jitter,
      avgJitter: this.calculateAverage(this.jitterHistory),
      maxJitter: Math.max(...this.jitterHistory),

      bufferHealth: bufferHealth,
      bufferUnderruns: this.bufferUnderrunCount,

      connectionStability: this.calculateConnectionStability(),
      dropouts: this.dropoutCount,

      overallGrade: this.calculateOverallGrade(currentLatency, jitter, bufferHealth),

      timestamp: now
    };

    // Store in history
    this.metrics.push(this.currentMetrics);

    // Keep only last 1000 metrics (100 seconds of data)
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    this.lastAudioTime = now;
  }

  /**
   * Measure buffer health based on audio processing
   */
  private measureBufferHealth(): number {
    if (!this.analyser) return 100;

    try {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      // Calculate buffer fill percentage
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const average = sum / bufferLength;
      const bufferFillPercentage = (average / 255) * 100;

      // Detect buffer underruns (when buffer is too low)
      if (bufferFillPercentage < 10) {
        this.bufferUnderrunCount++;
      }

      // Return health as percentage (higher = better)
      return Math.max(0, Math.min(100, bufferFillPercentage * 2)); // Scale to 0-100%
    } catch (error) {
      return 50; // Default to fair health if measurement fails
    }
  }

  /**
   * Calculate connection stability based on consistency
   */
  private calculateConnectionStability(): number {
    if (this.latencyHistory.length < 10) return 100;

    const recentLatency = this.latencyHistory.slice(-10);
    const variance = this.calculateVariance(recentLatency);

    // Lower variance = higher stability
    const stability = Math.max(0, 100 - variance);

    // Detect dropouts (sudden latency spikes)
    const currentLatency = this.latencyHistory[this.latencyHistory.length - 1];
    const avgLatency = this.calculateAverage(recentLatency);

    if (currentLatency > avgLatency * 3) {
      this.dropoutCount++;
    }

    return stability;
  }

  /**
   * Calculate overall performance grade
   */
  private calculateOverallGrade(
    latency: number,
    jitter: number,
    bufferHealth: number
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const latencyGrade = this.getLatencyGrade(latency);
    const jitterGrade = this.getJitterGrade(jitter);
    const bufferGrade = this.getBufferGrade(bufferHealth);

    // Calculate weighted score (latency is most important for DJ use)
    const scores = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
      critical: 0
    };

    const weightedScore = (
      scores[latencyGrade] * 0.5 +    // 50% weight
      scores[jitterGrade] * 0.3 +     // 30% weight
      scores[bufferGrade] * 0.2       // 20% weight
    );

    if (weightedScore >= 3.5) return 'excellent';
    if (weightedScore >= 2.5) return 'good';
    if (weightedScore >= 1.5) return 'fair';
    if (weightedScore >= 0.5) return 'poor';
    return 'critical';
  }

  /**
   * Grade latency performance
   */
  private getLatencyGrade(latency: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (latency < this.thresholds.latency.excellent) return 'excellent';
    if (latency < this.thresholds.latency.good) return 'good';
    if (latency < this.thresholds.latency.fair) return 'fair';
    if (latency < this.thresholds.latency.poor) return 'poor';
    return 'critical';
  }

  /**
   * Grade jitter performance
   */
  private getJitterGrade(jitter: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (jitter < this.thresholds.jitter.excellent) return 'excellent';
    if (jitter < this.thresholds.jitter.good) return 'good';
    if (jitter < this.thresholds.jitter.fair) return 'fair';
    if (jitter < this.thresholds.jitter.poor) return 'poor';
    return 'critical';
  }

  /**
   * Grade buffer health
   */
  private getBufferGrade(bufferHealth: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (bufferHealth > this.thresholds.bufferHealth.excellent) return 'excellent';
    if (bufferHealth > this.thresholds.bufferHealth.good) return 'good';
    if (bufferHealth > this.thresholds.bufferHealth.fair) return 'fair';
    if (bufferHealth > this.thresholds.bufferHealth.poor) return 'poor';
    return 'critical';
  }

  /**
   * Generate troubleshooting information and recommendations
   */
  generateTroubleshootingInfo(): AudioTroubleshootingInfo {
    if (!this.currentMetrics) {
      return {
        issues: [],
        recommendations: ['Start performance monitoring to get diagnostics'],
        systemDiagnostics: {
          audioContextState: 'unknown',
          sampleRate: 0
        }
      };
    }

    const issues: AudioTroubleshootingInfo['issues'] = [];
    const recommendations: string[] = [];

    // Analyze latency issues
    if (this.currentMetrics.latency > this.thresholds.latency.poor) {
      issues.push({
        type: 'latency',
        severity: this.currentMetrics.latency > 500 ? 'critical' : 'high',
        message: `High audio latency detected: ${this.currentMetrics.latency.toFixed(1)}ms`,
        recommendation: 'Reduce buffer size, close other audio applications, or use ASIO drivers'
      });
      recommendations.push('Use dedicated audio interface with low-latency drivers');
      recommendations.push('Close other applications using audio');
      recommendations.push('Reduce audio buffer size in system settings');
    }

    // Analyze jitter issues
    if (this.currentMetrics.jitter > this.thresholds.jitter.poor) {
      issues.push({
        type: 'jitter',
        severity: this.currentMetrics.jitter > 50 ? 'critical' : 'high',
        message: `High audio jitter detected: ${this.currentMetrics.jitter.toFixed(1)}ms`,
        recommendation: 'Improve system performance or network stability'
      });
      recommendations.push('Disable Wi-Fi power management');
      recommendations.push('Use wired network connection');
      recommendations.push('Close background applications');
    }

    // Analyze buffer health
    if (this.currentMetrics.bufferHealth < this.thresholds.bufferHealth.poor) {
      issues.push({
        type: 'buffer',
        severity: this.currentMetrics.bufferHealth < 30 ? 'critical' : 'high',
        message: `Poor buffer health: ${this.currentMetrics.bufferHealth.toFixed(1)}%`,
        recommendation: 'Increase buffer size or improve system performance'
      });
      recommendations.push('Increase audio buffer size');
      recommendations.push('Free up system memory');
      recommendations.push('Disable CPU throttling');
    }

    // Analyze connection stability
    if (this.currentMetrics.connectionStability < 70) {
      issues.push({
        type: 'connection',
        severity: this.currentMetrics.connectionStability < 50 ? 'critical' : 'medium',
        message: `Unstable audio connection: ${this.currentMetrics.connectionStability.toFixed(1)}%`,
        recommendation: 'Check network stability and audio device connections'
      });
      recommendations.push('Check audio cable connections');
      recommendations.push('Test with different audio device');
      recommendations.push('Restart audio drivers');
    }

    // Add general recommendations based on overall grade
    if (this.currentMetrics.overallGrade === 'poor' || this.currentMetrics.overallGrade === 'critical') {
      recommendations.push('Consider upgrading audio hardware');
      recommendations.push('Check system audio settings');
      recommendations.push('Update audio drivers');
    }

    return {
      issues,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      systemDiagnostics: {
        audioContextState: this.audioContext?.state || 'unknown',
        sampleRate: this.audioContext?.sampleRate || 0,
        outputLatency: (this.audioContext as any)?.outputLatency,
        baseLatency: (this.audioContext as any)?.baseLatency
      }
    };
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get performance history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary for the last N seconds
   */
  getPerformanceSummary(seconds: number = 30): {
    avgLatency: number;
    avgJitter: number;
    avgBufferHealth: number;
    worstLatency: number;
    worstJitter: number;
    totalDropouts: number;
    overallGrade: string;
  } {
    const cutoff = performance.now() - (seconds * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        avgLatency: 0,
        avgJitter: 0,
        avgBufferHealth: 0,
        worstLatency: 0,
        worstJitter: 0,
        totalDropouts: 0,
        overallGrade: 'unknown'
      };
    }

    const latencies = recentMetrics.map(m => m.latency);
    const jitters = recentMetrics.map(m => m.jitter);
    const bufferHealths = recentMetrics.map(m => m.bufferHealth);

    return {
      avgLatency: this.calculateAverage(latencies),
      avgJitter: this.calculateAverage(jitters),
      avgBufferHealth: this.calculateAverage(bufferHealths),
      worstLatency: Math.max(...latencies),
      worstJitter: Math.max(...jitters),
      totalDropouts: this.dropoutCount,
      overallGrade: this.currentMetrics?.overallGrade || 'unknown'
    };
  }

  /**
   * Utility function to calculate average
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Utility function to calculate variance
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const avg = this.calculateAverage(numbers);
    const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
    return this.calculateAverage(squareDiffs);
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

// Export singleton instance
export const audioPerformanceMonitor = new AudioPerformanceMonitor();
export default audioPerformanceMonitor;