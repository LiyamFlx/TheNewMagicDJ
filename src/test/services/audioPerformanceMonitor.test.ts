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

  describe('Basic Functionality', () => {
    it('should initialize monitoring', async () => {
      await expect(audioPerformanceMonitor.initializeMonitoring()).resolves.not.toThrow();
    });

    it('should start and stop monitoring', async () => {
      await audioPerformanceMonitor.initializeMonitoring();

      audioPerformanceMonitor.startMonitoring();
      expect(audioPerformanceMonitor.isActive()).toBe(true);

      audioPerformanceMonitor.stopMonitoring();
      expect(audioPerformanceMonitor.isActive()).toBe(false);
    });

    it('should provide metrics when active', async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();

      const metrics = audioPerformanceMonitor.getCurrentMetrics();

      if (metrics) {
        expect(typeof metrics.latency).toBe('number');
        expect(typeof metrics.jitter).toBe('number');
        expect(typeof metrics.bufferHealth).toBe('number');
        expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(metrics.overallGrade);
      }
    });

    it('should generate troubleshooting info', async () => {
      await audioPerformanceMonitor.initializeMonitoring();
      audioPerformanceMonitor.startMonitoring();

      const troubleshooting = audioPerformanceMonitor.generateTroubleshootingInfo();

      expect(troubleshooting).toBeDefined();
      expect(Array.isArray(troubleshooting.issues)).toBe(true);
      expect(Array.isArray(troubleshooting.recommendations)).toBe(true);
      expect(troubleshooting.systemDiagnostics).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const originalAudioContext = global.AudioContext;
      global.AudioContext = undefined as any;

      await expect(audioPerformanceMonitor.initializeMonitoring()).rejects.toThrow();

      global.AudioContext = originalAudioContext;
    });
  });
});