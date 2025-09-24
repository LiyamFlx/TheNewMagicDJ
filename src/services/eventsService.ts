import { supabase } from '../lib/supabase';

const baseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
const apiBase = String(baseUrl || '');

export async function logEvent(type: string, payload?: Record<string, any>) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const url = apiBase ? `${apiBase}/api/events` : `/api/events`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ type, payload }),
    });
  } catch {
    // best-effort logging; ignore errors
  }
}
