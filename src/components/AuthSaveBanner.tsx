import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthSaveBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setShow(!data?.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setShow(!session);
    });
    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  if (!show) return null;

  return (
    <div className="px-4 py-2 bg-yellow-900/50 border-b border-yellow-600 text-yellow-200 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span>
          Sign in to save your playlists to the cloud. You’re browsing without a
          Supabase session, so saves are local-only.
        </span>
      </div>
    </div>
  );
}
