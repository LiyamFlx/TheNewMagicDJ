/**
 * Deck Handoff Service
 *
 * Provides professional DJ deck handoff capabilities including:
 * - Gapless transitions between decks
 * - BPM sync with drift correction
 * - Advanced crossfade curves
 * - Beat matching and phase alignment
 */

import { logger } from '../utils/logger';

export interface DeckState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  bpm?: number;
  beatOffset?: number; // Offset to the nearest beat in seconds
  isLoaded: boolean;
  audioElement?: HTMLAudioElement;
}

export interface CrossfadeSettings {
  curve: 'linear' | 'logarithmic' | 'exponential' | 'cut';
  duration: number; // in milliseconds
  type: 'normal' | 'hamster' | 'reverse';
}

export interface BeatMatchResult {
  sourceBpm: number;
  targetBpm: number;
  pitchAdjustment: number; // Percentage to adjust source track
  beatAlignment: number; // Milliseconds to offset for beat alignment
  confidence: number; // 0-1, how confident we are in the match
}

export interface TransitionPlan {
  startTime: number;
  endTime: number;
  crossfadeStart: number;
  crossfadeEnd: number;
  beatMatchSettings?: BeatMatchResult;
  volumes: {
    deckA: { start: number; end: number; curve: number[] };
    deckB: { start: number; end: number; curve: number[] };
  };
}

class DeckHandoffService {
  private syncDrift = new Map<string, number[]>(); // Track sync drift over time
  private beatDetectionWorker: Worker | null = null;
  private transitionInProgress = false;
  private currentTransition: TransitionPlan | null = null;

  /**
   * Initialize the deck handoff service
   */
  async initialize(): Promise<void> {
    logger.info('DeckHandoffService', 'Initializing deck handoff service');

    // Initialize beat detection worker if available
    try {
      // This would load a Web Worker for beat detection
      // For now, we'll use a simple implementation
      logger.info('DeckHandoffService', 'Deck handoff service initialized');
    } catch (error) {
      logger.warn('DeckHandoffService', 'Beat detection worker not available, using simplified detection', error);
    }
  }

  /**
   * Perform gapless transition between two decks
   */
  async performGaplessTransition(
    sourceDeck: DeckState,
    targetDeck: DeckState,
    crossfadeSettings: CrossfadeSettings,
    beatMatch: boolean = true
  ): Promise<void> {
    if (this.transitionInProgress) {
      throw new Error('Transition already in progress');
    }

    logger.info('DeckHandoffService', 'Starting gapless transition', {
      sourceBpm: sourceDeck.bpm,
      targetBpm: targetDeck.bpm,
      beatMatch,
      crossfadeDuration: crossfadeSettings.duration
    });

    this.transitionInProgress = true;

    try {
      // 1. Analyze and prepare beat matching if requested
      let beatMatchResult: BeatMatchResult | undefined;
      if (beatMatch && sourceDeck.bpm && targetDeck.bpm) {
        beatMatchResult = await this.analyzeBeatMatch(sourceDeck, targetDeck);
        await this.applyBeatMatch(targetDeck, beatMatchResult);
      }

      // 2. Calculate optimal transition timing
      const transitionPlan = this.calculateTransitionPlan(
        sourceDeck,
        targetDeck,
        crossfadeSettings,
        beatMatchResult
      );

      this.currentTransition = transitionPlan;

      // 3. Execute the transition
      await this.executeTransition(sourceDeck, targetDeck, transitionPlan);

      logger.info('DeckHandoffService', 'Gapless transition completed successfully');

    } catch (error) {
      logger.error('DeckHandoffService', 'Gapless transition failed', error);
      throw error;
    } finally {
      this.transitionInProgress = false;
      this.currentTransition = null;
    }
  }

