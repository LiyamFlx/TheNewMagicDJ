import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualDeckPlayer } from '../../hooks/useDualDeckPlayer';
import type { AudioSource } from '../../services/audioSourceService';

describe('useDualDeckPlayer', () => {
  const mockAudioSource1: AudioSource = {
    title: 'Test Track 1',
    url: 'https://example.com/track1.mp3',
    duration: 180,
    type: 'youtube'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      expect(result.current.deckA.state.isPlaying).toBe(false);
      expect(result.current.deckB.state.isPlaying).toBe(false);
      expect(result.current.deckA.state.volume).toBe(75);
      expect(result.current.deckB.state.volume).toBe(75);
      expect(result.current.isPlaying).toBe(false);
    });

    it('should initialize with custom volume', () => {
      const { result } = renderHook(() =>
        useDualDeckPlayer({ initialVolume: 50 })
      );

      expect(result.current.deckA.state.volume).toBe(50);
      expect(result.current.deckB.state.volume).toBe(50);
    });

    it('should load sources correctly', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      act(() => {
        result.current.deckA.controls.loadSources([mockAudioSource1]);
      });

      expect(result.current.deckA.state.sources).toHaveLength(1);
      expect(result.current.deckA.state.currentSource).toEqual(mockAudioSource1);
    });

    it('should control volume', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      act(() => {
        result.current.deckA.controls.setVolume(50);
      });

      expect(result.current.deckA.state.volume).toBe(50);
    });

    it('should provide advanced DJ features', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      expect(typeof result.current.performGaplessTransition).toBe('function');
      expect(typeof result.current.getTransitionStatus).toBe('function');
      expect(typeof result.current.syncDecks).toBe('function');
      expect(typeof result.current.setCrossfader).toBe('function');
      expect(typeof result.current.setMasterVolume).toBe('function');
    });

    it('should handle master volume control', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      act(() => {
        result.current.setMasterVolume(60);
      });

      expect(result.current.deckA.state.volume).toBe(60);
      expect(result.current.deckB.state.volume).toBe(60);
    });

    it('should manage cue points', () => {
      const { result } = renderHook(() => useDualDeckPlayer());

      act(() => {
        result.current.deckA.controls.addCuePoint(30);
        result.current.deckA.controls.addCuePoint(60);
      });

      expect(result.current.deckA.state.cuePoints).toContain(30);
      expect(result.current.deckA.state.cuePoints).toContain(60);

      act(() => {
        result.current.deckA.controls.clearCuePoints();
      });

      expect(result.current.deckA.state.cuePoints).toHaveLength(0);
    });
  });
});