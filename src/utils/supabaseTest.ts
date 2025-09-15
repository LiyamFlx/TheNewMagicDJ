import { supabase } from '../lib/supabase';
import { logger } from './logger';

export const testSupabaseConnection = async () => {
  try {
    logger.info('SupabaseTest', 'Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      logger.error('SupabaseTest', 'Supabase connection failed', error);
      return { success: false, error: error.message };
    }
    
    logger.info('SupabaseTest', 'Supabase connection successful');
    return { success: true, data };
    
  } catch (error) {
    logger.error('SupabaseTest', 'Supabase connection test failed', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const testSupabaseAuth = async () => {
  try {
    logger.info('SupabaseTest', 'Testing Supabase auth...');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.warn('SupabaseTest', 'No authenticated user (this is normal)', error);
      return { success: true, authenticated: false };
    }
    
    logger.info('SupabaseTest', 'User authenticated', { userId: user?.id });
    return { success: true, authenticated: true, user };
    
  } catch (error) {
    logger.error('SupabaseTest', 'Auth test failed', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};