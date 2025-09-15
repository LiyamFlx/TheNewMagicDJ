import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error('useAuth', 'Failed to get initial session', error);
          setAuthState((prev) => ({
            ...prev,
            error: error.message,
            loading: false,
          }));
          return;
        }

        setAuthState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        }));
      } catch (error) {
        logger.error('useAuth', 'Error getting initial session', error);
        setAuthState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false,
        }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('useAuth', 'Auth state changed', {
        event,
        userId: session?.user?.id,
      });

      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });

      if (error) {
        setAuthState((prev) => ({ ...prev, error: error.message, loading: false }));
        return { data: null, error };
      }

      logger.info('useAuth', 'User signed up successfully', { userId: data.user?.id });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      return { data: null, error: { message: errorMessage } };
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthState((prev) => ({ ...prev, error: error.message, loading: false }));
        return { data: null, error };
      }

      logger.info('useAuth', 'User signed in successfully', { userId: data.user?.id });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      return { data: null, error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setAuthState((prev) => ({ ...prev, error: error.message, loading: false }));
        return { error };
      }

      logger.info('useAuth', 'User signed out successfully');
      setAuthState({ user: null, session: null, loading: false, error: null });
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      return { error: { message: errorMessage } };
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!authState.user,
  };
};
