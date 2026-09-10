import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, FlaskConical, LockKeyhole, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import './Playground.css';

export default function Playground() {
  const { user, authLoading } = useForum();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [openSignalsAfterAuth, setOpenSignalsAfterAuth] = useState(false);

  useEffect(() => {
    if (openSignalsAfterAuth && user) {
      navigate('/health');
    }
  }, [openSignalsAfterAuth, user, navigate]);

  const openPersonalSignals = () => {
    if (user) {
      navigate('/health');
      return;
    }
    setOpenSignalsAfterAuth(true);
    setShowAuth(true);
  };

  return (
    <main className="playground-page">
      <section className="playground-hero">
        <span className="playground-eyebrow"><FlaskConical size={15} /> CAIO Leadership Lab</span>
        <h1>AI Playground</h1>
        <p>A home for practical AI experiments: tools worth testing, projects worth sharing, and ideas that turn into better decisions.</p>
      </section>

      <section className="playground-grid" aria-label="AI Playground apps">
        <article className="playground-card featured">
          <div className="playground-icon signals"><Activity size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Private app</div>
            <h2>Fitbit Health Analytics</h2>
            <p>Connect your Fitbit securely to explore personal sleep, recovery, activity, and heart-rate signals. Your data stays private to you.</p>
          </div>
          <div className="playground-card-footer">
            <span><LockKeyhole size={14} /> Sign-in required</span>
            <button onClick={openPersonalSignals} disabled={authLoading}>
              {user ? 'Open Personal Signals' : 'Sign in to access'} <ArrowRight size={16} />
            </button>
          </div>
        </article>

        <article className="playground-card muted">
          <div className="playground-icon projects"><Sparkles size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Coming next</div>
            <h2>AI Project Showcase</h2>
            <p>Share the experiments you are running, what you learned, and the outcomes that matter—with the CAIO community.</p>
          </div>
          <span className="playground-soon">In design</span>
        </article>
      </section>

      <section className="playground-note">
        <h2>How the Playground works</h2>
        <p>Apps can be public, shared with the community, or private to your account. Each app makes its data boundary clear before you start.</p>
      </section>

      {showAuth && <AuthModal onClose={() => { setShowAuth(false); setOpenSignalsAfterAuth(false); }} />}
    </main>
  );
}
