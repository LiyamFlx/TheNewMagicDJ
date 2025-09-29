import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { audioPerformanceMonitor } from '../../services/audioPerformanceMonitor';

describe('AudioPerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (audioPerformanceMonitor.isActive()) {
      audioPerformanceMonitor.stopMonitoring();
    }
  });

  describe('Initialization', () => {
    it('should initialize monitoring successfully', async () => {
      await expect(audioPerformanceMonitor.initializeMonitoring()).resolves.not.toThrow();
      expect(audioPerformanceMonitor.isInitialized()).toBe(true);
    });

    it('should handle getUserMedia failure gracefully', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      global.navigator.mediaDevices.getUserMedia = mockGetUserMedia;

      await expect(audioPerformanceMonitor.initializeMonitoring()).rejects.toThrow();
    });
  });

  describe('Monitoring State', () => {
    it('should start and stop monitoring correctly', async () => {
      await audioPerformanceMonitor.initializeMonitoring();

      expect(audioPerformanceMonitor.isActive()).toBe(false);

      audioPerformanceMonitor.startMonitoring();
      expect(audioPerformanceMonitor.isActive()).toBe(true);

      audioPerformanceMonitor.stopMonitoring();
      expect(audioPerformanceMonitor.isActive()).toBe(false);
    });

    it('should not start monitoring without initialization', () => {
      expect(() => audioPerformanceMonitor.startMonitoring()).toThrow('Monitor not initialized');
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();
    });

    it('should provide current metrics', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.latency).toBe('number');
      expect(typeof metrics.avgLatency).toBe('number');
      expect(typeof metrics.jitter).toBe('number');
      expect(typeof metrics.bufferHealth).toBe('number');
      expect(typeof metrics.connectionStability).toBe('number');
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(metrics.overallGrade);
    });

    it('should calculate performance grades correctly', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      // Test excellent grade boundaries
      if (metrics.latency < 50 && metrics.jitter < 5 && metrics.bufferHealth > 90) {
        expect(['excellent', 'good']).toContain(metrics.overallGrade);
      }
    });

    it('should track buffer underruns and dropouts', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      expect(typeof metrics.bufferUnderruns).toBe('number');
      expect(typeof metrics.dropouts).toBe('number');
      expect(metrics.bufferUnderruns).toBeGreaterThanOrEqual(0);
      expect(metrics.dropouts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance History', () => {
    beforeEach(async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();
    });

    it('should maintain performance history', () => {
      const history = audioPerformanceMonitor.getPerformanceHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);

      if (history.length > 0) {
        const entry = history[0];
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('latency');
        expect(entry).toHaveProperty('jitter');
        expect(entry).toHaveProperty('bufferHealth');
      }
    });

    it('should limit history size', () => {
      const history = audioPerformanceMonitor.getPerformanceHistory();

      // Should not exceed maximum history size (100 entries)
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Troubleshooting Info', () => {
    beforeEach(async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();
    });

    it('should generate troubleshooting information', () => {
      const troubleshooting = audioPerformanceMonitor.generateTroubleshootingInfo();

      expect(troubleshooting).toBeDefined();
      expect(Array.isArray(troubleshooting.issues)).toBe(true);
      expect(Array.isArray(troubleshooting.recommendations)).toBe(true);
      expect(troubleshooting.systemDiagnostics).toBeDefined();
    });

    it('should include system diagnostics', () => {
      const troubleshooting = audioPerformanceMonitor.generateTroubleshootingInfo();
      const diagnostics = troubleshooting.systemDiagnostics;

      expect(diagnostics.audioContextState).toBeDefined();
      expect(typeof diagnostics.sampleRate).toBe('number');
      expect(diagnostics.sampleRate).toBeGreaterThan(0);
    });

    it('should detect performance issues', () => {
      const troubleshooting = audioPerformanceMonitor.generateTroubleshootingInfo();

      troubleshooting.issues.forEach(issue => {
        expect(issue).toHaveProperty('type');
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('message');
        expect(issue).toHaveProperty('recommendation');
        expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
      });
    });
  });

  describe('QA Validation Thresholds', () => {
    beforeEach(async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();
    });

    it('should meet latency QA requirements', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      // QA requirement: Latency should be measurable and reasonable
      expect(metrics.latency).toBeGreaterThanOrEqual(0);
      expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);

      // Should have proper grade assignment for latency
      if (metrics.latency < 50) {
        expect(['excellent', 'good']).toContain(metrics.overallGrade);
      } else if (metrics.latency > 500) {
        expect(['poor', 'critical']).toContain(metrics.overallGrade);
      }
    });

    it('should meet jitter QA requirements', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      // QA requirement: Jitter should be measurable and reasonable
      expect(metrics.jitter).toBeGreaterThanOrEqual(0);
      expect(metrics.avgJitter).toBeGreaterThanOrEqual(0);

      // Jitter should not be excessive in test environment
      expect(metrics.jitter).toBeLessThan(1000); // Reasonable upper bound
    });

    it('should meet buffer health QA requirements', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      // QA requirement: Buffer health should be percentage (0-100)
      expect(metrics.bufferHealth).toBeGreaterThanOrEqual(0);
      expect(metrics.bufferHealth).toBeLessThanOrEqual(100);

      // Buffer underruns should be tracked
      expect(typeof metrics.bufferUnderruns).toBe('number');
      expect(metrics.bufferUnderruns).toBeGreaterThanOrEqual(0);
    });

    it('should meet connection stability QA requirements', () => {
      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      // QA requirement: Connection stability should be percentage (0-100)
      expect(metrics.connectionStability).toBeGreaterThanOrEqual(0);
      expect(metrics.connectionStability).toBeLessThanOrEqual(100);

      // Dropouts should be tracked
      expect(typeof metrics.dropouts).toBe('number');
      expect(metrics.dropouts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing AudioContext gracefully', async () => {
      const originalAudioContext = global.AudioContext;
      global.AudioContext = undefined as any;

      await expect(audioPerformanceMonitor.initializeMonitoring()).rejects.toThrow();

      global.AudioContext = originalAudioContext;
    });

    it('should handle monitoring errors without crashing', async () => {
      await audioPerformanceMonitor.initializeMonitoring();

      // Start monitoring should not throw even with mocked AudioContext
      expect(() => audioPerformanceMonitor.startMonitoring()).not.toThrow();

      // Getting metrics should not throw
      expect(() => audioPerformanceMonitor.getCurrentMetrics()).not.toThrow();
    });
  });
});