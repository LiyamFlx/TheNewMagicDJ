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

    mockAudioElement1 = new Audio() as HTMLAudioElement;
    mockAudioElement2 = new Audio() as HTMLAudioElement;

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
    if (deckHandoffService.getTransitionStatus().inProgress) {
      // Reset service state
    }
  });

  describe('Basic Functionality', () => {
    it('should perform a basic gapless transition', async () => {
      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 100, // Short duration for tests
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

    it('should handle different crossfade curves', async () => {
      const curves: Array<CrossfadeSettings['curve']> = ['linear', 'logarithmic', 'exponential', 'cut'];

      for (const curve of curves) {
        const crossfadeSettings: CrossfadeSettings = {
          curve,
          duration: 100,
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

    it('should provide transition status', () => {
      const status = deckHandoffService.getTransitionStatus();

      expect(status).toHaveProperty('inProgress');
      expect(status).toHaveProperty('progress');
      expect(status).toHaveProperty('plan');

      expect(typeof status.inProgress).toBe('boolean');
      expect(typeof status.progress).toBe('number');
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should handle sync drift monitoring', () => {
      mockDeck1.isPlaying = true;
      mockDeck2.isPlaying = true;

      expect(() => {
        deckHandoffService.monitorSyncDrift(mockDeck1, mockDeck2);
      }).not.toThrow();
    });

    it('should validate deck states', async () => {
      const invalidDeck = {
        ...mockDeck1,
        isLoaded: false
      };

      const crossfadeSettings: CrossfadeSettings = {
        curve: 'linear',
        duration: 100,
        type: 'normal'
      };

      await expect(
        deckHandoffService.performGaplessTransition(
          invalidDeck,
          mockDeck2,
          crossfadeSettings,
          false
        )
      ).rejects.toThrow();
    });
  });
});