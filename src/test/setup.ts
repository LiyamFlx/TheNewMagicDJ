import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock Web Audio API
global.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    getByteTimeDomainData: vi.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1 }
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { value: 440 }
  })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null
  })),
  destination: {},
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  suspend: vi.fn(),
  resume: vi.fn(),
  close: vi.fn()
}));

// Mock HTMLAudioElement
global.HTMLAudioElement = vi.fn().mockImplementation(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 100,
  volume: 1,
  src: '',
  paused: true,
  ended: false,
  error: null
}));

// Mock MediaDevices API with proper MediaStream interface
const mockMediaStream = {
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
  active: true,
  id: 'mock-stream-id',
  onaddtrack: null,
  onremovetrack: null,
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  getTrackById: vi.fn(() => null),
  clone: vi.fn(() => mockMediaStream),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => true)
};

global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream as any)),
    ondevicechange: null,
    enumerateDevices: vi.fn(() => Promise.resolve([])),
    getDisplayMedia: vi.fn(() => Promise.resolve(mockMediaStream as any)),
    getSupportedConstraints: vi.fn(() => ({})),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true)
  } as any
};

// Mock performance.now for timing measurements
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now())
};

// Mock requestAnimationFrame with proper return type
global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  setTimeout(cb, 16);
  return 1; // Return a number as expected
}) as any;

global.cancelAnimationFrame = vi.fn((id: number) => clearTimeout(id));

// Console setup for test environment
beforeEach(() => {
  vi.clearAllMocks();
});