  /**
   * Analyze beat matching between two tracks
   */
  async analyzeBeatMatch(sourceDeck: DeckState, targetDeck: DeckState): Promise<BeatMatchResult> {
    const sourceBpm = sourceDeck.bpm || await this.detectBPM(sourceDeck);
    const targetBpm = targetDeck.bpm || await this.detectBPM(targetDeck);

    // Calculate pitch adjustment needed
    const pitchRatio = sourceBpm / targetBpm;
    const pitchAdjustment = (pitchRatio - 1) * 100; // Convert to percentage

    // Calculate beat alignment
    const sourceBeatOffset = sourceDeck.beatOffset || await this.detectBeatOffset(sourceDeck);
    const targetBeatOffset = targetDeck.beatOffset || await this.detectBeatOffset(targetDeck);

    const beatAlignment = this.calculateBeatAlignment(
      sourceBeatOffset,
      targetBeatOffset,
      sourceBpm,
      targetBpm
    );

    // Calculate confidence based on BPM similarity and beat detection quality
    const bpmDifference = Math.abs(sourceBpm - targetBpm);
    const bpmConfidence = Math.max(0, 1 - (bpmDifference / 20)); // Lose confidence as BPM differs
    const alignmentConfidence = 0.8; // Simplified - would be based on beat detection quality

    const confidence = (bpmConfidence + alignmentConfidence) / 2;

    return {
      sourceBpm,
      targetBpm,
      pitchAdjustment,
      beatAlignment,
      confidence
    };
  }

  /**
   * Apply beat matching to the target deck
   */
  async applyBeatMatch(targetDeck: DeckState, beatMatch: BeatMatchResult): Promise<void> {
    if (!targetDeck.audioElement) {
      throw new Error('Audio element not available for beat matching');
    }

    // Apply pitch adjustment
    if (Math.abs(beatMatch.pitchAdjustment) > 0.1) {
      try {
        // Modern browsers support playbackRate for pitch adjustment
        targetDeck.audioElement.playbackRate = 1 + (beatMatch.pitchAdjustment / 100);

        logger.info('DeckHandoffService', 'Applied pitch adjustment', {
          pitchAdjustment: beatMatch.pitchAdjustment,
          newPlaybackRate: targetDeck.audioElement.playbackRate
        });
      } catch (error) {
        logger.warn('DeckHandoffService', 'Pitch adjustment not supported', error);
      }
    }

    // Apply beat alignment by adjusting start time
    if (Math.abs(beatMatch.beatAlignment) > 10) { // Only if > 10ms difference
      const currentTime = targetDeck.audioElement.currentTime;
      const alignedTime = currentTime + (beatMatch.beatAlignment / 1000);

      if (alignedTime >= 0 && alignedTime < targetDeck.duration) {
        targetDeck.audioElement.currentTime = alignedTime;

        logger.info('DeckHandoffService', 'Applied beat alignment', {
          beatAlignment: beatMatch.beatAlignment,
          newCurrentTime: alignedTime
        });
      }
    }
  }

  /**
   * Calculate transition plan with precise timing
   */
  private calculateTransitionPlan(
    sourceDeck: DeckState,
    targetDeck: DeckState,
    crossfadeSettings: CrossfadeSettings,
    beatMatch?: BeatMatchResult
  ): TransitionPlan {
    const now = performance.now();
    const crossfadeDuration = crossfadeSettings.duration;

    // Calculate when to start the crossfade for optimal beat alignment
    let crossfadeStart = now + 100; // Small delay to prepare

    // If we have beat information, align crossfade to beat boundaries
    if (beatMatch && sourceDeck.bpm) {
      const beatDuration = (60 / sourceDeck.bpm) * 1000; // milliseconds per beat
      const timeToBeat = beatDuration - ((sourceDeck.currentTime * 1000) % beatDuration);

      // Start crossfade on the next beat or beat boundary
      crossfadeStart = now + timeToBeat;
    }

    const crossfadeEnd = crossfadeStart + crossfadeDuration;

    // Generate volume curves based on crossfade settings
    const volumeCurves = this.generateVolumeCurves(crossfadeSettings);

    return {
      startTime: crossfadeStart,
      endTime: crossfadeEnd,
      crossfadeStart,
      crossfadeEnd,
      beatMatchSettings: beatMatch,
      volumes: {
        deckA: {
          start: sourceDeck.volume,
          end: 0,
          curve: volumeCurves.fadeOut
        },
        deckB: {
          start: 0,
          end: targetDeck.volume,
          curve: volumeCurves.fadeIn
        }
      }
    };
  }

