import { createClient } from '@supabase/supabase-js';

// Support multiple env var prefixes (Vite, Next.js, generic PUBLIC_)
// Prefer VITE_* (Vite standard), then PUBLIC_*, then NEXT_PUBLIC_*, and finally process.env fallbacks
// @ts-ignore - import.meta.env keys are runtime-defined
const supabaseUrl =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  (import.meta as any)?.env?.PUBLIC_SUPABASE_URL ||
  (import.meta as any)?.env?.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined);

// @ts-ignore - import.meta.env keys are runtime-defined
const supabaseAnonKey =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any)?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined);

// Fail loudly in production if env is missing; warn and use placeholder only in dev
if ((!supabaseUrl || !supabaseAnonKey) && !import.meta.env.DEV) {
  console._error('Supabase configuration missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const resolvedUrl = supabaseUrl || 'https://placeholder.supabase.co';
const resolvedKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
    debug: import.meta.env.DEV,
    flowType: 'pkce',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'MagicDJ',
    },
  },
});

// expose the same names your app imports
export const db: any = supabase;
export const auth: any = supabase.auth;

/* ===== Polyfills so existing code keeps working ===== */

// auth.signIn(email, password) or auth.signIn({ email, password })
const originalSignInWithPassword = supabase.auth.signInWithPassword.bind(supabase.auth);
(auth as any).signIn = (...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'object') {
    const { email, password } = args[0] || {};
    return originalSignInWithPassword({ email, password });
  }
  const [email, password] = args;
  return originalSignInWithPassword({ email, password });
};

// auth.signUp(email, password, displayName?) or auth.signUp({ email, password, data })
const originalSignUp = supabase.auth.signUp.bind(supabase.auth);
(auth as any).signUp = (...args: any[]) => {
  if (args.length === 1 && typeof args[0] === 'object') {
    const { email, password, data } = args[0] || {};
    return originalSignUp({ email, password, options: { data } });
  }
  const [email, password, displayName] = args;
  const data = displayName ? { display_name: displayName } : undefined;
  return originalSignUp({ email, password, options: { data } });
};

// auth.getCurrentUser()
(auth as any).getCurrentUser = () => supabase.auth.getUser();

// auth.session() compatibility
(auth as any).session = () => supabase.auth.getSession();

// Utility to get current authenticated user id (or null)
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ===== Tiny DB helpers your code calls directly ===== */

(db as any).getSessions = (userId: string) => {
  return supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });
};

(db as any).createSession = (payload: any) => {
  return supabase.from('sessions').insert([payload]).select().single();
};

(db as any).updateSession = (id: string, patch: any) => {
  return supabase.from('sessions').update(patch).eq('id', id).select().single();
};
