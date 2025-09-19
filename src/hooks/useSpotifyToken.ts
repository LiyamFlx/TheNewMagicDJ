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
  fetchLazy: () => Promise<string | null>;
}

export function useSpotifyToken(): UseSpotifyTokenReturn {
  const [state, setState] = useState<SpotifyTokenState>({
    token: null,
    isLoading: false, // Start as not loading since we're lazy
    error: null,
    expiresAt: null,
  });

  const fetchToken = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/spotify-token');

      if (!response.ok) {
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
        token: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        expiresAt: null,
      });
    }
  }, []);

  // Remove automatic token fetching - now lazy loaded
  // useEffect(() => {
  //   fetchToken();
  // }, [fetchToken]);

  const fetchLazy = useCallback(async (): Promise<string | null> => {
    // If we already have a valid token, return it
    if (state.token && state.expiresAt && Date.now() < state.expiresAt) {
      return state.token;
    }

    // Otherwise fetch a new token
    await fetchToken();
    return state.token;
  }, [fetchToken, state.token, state.expiresAt]);

  const isExpired = state.expiresAt ? Date.now() >= state.expiresAt : false;

  return {
    ...state,
    refetch: fetchToken,
    isExpired,
    fetchLazy,
  };
}
