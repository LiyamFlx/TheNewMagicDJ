import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// expose the same names your app imports
export const db: any = supabase;
export const auth: any = supabase.auth;

/* ===== Polyfills so existing code keeps working ===== */

// auth.signIn(email, password) or auth.signIn({ email, password })
(auth as any).signIn = (...args: any[]) => {
  if (args.length === 1 && typeof args[0] === "object") {
    const { email, password } = args[0] || {};
    return supabase.auth.signInWithPassword({ email, password });
  }
  const [email, password] = args;
  return supabase.auth.signInWithPassword({ email, password });
};

// auth.signUp(email, password, displayName?) or auth.signUp({ email, password, data })
(auth as any).signUp = (...args: any[]) => {
  if (args.length === 1 && typeof args[0] === "object") {
    const { email, password, data } = args[0] || {};
    return supabase.auth.signUp({ email, password, options: { data } });
  }
  const [email, password, displayName] = args;
  const data = displayName ? { display_name: displayName } : undefined;
  return supabase.auth.signUp({ email, password, options: { data } });
};

// auth.getCurrentUser()
(auth as any).getCurrentUser = () => supabase.auth.getUser();

// auth.session() compatibility
(auth as any).session = () => supabase.auth.getSession();

/* ===== Tiny DB helpers your code calls directly ===== */

(db as any).getSessions = (userId: string) => {
  return supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
};

(db as any).createSession = (payload: any) => {
  return supabase.from("sessions").insert([payload]).select().single();
};

(db as any).updateSession = (id: string, patch: any) => {
  return supabase.from("sessions").update(patch).eq("id", id).select().single();
};
