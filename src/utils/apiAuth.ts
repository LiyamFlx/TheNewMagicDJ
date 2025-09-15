import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export async function verifySupabaseJWT(authHeader: string): Promise<{ user: any; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { user: null, error: 'Invalid token' };
    }

    return { user };
  } catch (error) {
    return { user: null, error: 'Token verification failed' };
  }
}

export function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    const { user, error } = await verifySupabaseJWT(authHeader);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    return handler(req, res);
  };
}