import { logger } from '../utils/logger';

interface SpotifyPlayer {
  addListener(event: string, callback: (data: any) => void): void;
  removeListener(event: string, callback?: (data: any) => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
  getCurrentState(): Promise<any>;
  setName(name: string): void;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

interface SpotifyWebPlaybackSDK {
  Player: new (options: {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify: SpotifyWebPlaybackSDK;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

class SpotifyPlaybackService {
  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private isReady: boolean = false;

  async initialize(accessToken: string): Promise<boolean> {
    this.accessToken = accessToken;

    try {
      // Load Spotify Web Playback SDK if not already loaded
      if (!window.Spotify) {
        await this.loadSpotifySDK();
      }

      // Create player instance
      this.player = new window.Spotify.Player({
        name: 'MagicDJ Web Player',
        getOAuthToken: (cb) => {
          cb(this.accessToken!);
        },
        volume: 0.5
      });

      // Set up event listeners
      this.setupEventListeners();

      // Connect to Spotify
      const success = await this.player.connect();
      if (success) {
        this.isReady = true;
        logger.info('SpotifyPlaybackService', 'Connected to Spotify Web Playback SDK');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('SpotifyPlaybackService', 'Failed to initialize Spotify playback', error);
      return false;
    }
  }

  private async loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Spotify) {
        resolve();
        return;
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve();
      };

      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
      document.head.appendChild(script);
    });
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    // Ready
    this.player.addListener('ready', ({ device_id }: { device_id: string }) => {
      this.deviceId = device_id;
      logger.info('SpotifyPlaybackService', 'Device ready', { deviceId: device_id });
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      logger.warn('SpotifyPlaybackService', 'Device not ready', { deviceId: device_id });
    });

    // Player state changes
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;

      logger.debug('SpotifyPlaybackService', 'Player state changed', {
        paused: state.paused,
        position: state.position,
        duration: state.duration,
        trackName: state.track_window?.current_track?.name
      });
    });
  }

  async playTrack(spotifyUri: string): Promise<boolean> {
    if (!this.isReady || !this.deviceId || !this.accessToken) {
      logger.warn('SpotifyPlaybackService', 'Player not ready for playback');
      return false;
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [spotifyUri]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.ok) {
        logger.info('SpotifyPlaybackService', 'Started playing track', { spotifyUri });
        return true;
      } else {
        logger.error('SpotifyPlaybackService', 'Failed to play track', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }
    } catch (error) {
      logger.error('SpotifyPlaybackService', 'Error playing track', error);
      return false;
    }
  }

  async pause(): Promise<void> {
    if (this.player) {
      await this.player.pause();
    }
  }

  async resume(): Promise<void> {
    if (this.player) {
      await this.player.resume();
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.player) {
      await this.player.setVolume(volume);
    }
  }

  async seek(positionMs: number): Promise<void> {
    if (this.player) {
      await this.player.seek(positionMs);
    }
  }

  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }

  isConnected(): boolean {
    return this.isReady && this.deviceId !== null;
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }
}

export const spotifyPlaybackService = new SpotifyPlaybackService();