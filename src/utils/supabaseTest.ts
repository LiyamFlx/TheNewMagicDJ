import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export async function testSupabaseConnection() {
  try {
    logger.info('SupabaseTest', 'Testing Supabase connection...');

    // Test basic connection with profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      // If profiles table doesn't exist, provide helpful message
      logger.warn(
        'SupabaseTest',
        'Database tables not found - migration needed'
      );

      return {
        success: false,
        error:
          'Database tables not found. Please run the migration to create the required tables.',
        needsMigration: true,
      };
    }

    logger.info('SupabaseTest', 'Supabase connection successful');
    return { success: true, data };
  } catch (error) {
    logger.error('SupabaseTest', 'Supabase connection test failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function testSupabaseAuth() {
  try {
    logger.info('SupabaseTest', 'Testing Supabase auth...');

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    logger.info('SupabaseTest', 'Supabase auth test completed', {
      authenticated: !!data.session,
    });

    return {
      success: true,
      authenticated: !!data.session,
      session: data.session,
    };
  } catch (error) {
    logger.error('SupabaseTest', 'Supabase auth test failed', error);
    return {
      success: false,
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
