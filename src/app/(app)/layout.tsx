'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace('/');
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <main>
        <div className="app-shell" style={{ display: 'grid', placeItems: 'center' }}>
          <div className="card">Checking session...</div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="app-shell">
        <div className="topbar">
          <div className="title">Ops Scorecard</div>
          <div className="actions">
            <div className="settings-menu">
              <button className="pill" aria-label="Settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"
                    stroke="#2b2a26"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-3.6 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1 0-3.6h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 0 1 3.6 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.8 1.8 0 0 1 0 3.6h-.1a1 1 0 0 0-.5.9Z"
                    stroke="#2b2a26"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>
              <div className="settings-dropdown">
                <button onClick={handleLogout}>Log out</button>
              </div>
            </div>
          </div>
        </div>
        <div className="shell-body">
          <aside className="sidebar">
            <div className="side-title">Navigation</div>
            <a className={`side-link ${pathname === '/import' ? 'active' : ''}`} href="/import">
              Data Import
            </a>
            <a className={`side-link ${pathname === '/scorecard' ? 'active' : ''}`} href="/scorecard">
              Driver Scorecard
            </a>
            <a className="side-link" href="#">
              Supervisor Scorecard
            </a>
            <a className="side-link" href="#">
              Manager Scorecard
            </a>
          </aside>
          <section className="content-area">{children}</section>
        </div>
      </div>
    </main>
  );
}
