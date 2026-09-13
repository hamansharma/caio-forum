import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, ClipboardCheck, LockKeyhole, RotateCcw, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import { compassDimensions, maturityLabels, roadmapActions } from '../data/caioCompass';
import './CaioCompass.css';

const DRAFT_KEY = 'caio-compass-draft-v1';

async function authenticatedFetch(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } });
}

async function readApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The CAIO Compass assessment service is not deployed yet. Deploy the API files with this release, then try again.');
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Unable to process this assessment.');
  return body;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function CaioCompass() {
  const { user, authLoading } = useForum();
  const [showAuth, setShowAuth] = useState(false);
  const [step, setStep] = useState(0);
  const [organizationName, setOrganizationName] = useState('');
  const [answers, setAnswers] = useState({});
  const [assessment, setAssessment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dimension = compassDimensions[step];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === compassDimensions.length * 3;
  const currentComplete = dimension?.questions.every(question => answers[question.id]);

  useEffect(() => {
    try {
      const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft?.answers) {
        setAnswers(draft.answers);
        setOrganizationName(draft.organizationName || '');
      }
    } catch { /* Ignore an invalid local draft. */ }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, organizationName }));
  }, [answers, organizationName]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingHistory(true);
    authenticatedFetch('/api/caio-compass/assessments')
      .then(async response => {
        const body = await readApiResponse(response);
        if (active) setHistory(body.assessments || []);
      })
      .catch(fetchError => active && setError(fetchError.message || 'Unable to load your previous assessments.'))
      .finally(() => active && setLoadingHistory(false));
    return () => { active = false; };
  }, [user]);

  const priorities = useMemo(() => {
    if (!assessment) return [];
    return assessment.priorityDomainIds.map(id => compassDimensions.find(item => item.id === id)).filter(Boolean);
  }, [assessment]);

  const chooseLevel = (questionId, level) => setAnswers(current => ({ ...current, [questionId]: level }));

  const saveAssessment = async () => {
    if (!allAnswered || saving) return;
    setSaving(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/caio-compass/assessments', {
        method: 'POST', body: JSON.stringify({ organizationName, answers }),
      });
      const body = await readApiResponse(response);
      setAssessment(body.assessment);
      setHistory(current => [body.assessment, ...current]);
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this assessment.');
    } finally { setSaving(false); }
  };

  const restart = () => {
    setAssessment(null); setAnswers({}); setOrganizationName(''); setStep(0); setError('');
    window.localStorage.removeItem(DRAFT_KEY);
  };

  if (authLoading) return <main className="compass-page"><p>Loading…</p></main>;
  if (!user) return (
    <main className="compass-page">
      <section className="compass-hero compass-locked">
        <span className="compass-kicker"><Target size={15} /> CAIO Leadership Lab</span>
        <h1>CAIO Compass</h1>
        <p>A private, evidence-led AI maturity assessment across the seven building blocks of a healthy AI program.</p>
        <button className="compass-primary" onClick={() => setShowAuth(true)}><LockKeyhole size={16} /> Sign in to start</button>
        <Link className="compass-text-link" to="/playground">Back to AI Playground</Link>
      </section>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );

  if (assessment) return <Results assessment={assessment} priorities={priorities} onRestart={restart} />;

  return (
    <main className="compass-page">
      <section className="compass-hero compact">
        <span className="compass-kicker"><Target size={15} /> CAIO Leadership Lab</span>
        <h1>CAIO Compass</h1>
        <p>Assess your current AI capability, see the shape of your maturity, and leave with a practical place to begin.</p>
      </section>

      <section className="compass-shell">
        <aside className="compass-sidebar" aria-label="Assessment sections">
          <span className="compass-progress-copy">{answeredCount} of 21 answered</span>
          {compassDimensions.map((item, index) => {
            const complete = item.questions.every(question => answers[question.id]);
            return <button key={item.id} className={`compass-step ${index === step ? 'active' : ''}`} onClick={() => setStep(index)}>
              <span>{index + 1}</span>{item.label}{complete && <Check size={15} />}
            </button>;
          })}
        </aside>

        <section className="compass-form">
          <div className="compass-form-topline"><span>Building block {step + 1} of 7</span><span>{dimension.label}</span></div>
          {step === 0 && <label className="compass-org-label">Organization or team <span>(optional)</span><input value={organizationName} maxLength="120" onChange={event => setOrganizationName(event.target.value)} placeholder="e.g., Northstar Operations" /></label>}
          <h2>{dimension.label}</h2>
          <p className="compass-instruction">Choose the statement that most closely reflects today—not the aspiration. Your score is calculated from these selections, not generated by AI.</p>
          <details className="compass-maturity-guide">
            <summary>What do the maturity levels mean?</summary>
            <div>
              <p><strong>1 — Aware:</strong> AI challenges are recognized, but there is little shared direction or repeatable capability.</p>
              <p><strong>2 — Reactive:</strong> Adoption is tactical and siloed, usually responding to individual needs or opportunities.</p>
              <p><strong>3 — Proactive:</strong> AI initiatives are becoming coordinated, strategic, and supported by emerging standards.</p>
              <p><strong>4 — Managed:</strong> Enterprise-wide governance, operations, and measurable value delivery are established.</p>
              <p><strong>5 — Optimized:</strong> AI is embedded in strategy and operations, with continuous improvement across the portfolio.</p>
            </div>
          </details>
          <div className="compass-questions">
            {dimension.questions.map((question, questionIndex) => <fieldset className="compass-question" key={question.id}>
              <legend><span>{questionIndex + 1}</span>{question.prompt}</legend>
              <div className="compass-levels">
                {maturityLabels.map((label, index) => {
                  const level = index + 1;
                  return <button type="button" key={label} className={answers[question.id] === level ? 'selected' : ''} onClick={() => chooseLevel(question.id, level)} aria-pressed={answers[question.id] === level}>
                    <strong>{level}</strong><small>{label}</small>
                  </button>;
                })}
              </div>
            </fieldset>)}
          </div>
          {error && <p className="compass-error">{error}</p>}
          <div className="compass-controls">
            <button className="compass-secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}><ArrowLeft size={16} /> Previous</button>
            {step < compassDimensions.length - 1 ? <button className="compass-primary" disabled={!currentComplete} onClick={() => setStep(value => value + 1)}>Continue <ArrowRight size={16} /></button> : <button className="compass-primary" disabled={!allAnswered || saving} onClick={saveAssessment}>{saving ? 'Saving assessment…' : <><ClipboardCheck size={16} /> See my maturity profile</>}</button>}
          </div>
        </section>
      </section>

      <History history={history} loading={loadingHistory} onOpen={setAssessment} />
    </main>
  );
}

