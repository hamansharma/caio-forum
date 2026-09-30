import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, Award, ClipboardCheck, FlaskConical, LockKeyhole, Network, Scale, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import usePageMeta from '../hooks/usePageMeta';
import './Playground.css';

export default function Playground() {
  usePageMeta('AI Playground | Practical AI Tools & Experiments', 'Explore practical AI tools, experiments, and decision-support projects from CAIO Leadership Lab, including certification planning and vendor portfolio mapping.', { canonicalPath: '/playground' });
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
  const accessStatus = requiresSignIn => requiresSignIn ? (user ? 'Ready to use' : <><LockKeyhole size={14} /> Sign-in required</>) : 'No sign-in required';

  return (
    <main className="playground-page">
      <section className="playground-hero">
        <span className="playground-eyebrow"><FlaskConical size={15} /> CAIO Leadership Lab</span>
        <h1>AI Playground</h1>
        <p>A home for practical AI experiments: tools worth testing, projects worth sharing, and ideas that turn into better decisions.</p>
      </section>

      <section className="playground-grid" aria-label="AI Playground apps">
        <article className="playground-card decision-card">
          <div className="playground-icon decision"><Scale size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Decision support</div>
            <h2>Build vs. Buy Decision Studio</h2>
            <p>Use a transparent nine-factor rubric to decide whether an AI initiative should be built, bought, or delivered as a hybrid solution.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(false)}</span>
            <div className="playground-card-actions"><button onClick={() => navigate('/playground/build-vs-buy')}>Evaluate a use case <ArrowRight size={16} /></button><button className="playground-discuss" onClick={() => navigate('/playground/community?tool=build-buy')}>Discuss</button></div>
          </div>
        </article>

        <article className="playground-card vendor-card">
          <div className="playground-icon vendors"><Network size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Private workspace</div>
            <h2>Vendor Portfolio Mapper</h2>
            <p>Add the tools your company uses, confirm AI-generated capability profiles, and identify overlap hypotheses before a renewal conversation.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(true)}</span>
            <div className="playground-card-actions"><button onClick={() => navigate('/playground/vendor-portfolio')} disabled={authLoading}>{user ? 'Map portfolio' : 'Sign in to start'} <ArrowRight size={16} /></button><button className="playground-discuss" onClick={() => navigate('/playground/community?tool=vendors')}>Discuss</button></div>
          </div>
        </article>

        <article className="playground-card certifications-card">
          <div className="playground-icon certifications"><Award size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Career intelligence</div>
            <h2>Certification Navigator</h2>
            <p>Explore verified certifications across technology, finance, insurance, teaching, quality, and more—organized by level, requirements, cost, and authority.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(false)}</span>
            <div className="playground-card-actions"><button onClick={() => navigate('/certifications')}>Explore catalog <ArrowRight size={16} /></button><button className="playground-discuss" onClick={() => navigate('/playground/community?tool=certifications')}>Discuss</button></div>
          </div>
        </article>

        <article className="playground-card compass-card">
          <div className="playground-icon compass"><ClipboardCheck size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Private assessment</div>
            <h2>CAIO Compass</h2>
            <p>Assess AI maturity across vision, strategy, metrics, governance, people, processes, and technology—then get a focused 90-day starting point.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(true)}</span>
            <div className="playground-card-actions"><button onClick={() => navigate('/playground/caio-compass')} disabled={authLoading}>{user ? 'Start assessment' : 'Sign in to start'} <ArrowRight size={16} /></button><button className="playground-discuss" onClick={() => navigate('/playground/community?tool=compass')}>Discuss</button></div>
          </div>
        </article>

        <article className="playground-card featured">
          <div className="playground-icon signals"><Activity size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Private app</div>
            <h2>Fitbit Health Analytics</h2>
            <p>Connect your Fitbit securely to explore personal sleep, recovery, activity, and heart-rate signals. Your data stays private to you.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(true)}</span>
            <div className="playground-card-actions"><button onClick={openPersonalSignals} disabled={authLoading}>{user ? 'Open Personal Signals' : 'Sign in to access'} <ArrowRight size={16} /></button><button className="playground-discuss" onClick={() => navigate('/playground/community?tool=health')}>Discuss</button></div>
          </div>
        </article>

        <article className="playground-card community-card">
          <div className="playground-icon projects"><Sparkles size={22} /></div>
          <div className="playground-card-copy">
            <div className="playground-label">Community workspace</div>
            <h2>Playground Community</h2>
            <p>Suggest new tools, ask questions, and share practical learnings from every AI Playground experiment.</p>
          </div>
          <div className="playground-card-footer">
            <span>{accessStatus(false)}</span>
            <button onClick={() => navigate('/playground/community')}>
              Join the discussion <ArrowRight size={16} />
            </button>
          </div>
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
