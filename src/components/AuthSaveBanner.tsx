import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthSaveBanner() {
  const [show, setShow] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (isSignUp && !result.data.session) {
        alert('Check your email for the confirmation link!');
      }

      setShowLoginForm(false);
      setFormData({ email: '', password: '' });
    } catch (error) {
      console.error('Auth error:', error);
      alert(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-slate-900/80 via-purple-900/40 to-slate-900/80
                    border-b border-purple-500/20 text-purple-200 text-sm backdrop-blur-sm">
      <div className="max-w-7xl mx-auto">
        {!showLoginForm ? (
          <div className="flex items-center justify-center md:justify-between">
            <span className="text-center md:text-left">
              💾 Save your playlists to the cloud —{' '}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setShowLoginForm(true);
                }}
                className="text-fuchsia-400 hover:text-fuchsia-300 underline transition-colors font-medium"
              >
                Sign in here
              </button>
            </span>
            <button
              onClick={() => setShow(false)}
              className="hidden md:block text-purple-400 hover:text-purple-200 transition-colors ml-4"
            >
              ✕
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-purple-200 text-sm">
              {isSignUp ? 'Create Account:' : 'Sign In:'}
            </span>
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="px-3 py-1 bg-slate-800/50 border border-purple-500/30 rounded text-purple-100
                       placeholder-purple-300/50 text-sm focus:outline-none focus:border-fuchsia-400
                       focus:ring-1 focus:ring-fuchsia-400/30 transition-all"
              disabled={loading}
            />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="px-3 py-1 bg-slate-800/50 border border-purple-500/30 rounded text-purple-100
                       placeholder-purple-300/50 text-sm focus:outline-none focus:border-fuchsia-400
                       focus:ring-1 focus:ring-fuchsia-400/30 transition-all"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500
                       hover:to-purple-500 border border-fuchsia-500/50 rounded text-white transition-all
                       disabled:opacity-50 text-sm shadow-lg shadow-fuchsia-500/25"
            >
              {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLoginForm(false);
                setFormData({ email: '', password: '' });
              }}
              className="px-2 py-1 text-purple-300 hover:text-purple-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-fuchsia-400 hover:text-fuchsia-300 transition-colors text-sm underline"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
