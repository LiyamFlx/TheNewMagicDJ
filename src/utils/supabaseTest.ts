import { supabase } from '../lib/supabase';
import { logger } from './logger';

export const testSupabaseConnection = async () => {
  try {
    logger.info('SupabaseTest', 'Testing Supabase connection...');
    
    // Test basic connection with a simple query that doesn't depend on custom tables
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);
    
    if (error) {
      // If auth.users fails, try a more basic connection test
      logger.warn('SupabaseTest', 'Auth table access failed, testing basic connection');
      
      try {
        const { data: healthData, error: healthError } = await supabase
          .rpc('version');
        
        if (healthError) {
          logger.error('SupabaseTest', 'Supabase connection failed', healthError);
          return { success: false, error: healthError.message };
        }
        
        logger.info('SupabaseTest', 'Basic Supabase connection successful');
        return { success: true, data: healthData, warning: 'Custom tables may not be available' };
      } catch (basicError) {
        logger.error('SupabaseTest', 'Basic connection test failed', basicError);
        return { success: false, error: 'Unable to connect to Supabase' };
      }
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