import { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Lock, User, AlertTriangle, Key } from 'lucide-react';

export default function AuthOverlay() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url_here';

  // Supabase requires email — derive one from nickname so user never sees it
  const toEmail = (name: string) => `${name.toLowerCase().trim()}@vocabai.app`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setError('Supabase is not configured yet. Please update the .env file with your credentials.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const email = toEmail(username);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } },
        });
        if (error) throw error;
        setMessage('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            background: 'var(--color-primary)', color: 'white',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--color-primary-dark)' }}>
            Welcome to VocabAI
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? 'Sign in to access your notebook' : 'Create an account to save your words'}
          </p>
        </div>

        {!isConfigured && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--color-danger)',
            padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 24, fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)', fontWeight: 700, marginBottom: 8 }}>
              <AlertTriangle size={18} />
              Setup Required
            </div>
            <p>You need to connect to Supabase first.</p>
            <ol style={{ paddingLeft: 20, marginTop: 8, color: 'var(--color-text)' }}>
              <li>Create a Supabase project</li>
              <li>Open <code>.env</code> in this project</li>
              <li>Paste your URL and Anon Key</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
          {message && <div style={{ color: 'var(--color-success)', fontSize: '0.85rem', textAlign: 'center' }}>{message}</div>}

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Nickname</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--color-text-muted)' }} />
              <input
                type="text" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 40px',
                  border: '3px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit', outline: 'none', transition: 'border-color 200ms'
                }}
                placeholder="Enter your nickname"
                autoComplete="username"
                minLength={2}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--color-text-muted)' }} />
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 40px',
                  border: '3px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit', outline: 'none', transition: 'border-color 200ms'
                }}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, height: 44 }}
            disabled={loading || !isConfigured}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
            style={{
              background: 'none', border: 'none', color: 'var(--color-primary)',
              fontWeight: 700, cursor: 'pointer', outline: 'none'
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
