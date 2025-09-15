import { useState, useEffect } from 'react';
import { supabase } from "../lib/supabase";
import { User, Session } from '@supabase/supabase-js';
import { db } from '../lib/supabase';
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
    error: null
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          // Don't treat "no user" as an error - it's normal when not logged in
          if (error.message !== 'Auth session missing!') {
            logger.error('useAuth', 'Failed to get initial session', error);
            setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
          } else {
            logger.info('useAuth', 'No active session (user not logged in)');
            setAuthState(prev => ({ ...prev, user: null, loading: false, error: null }));
          }
          return;
        }

        setAuthState(prev => ({
          ...prev,
          user,
          session: null, // Will be set by auth state change listener
          loading: false,
          error: null
        }));
      } catch (error) {
        logger.error('useAuth', 'Error getting initial session', error);
        setAuthState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false 
        }));
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.supabase.supabase.auth.onAuthStateChange((event, session) => {
      logger.info('useAuth', 'Auth state changed', { event, userId: session?.user?.id });
      
      setAuthState(prev => ({
        ...prev,
        user: session?.user ?? null,
        session,
        loading: false,
        error: null
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { data: null, error };
      }

      logger.info('useAuth', 'User signed up successfully', { userId: data.user?.id });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { data: null, error: { message: errorMessage } };
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { data: null, error };
      }

      logger.info('useAuth', 'User signed in successfully', { userId: data.user?.id });
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { data: null, error: { message: errorMessage } };
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { error } = await supabase.supabase.auth.signOut();
      
      if (error) {
        setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
        return { error };
      }

      logger.info('useAuth', 'User signed out successfully');
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }));
      return { error: { message: errorMessage } };
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!authState.user
  };
};