import { useState, useCallback } from 'react';

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

  const fetchToken = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/spotify-token');

      if (!response.ok) {
        throw new Error(`Token fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const accessToken: string = data.access_token;
      const expiresAt = Date.now() + data.expires_in * 1000 - 60000;
      setState({ token: accessToken, isLoading: false, error: null, expiresAt });
      return accessToken;
    } catch (error) {
      setState({
        token: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        expiresAt: null,
      });
      return null;
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

    // Otherwise fetch a new token and return it directly
    const token = await fetchToken();
    return token;
  }, [fetchToken, state.token, state.expiresAt]);

  const isExpired = state.expiresAt ? Date.now() >= state.expiresAt : false;

  return {
    ...state,
    refetch: async () => { await fetchToken(); },
    isExpired,
    fetchLazy,
  };
}
