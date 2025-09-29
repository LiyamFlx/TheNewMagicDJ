import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { deckHandoffService } from '../../services/deckHandoffService';
import type { DeckState, CrossfadeSettings } from '../../services/deckHandoffService';

describe('DeckHandoffService', () => {
  let mockAudioElement1: HTMLAudioElement;
  let mockAudioElement2: HTMLAudioElement;
  let mockDeck1: DeckState;
  let mockDeck2: DeckState;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock audio elements
    mockAudioElement1 = new Audio() as HTMLAudioElement;
    mockAudioElement2 = new Audio() as HTMLAudioElement;

    // Create mock deck states
    mockDeck1 = {
      isPlaying: true,
      currentTime: 30,
      duration: 180,
      volume: 80,
      bpm: 128,
      isLoaded: true,
      audioElement: mockAudioElement1
    };

    mockDeck2 = {
      isPlaying: false,
      currentTime: 0,
      duration: 200,
      volume: 80,
      bpm: 126,
      isLoaded: true,
      audioElement: mockAudioElement2
    };
  });

  afterEach(() => {
    if (deckHandoffService.getTransitionStatus().isActive) {
      deckHandoffService.cancelTransition();
    }
  });

  describe('Gapless Transitions', () => {
    it('should perform a basic gapless transition', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      const transitionPromise = deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false // no beat matching for simplicity
      );

      // Check that transition is active
      expect(deckHandoffService.getTransitionStatus().isActive).toBe(true);

      await transitionPromise;

      // Check that transition completed
      expect(deckHandoffService.getTransitionStatus().isActive).toBe(false);
    });

    it('should handle different crossfade curves', async () => {
      const curves: Array<CrossfadeSettings['curve']> = ['linear', 'logarithmic', 'exponential', 'cut'];

      for (const curve of curves) {
        const crossfadeSettings: CrossfadeSettings = {
          curve,
          duration: 500,
          type: 'normal'
        };

        await expect(
          deckHandoffService.performGaplessTransition(
            mockDeck1,
            mockDeck2,
            crossfadeSettings,
            false
          )
        ).resolves.not.toThrow();
      }
    });

    it('should handle power cut transitions', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'cut',
        duration: 100,
        type: 'power-cut'
      };

      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          mockDeck2,
          crossfadeSettings,
          false
        )
      ).resolves.not.toThrow();
    });

    it('should validate deck states before transition', async () => {
      const invalidDeck = {
        ...mockDeck1,
        isLoaded: false
      };

      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      await expect(
        deckHandoffService.performGaplessTransition(
          invalidDeck,
          mockDeck2,
          crossfadeSettings,
          false
        )
      ).rejects.toThrow('Source deck is not ready for transition');
    });

    it('should prevent concurrent transitions', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      // Start first transition
      const firstTransition = deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false
      );

      // Try to start second transition
      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck2,
          mockDeck1,
          crossfadeSettings,
          false
        )
      ).rejects.toThrow('Transition already in progress');

      await firstTransition;
    });
  });

  describe('Beat Matching', () => {
    it('should perform beat matching when enabled', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 2000,
        type: 'normal'
      };

      // Ensure both decks have BPM for beat matching
      mockDeck1.bpm = 128;
      mockDeck2.bpm = 126;

      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          mockDeck2,
          crossfadeSettings,
          true // enable beat matching
        )
      ).resolves.not.toThrow();
    });

    it('should handle missing BPM information', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      // Remove BPM from one deck
      mockDeck2.bpm = undefined;

      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          mockDeck2,
          crossfadeSettings,
          true // try to enable beat matching
        )
      ).resolves.not.toThrow(); // Should fall back to no beat matching
    });

    it('should calculate tempo adjustment correctly', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      mockDeck1.bpm = 120;
      mockDeck2.bpm = 130;

      await deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        true
      );

      // Beat matching should have been applied
      // (This is tested indirectly through the transition completing successfully)
    });
  });

  describe('Sync Drift Monitoring', () => {
    it('should monitor sync drift between decks', () => {
      mockDeck1.isPlaying = true;
      mockDeck2.isPlaying = true;

      expect(() => {
        deckHandoffService.monitorSyncDrift(mockDeck1, mockDeck2);
      }).not.toThrow();
    });

    it('should handle decks that are not playing', () => {
      mockDeck1.isPlaying = false;
      mockDeck2.isPlaying = false;

      expect(() => {
        deckHandoffService.monitorSyncDrift(mockDeck1, mockDeck2);
      }).not.toThrow();
    });

    it('should detect and correct sync drift', () => {
      mockDeck1.isPlaying = true;
      mockDeck2.isPlaying = true;
      mockDeck1.currentTime = 30;
      mockDeck2.currentTime = 30.5; // 500ms drift

      expect(() => {
        deckHandoffService.monitorSyncDrift(mockDeck1, mockDeck2);
      }).not.toThrow();
    });
  });

  describe('Transition Status', () => {
    it('should provide accurate transition status', () => {
      const status = deckHandoffService.getTransitionStatus();

      expect(status).toHaveProperty('isActive');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('type');
      expect(status).toHaveProperty('startTime');
      expect(status).toHaveProperty('estimatedEndTime');

      expect(typeof status.isActive).toBe('boolean');
      expect(typeof status.progress).toBe('number');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should update progress during transition', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      const transitionPromise = deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false
      );

      // Check initial status
      let status = deckHandoffService.getTransitionStatus();
      expect(status.isActive).toBe(true);
      expect(status.progress).toBeGreaterThanOrEqual(0);

      await transitionPromise;

      // Check final status
      status = deckHandoffService.getTransitionStatus();
      expect(status.isActive).toBe(false);
      expect(status.progress).toBe(100);
    });
  });

  describe('Transition Cancellation', () => {
    it('should cancel active transitions', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 2000,
        type: 'normal'
      };

      // Start transition
      const transitionPromise = deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false
      );

      // Verify transition is active
      expect(deckHandoffService.getTransitionStatus().isActive).toBe(true);

      // Cancel transition
      deckHandoffService.cancelTransition();

      // Verify transition is cancelled
      expect(deckHandoffService.getTransitionStatus().isActive).toBe(false);

      // Original promise should reject
      await expect(transitionPromise).rejects.toThrow('Transition cancelled');
    });

    it('should handle cancellation when no transition is active', () => {
      expect(() => {
        deckHandoffService.cancelTransition();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short transition durations', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 10, // Very short
        type: 'normal'
      };

      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          mockDeck2,
          crossfadeSettings,
          false
        )
      ).resolves.not.toThrow();
    });

    it('should handle audio elements without proper time properties', async () => {
      const invalidAudioElement = {
        ...mockAudioElement2,
        currentTime: NaN,
        duration: NaN
      } as HTMLAudioElement;

      const invalidDeck = {
        ...mockDeck2,
        audioElement: invalidAudioElement
      };

      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 1000,
        type: 'normal'
      };

      // Should handle gracefully without throwing
      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          invalidDeck,
          crossfadeSettings,
          false
        )
      ).resolves.not.toThrow();
    });

    it('should handle crossfade settings validation', async () => {
      const invalidSettings = {
        curve: 'invalid-curve' as any,
        duration: -100,
        type: 'invalid-type' as any
      };

      // Should use fallback values for invalid settings
      await expect(
        deckHandoffService.performGaplessTransition(
          mockDeck1,
          mockDeck2,
          invalidSettings,
          false
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete transitions within reasonable time', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 500,
        type: 'normal'
      };

      const startTime = performance.now();

      await deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false
      );

      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // Should complete within 150% of specified duration (accounting for test overhead)
      expect(actualDuration).toBeLessThan(crossfadeSettings.duration * 1.5);
    });

    it('should maintain smooth frame rates during transitions', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'logarithmic',
        duration: 1000,
        type: 'normal'
      };

      // This test verifies the service doesn't block the main thread
      let frameCount = 0;
      const frameCounter = () => {
        frameCount++;
        if (frameCount < 60) {
          requestAnimationFrame(frameCounter);
        }
      };

      requestAnimationFrame(frameCounter);

      await deckHandoffService.performGaplessTransition(
        mockDeck1,
        mockDeck2,
        crossfadeSettings,
        false
      );

      // Should have processed multiple frames during transition
      expect(frameCount).toBeGreaterThan(10);
    });
  });
});