import { useState, useEffect, useCallback } from 'react';

interface SpotifyTokenState {
  token: string | null;
  isLoading: boolean;
  error: string | null;
  expiresAt: number | null;
}

interface UseSpotifyTokenReturn extends SpotifyTokenState {
  refetch: () => Promise<void>;
  isExpired: boolean;
}

export function useSpotifyToken(): UseSpotifyTokenReturn {
  const [state, setState] = useState<SpotifyTokenState>({
    token: null,
    isLoading: true,
    error: null,
    expiresAt: null,
  });

  const fetchToken = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // In development, return a mock token
      if (import.meta.env?.DEV) {
        setState({
          token: 'mock-spotify-token-dev',
          isLoading: false,
          error: null,
          expiresAt: Date.now() + 3600000,
        });
        return;
      }

      const response = await fetch('/api/spotify-token');

      if (!response.ok) {
        if (response.status === 503) {
          // Gracefully degrade to mock token
          setState({
            token: 'mock-spotify-token-dev',
            isLoading: false,
            error: null,
            expiresAt: Date.now() + 3600000,
          });
          return;
        }
        throw new Error(`Token fetch failed: ${response.status}`);
      }

      const data = await response.json();
      setState({
        token: data.access_token,
        isLoading: false,
        error: null,
        expiresAt: Date.now() + data.expires_in * 1000 - 60000,
      });
    } catch (error) {
      setState({
        token: 'mock-spotify-token-dev',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        expiresAt: Date.now() + 3600000,
      });
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const isExpired = state.expiresAt ? Date.now() >= state.expiresAt : false;

  return {
    ...state,
    refetch: fetchToken,
    isExpired,
  };
}
