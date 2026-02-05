'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/scorecard');
      }
    });
  }, [router]);

  const handleLogin = async () => {
    setLoading(true);
    setStatus('Signing in...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(`Login failed: ${error.message}`);
    } else {
      setStatus('Signed in. Redirecting...');
      router.replace('/scorecard');
    }
    setLoading(false);
  };

  return (
    <main>
      <div className="page">
        <div className="card hero">
          <span className="tag">Ops Scorecard</span>
          <h1>Welcome Back</h1>
          <p className="sub">Sign in to view the driver scorecard and import data.</p>
        </div>
        <div className="card">
          <h2>Sign In</h2>
          <div className="form-field">
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button onClick={handleLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          {status ? <div className="status">{status}</div> : null}
        </div>
      </div>
    </main>
  );
}
