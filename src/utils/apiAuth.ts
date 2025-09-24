import { createClient } from '@supabase/supabase-js';

// Support both browser (Vite) and serverless (Node) environments
const isBrowser = typeof window !== 'undefined';
// @ts-ignore Node process may be undefined in browser builds
const SUPABASE_URL =
  (typeof process !== 'undefined' &&
    (process?.env?.SUPABASE_URL || process?.env?.VITE_SUPABASE_URL)) ||
  (isBrowser ? (import.meta as any)?.env?.VITE_SUPABASE_URL : undefined);
// @ts-ignore Node process may be undefined in browser builds
const SUPABASE_ANON_KEY =
  (typeof process !== 'undefined' &&
    (process?.env?.SUPABASE_ANON_KEY ||
      process?.env?.VITE_SUPABASE_ANON_KEY)) ||
  (isBrowser ? (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY : undefined);

const supabase = createClient(
  SUPABASE_URL as string,
  SUPABASE_ANON_KEY as string
);

export async function verifySupabaseJWT(
  authHeader: string
): Promise<{ user: any; _error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, _error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      _error,
    } = await supabase.auth.getUser(token);

    if (_error || !user) {
      return { user: null, _error: 'Invalid token' };
    }

    return { user };
  } catch (_error) {
    return { user: null, _error: 'Token verification failed' };
  }
}

export function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    const { user, _error } = await verifySupabaseJWT(authHeader);

    if (_error || !user) {
      return res
        .status(401)
        .json({ _error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }

    req.user = user;
    return handler(req, res);
  };
}