  /**
   * Execute the calculated transition plan
   */
  private async executeTransition(
    sourceDeck: DeckState,
    targetDeck: DeckState,
    plan: TransitionPlan
  ): Promise<void> {
    const startTime = performance.now();

    // Start target deck if not already playing
    if (!targetDeck.isPlaying && targetDeck.audioElement) {
      try {
        await targetDeck.audioElement.play();
        targetDeck.isPlaying = true;
      } catch (error) {
        logger.error('DeckHandoffService', 'Failed to start target deck', error);
        throw error;
      }
    }

    // Execute crossfade with high precision timing
    return new Promise((resolve, reject) => {
      const transitionInterval = setInterval(() => {
        const now = performance.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / plan.crossfadeEnd);

        if (progress >= 1) {
          // Transition complete
          clearInterval(transitionInterval);

          // Final volume settings
          this.setDeckVolume(sourceDeck, 0);
          this.setDeckVolume(targetDeck, plan.volumes.deckB.end);

          // Stop source deck
          if (sourceDeck.audioElement) {
            sourceDeck.audioElement.pause();
            sourceDeck.isPlaying = false;
          }

          resolve();
          return;
        }

        // Apply volume curve interpolation
        const sourceVolume = this.interpolateVolume(
          plan.volumes.deckA.start,
          plan.volumes.deckA.end,
          progress,
          plan.volumes.deckA.curve
        );

        const targetVolume = this.interpolateVolume(
          plan.volumes.deckB.start,
          plan.volumes.deckB.end,
          progress,
          plan.volumes.deckB.curve
        );

        this.setDeckVolume(sourceDeck, sourceVolume);
        this.setDeckVolume(targetDeck, targetVolume);

      }, 10); // 10ms precision for smooth transitions

      // Timeout safety
      setTimeout(() => {
        clearInterval(transitionInterval);
        reject(new Error('Transition timeout'));
      }, plan.crossfadeEnd + 1000);
    });
  }

  /**
   * Generate volume curves for different crossfade types
   */
  private generateVolumeCurves(settings: CrossfadeSettings): {
    fadeIn: number[];
    fadeOut: number[];
  } {
    const points = 100; // Generate 100 points for smooth curves
    const fadeIn: number[] = [];
    const fadeOut: number[] = [];

    for (let i = 0; i <= points; i++) {
      const t = i / points; // 0 to 1

      let fadeInValue: number;
      let fadeOutValue: number;

      switch (settings.curve) {
        case 'linear':
          fadeInValue = t;
          fadeOutValue = 1 - t;
          break;

        case 'logarithmic':
          fadeInValue = Math.log(1 + t * 9) / Math.log(10); // log10(1 + t*9)
          fadeOutValue = Math.log(1 + (1 - t) * 9) / Math.log(10);
          break;

        case 'exponential':
          fadeInValue = t * t;
          fadeOutValue = (1 - t) * (1 - t);
          break;

        case 'cut':
          fadeInValue = t >= 0.5 ? 1 : 0;
          fadeOutValue = t < 0.5 ? 1 : 0;
          break;

        default:
          fadeInValue = t;
          fadeOutValue = 1 - t;
      }

      fadeIn.push(fadeInValue);
      fadeOut.push(fadeOutValue);
    }

    return { fadeIn, fadeOut };
  }

  /**
   * Interpolate volume using curve data
   */
  private interpolateVolume(
    startVolume: number,
    endVolume: number,
    progress: number,
    curve: number[]
  ): number {
    const curveIndex = Math.min(curve.length - 1, Math.floor(progress * curve.length));
    const curveValue = curve[curveIndex];

    return startVolume + (endVolume - startVolume) * curveValue;
  }

  /**
   * Set deck volume safely
   */
  private setDeckVolume(deck: DeckState, volume: number): void {
    if (deck.audioElement) {
      deck.audioElement.volume = Math.max(0, Math.min(1, volume / 100));
      deck.volume = volume;
    }
  }

  /**
   * Detect BPM of a track (simplified implementation)
   */
  private async detectBPM(deck: DeckState): Promise<number> {
    // In a real implementation, this would use audio analysis
    // For now, return a reasonable default or estimated BPM

    if (deck.bpm) {
      return deck.bpm;
    }

    // Simplified BPM detection based on track characteristics
    // This would typically involve FFT analysis of the audio
    const estimatedBpm = 120 + Math.random() * 60; // 120-180 BPM range

    logger.info('DeckHandoffService', 'Estimated BPM', {
      bpm: estimatedBpm
    });

    return estimatedBpm;
  }

  /**
   * Detect beat offset (time to next beat)
   */
  private async detectBeatOffset(deck: DeckState): Promise<number> {
    // Simplified beat offset detection
    // In a real implementation, this would analyze the audio waveform

    if (deck.beatOffset !== undefined) {
      return deck.beatOffset;
    }

    // Return random offset for demo purposes
    const estimatedOffset = Math.random() * 0.5; // 0-500ms

    logger.info('DeckHandoffService', 'Estimated beat offset', {
      offset: estimatedOffset
    });

    return estimatedOffset;
  }

  /**
   * Calculate beat alignment between tracks
   */
  private calculateBeatAlignment(
    sourceBeatOffset: number,
    targetBeatOffset: number,
    sourceBpm: number,
    targetBpm: number
  ): number {
    // Calculate the time difference needed to align beats
    const sourceBeatPeriod = 60 / sourceBpm; // seconds per beat
    const targetBeatPeriod = 60 / targetBpm;

    // Find the optimal alignment within one beat period
    const offsetDifference = targetBeatOffset - sourceBeatOffset;

    // Convert to milliseconds
    return offsetDifference * 1000;
  }

  /**
   * Monitor sync drift and apply corrections
   */
  monitorSyncDrift(deckA: DeckState, deckB: DeckState): void {
    if (!deckA.isPlaying || !deckB.isPlaying) return;

    const driftId = `${deckA.audioElement?.src}-${deckB.audioElement?.src}`;

    // Calculate current sync difference
    const timeA = deckA.currentTime;
    const timeB = deckB.currentTime;
    const syncDiff = Math.abs(timeA - timeB);

    // Store drift history
    if (!this.syncDrift.has(driftId)) {
      this.syncDrift.set(driftId, []);
    }

    const driftHistory = this.syncDrift.get(driftId)!;
    driftHistory.push(syncDiff);

    // Keep only last 10 measurements
    if (driftHistory.length > 10) {
      driftHistory.shift();
    }

    // Check if drift correction is needed
    if (driftHistory.length >= 5) {
      const avgDrift = driftHistory.reduce((sum, drift) => sum + drift, 0) / driftHistory.length;

      if (avgDrift > 0.05) { // More than 50ms average drift
        this.applySyncCorrection(deckA, deckB, avgDrift);
      }
    }
  }

  /**
   * Apply sync drift correction
   */
  private applySyncCorrection(deckA: DeckState, deckB: DeckState, drift: number): void {
    // Simple correction: slightly adjust playback rate of one deck
    const correctionAmount = Math.min(0.01, drift * 0.1); // Small correction

    if (deckB.audioElement) {
      const currentRate = deckB.audioElement.playbackRate || 1;
      deckB.audioElement.playbackRate = currentRate + correctionAmount;

      logger.info('DeckHandoffService', 'Applied sync drift correction', {
        drift,
        correctionAmount,
        newPlaybackRate: deckB.audioElement.playbackRate
      });

      // Reset correction after a short time
      setTimeout(() => {
        if (deckB.audioElement) {
          deckB.audioElement.playbackRate = 1;
        }
      }, 2000);
    }
  }

  /**
   * Get current transition status
   */
  getTransitionStatus(): {
    inProgress: boolean;
    plan: TransitionPlan | null;
    progress: number;
  } {
    if (!this.transitionInProgress || !this.currentTransition) {
      return {
        inProgress: false,
        plan: null,
        progress: 0
      };
    }

    const now = performance.now();
    const elapsed = now - this.currentTransition.startTime;
    const duration = this.currentTransition.endTime - this.currentTransition.startTime;
    const progress = Math.min(1, elapsed / duration);

    return {
      inProgress: this.transitionInProgress,
      plan: this.currentTransition,
      progress
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.beatDetectionWorker) {
      this.beatDetectionWorker.terminate();
      this.beatDetectionWorker = null;
    }

    this.syncDrift.clear();
    this.transitionInProgress = false;
    this.currentTransition = null;

    logger.info('DeckHandoffService', 'Deck handoff service destroyed');
  }
}

// Export singleton instance
export const deckHandoffService = new DeckHandoffService();
export default deckHandoffService;