function Results({ assessment, priorities, onRestart }) {
  const maxScore = 5;
  return <main className="compass-page compass-results-page">
    <section className="compass-hero compact">
      <span className="compass-kicker"><Sparkles size={15} /> Saved assessment</span>
      <h1>{assessment.organizationName || 'Your'} AI maturity profile</h1>
      <p>{assessment.health.summary}</p>
    </section>
    <section className="compass-result-summary">
      <div className="compass-score"><span>Overall maturity</span><strong>{assessment.overallScore.toFixed(1)}</strong><small>out of 5 · {assessment.stage.label}</small></div>
      <div className="compass-health"><span>Program health</span><strong>{assessment.health.label}</strong><p>Based on your current maturity level and how balanced the seven capabilities are.</p></div>
    </section>
    <section className="compass-results-grid">
      <div className="compass-domain-card"><h2><BarChart3 size={18} /> Capability profile</h2><p>Each score comes directly from your answers.</p>
        <div className="compass-bars">{assessment.domains.map(domain => <div className="compass-bar" key={domain.id}><div><span>{domain.label}</span><strong>{domain.score.toFixed(1)}</strong></div><i><b style={{ width: `${(domain.score / maxScore) * 100}%` }} /></i></div>)}</div>
      </div>
      <div className="compass-roadmap-card"><h2><Target size={18} /> Your first 90 days</h2><p>Start with the weakest capabilities; they are most likely to constrain safe, repeatable scale.</p>
        <ol>{priorities.map((domain, index) => <li key={domain.id}><span>{index + 1}</span><div><strong>{domain.label}</strong><p>{roadmapActions[domain.id][0]}</p><p>{roadmapActions[domain.id][1]}</p></div></li>)}</ol>
      </div>
    </section>
    <section className="compass-next"><div><h2>What this assessment does—and does not—say</h2><p>This is a transparent starting point, not a certification. Use it to structure leadership conversations, gather evidence, and reassess after the roadmap work is underway.</p></div><button className="compass-secondary" onClick={onRestart}><RotateCcw size={16} /> Start a new assessment</button></section>
  </main>;
}

function History({ history, loading, onOpen }) {
  if (loading || !history.length) return null;
  return <section className="compass-history"><h2>Previous assessments</h2><div>{history.slice(0, 4).map(item => <button key={item.id} onClick={() => onOpen(item)}><span>{item.organizationName || 'Untitled assessment'}</span><small>{formatDate(item.createdAt)} · {item.overallScore.toFixed(1)} / 5 · {item.stage.label}</small><ArrowRight size={16} /></button>)}</div></section>;
}
