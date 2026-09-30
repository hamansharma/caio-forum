import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, CircleAlert, ClipboardCheck, History, Lightbulb, LockKeyhole, MessageCircle, RotateCcw, Scale, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { analyzeSensitivity, assessDecision, businessCaseOptions, decisionPaths, decisionQuestions, resultGuidance } from '../data/buildBuyDecision';
import { useForum } from '../context/ForumContext';
import { db } from '../firebase';
import usePageMeta from '../hooks/usePageMeta';
import './BuildBuyDecision.css';
import './BuildBuyDecisionOverrides.css';

const formatDate = value => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const LEGACY_LOCAL_HISTORY_KEY = 'caio-build-buy-decisions-v1';

export default function BuildBuyDecision() {
  usePageMeta('Build vs. Buy Decision Studio | CAIO Leadership Lab', 'Use a structured nine-factor assessment to evaluate whether an AI capability should be built, bought, or delivered as a hybrid solution.', { canonicalPath: '/playground/build-vs-buy' });
  const { user } = useForum();
  const [name, setName] = useState('');
  const [businessCase, setBusinessCase] = useState('');
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(-1);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeHistory, setActiveHistory] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savedDecisionKey = useRef(null);
  const current = decisionQuestions[step];
  const assessment = useMemo(() => assessDecision(answers, businessCase), [answers, businessCase]);
  const complete = step === decisionQuestions.length;
  const choose = id => setAnswers(currentAnswers => ({ ...currentAnswers, [current.id]: id }));
  const begin = () => { if (name.trim() && businessCase) setStep(0); };
  const decisionKey = `${name.trim()}|${businessCase}|${JSON.stringify(answers)}`;

  // Remove decisions created by the pre-account-history version of this tool.
  useEffect(() => {
    window.localStorage.removeItem(LEGACY_LOCAL_HISTORY_KEY);
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setHistoryOpen(false);
      return undefined;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid)).then(snapshot => {
      if (!cancelled) setHistory(Array.isArray(snapshot.data()?.buildBuyDecisions) ? snapshot.data().buildBuyDecisions : []);
    }).catch(() => {
      if (!cancelled) setHistory([]);
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!complete || activeHistory || !user || savedDecisionKey.current === decisionKey) return;
    savedDecisionKey.current = decisionKey;
    const entry = { id: `${Date.now()}`, name: name.trim(), businessCase, answers, assessment, createdAt: new Date().toISOString() };
    const next = [entry, ...history].slice(0, 12);
    setDoc(doc(db, 'users', user.uid), { buildBuyDecisions: next }, { merge: true }).then(() => {
      setHistory(next);
      setSaved(true);
      setSaveError(false);
    }).catch(() => {
      savedDecisionKey.current = null;
      setSaveError(true);
    });
  }, [activeHistory, answers, assessment, businessCase, complete, decisionKey, history, name, user]);
  const restart = () => { setName(''); setBusinessCase(''); setAnswers({}); setStep(-1); setActiveHistory(null); setSaved(false); setSaveError(false); savedDecisionKey.current = null; };
  const selectedHistory = activeHistory || null;
  const shownAssessment = selectedHistory?.assessment || assessment;
  const shownName = selectedHistory?.name || name;
  const shownAnswers = selectedHistory?.answers || answers;
  const shownBusinessCase = selectedHistory?.businessCase || businessCase;
  const showResult = complete || selectedHistory;
  const progress = step < 0 ? 0 : Math.min(step, decisionQuestions.length);

  return <main className="decision-page"><Link className="decision-back" to="/playground"><ArrowLeft size={15} /> AI Playground</Link>
    <section className="decision-hero"><div><span className="decision-eyebrow"><ClipboardCheck size={15} /> Structured decision</span><h1>Build vs. Buy Decision Studio</h1><p>Evaluate one AI initiative through strategic fit, readiness, risk, economics, and delivery constraints. The recommendation uses a transparent rubric—not an AI prompt.</p></div><div className="decision-hero-actions"><Link className="decision-discuss-link" to="/playground/community?tool=build-buy"><MessageCircle size={15} /> Discuss this tool</Link>{user && history.length > 0 && <button className="decision-history-button" onClick={() => setHistoryOpen(true)}><History size={16} /> Decision history <b>{history.length}</b></button>}</div></section>
    {!showResult && <section className="decision-workspace"><aside className="decision-progress"><span>Decision flow</span><ol><li className={step >= 0 ? 'complete' : 'active'}><b>{step >= 0 ? <CheckCircle2 size={15} /> : '1'}</b><div><strong>Frame the decision</strong><small>Use case and business context</small></div></li><li className={step > 0 ? 'complete' : step >= 0 ? 'active' : ''}><b>{step > 0 ? <CheckCircle2 size={15} /> : '2'}</b><div><strong>Assess nine factors</strong><small>{progress}/9 answered</small></div></li><li className={complete ? 'complete' : ''}><b>{complete ? <CheckCircle2 size={15} /> : '3'}</b><div><strong>Review recommendation</strong><small>Evidence and next steps</small></div></li></ol></aside><section className="decision-card">{step === -1 ? <><span className="decision-step">Step 1 of 3</span><h2>Frame the decision</h2><p>Start with one clearly bounded AI use case. A defined owner and measurable outcome strengthen the result, but you can continue even if they are still taking shape.</p><label>Decision name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g., AI-assisted customer support triage" /></label><fieldset><legend>Is the business problem measurable and sponsored?</legend>{businessCaseOptions.map(option => <label className={`decision-choice ${businessCase === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" name="businessCase" checked={businessCase === option.id} onChange={() => setBusinessCase(option.id)} /><span>{option.label}</span></label>)}</fieldset><button className="decision-primary" onClick={begin} disabled={!name.trim() || !businessCase}>Start assessment <ArrowRight size={16} /></button></> : <><div className="decision-question-top"><span className="decision-step">Question {step + 1} of {decisionQuestions.length}</span><span>{current.label}</span></div><div className="decision-meter"><i style={{ width: `${((step + 1) / decisionQuestions.length) * 100}%` }} /></div><h2>{current.prompt}</h2><div className="decision-options">{current.choices.map(choice => <button className={answers[current.id] === choice.id ? 'selected' : ''} key={choice.id} onClick={() => choose(choice.id)}><b>{choice.id.toUpperCase()}</b><span>{choice.label}</span></button>)}</div><div className="decision-navigation"><button className="decision-secondary" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}><ChevronLeft size={16} /> Back</button><button className="decision-primary" onClick={() => setStep(value => value + 1)} disabled={!answers[current.id]}>{step === decisionQuestions.length - 1 ? 'See recommendation' : 'Next question'} <ArrowRight size={16} /></button></div></>}</section></section>}
    {showResult && <DecisionResult name={shownName} assessment={shownAssessment} answers={shownAnswers} businessCase={shownBusinessCase} onRestart={restart} signedIn={Boolean(user)} saved={Boolean(selectedHistory) || saved} saveError={saveError} />}
    {user && historyOpen && <div className="decision-backdrop" onMouseDown={() => setHistoryOpen(false)}><aside className="decision-history-drawer" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Decision history"><button className="decision-close" onClick={() => setHistoryOpen(false)} aria-label="Close decision history"><X size={18} /></button><span className="decision-eyebrow"><History size={15} /> Account history</span><h2>Saved decisions</h2><p>Private to your CAIO Leadership account and available when you sign in.</p><div>{history.map(entry => <button key={entry.id} onClick={() => { setActiveHistory(entry); setHistoryOpen(false); }}><span>{formatDate(entry.createdAt)}</span><strong>{entry.name}</strong><small>{entry.assessment.status === 'recommendation' ? decisionPaths[entry.assessment.path].label : 'Needs more evidence'}</small></button>)}</div></aside></div>}
  </main>;
}

function DecisionResult({ name, assessment, answers, businessCase, onRestart, signedIn, saved, saveError }) {
  const businessCaseNotice = assessment.businessCaseNeedsDefinition && <div className="decision-business-case-notice"><CircleAlert size={18} /><div><strong>Business case still needs definition</strong><span>This recommendation is directional. Before committing, name the accountable owner, success measure, and decision timeline.</span></div></div>;
  const saveStatus = <SaveStatus signedIn={signedIn} saved={saved} saveError={saveError} />;
  if (assessment.status === 'clarify') return <section className="decision-result decision-clarify"><CircleAlert size={24} /><span className="decision-step">Before choosing an approach</span><h1>Clarify the business case first</h1><p>Define an accountable owner, measurable outcome, and decision timeline. Build, Buy, and Hybrid choices should follow that work—not substitute for it.</p><div className="decision-result-actions">{saveStatus}<button className="decision-primary" onClick={onRestart}>Refine the decision <RotateCcw size={16} /></button></div></section>;
  if (assessment.status === 'evidence') return <section className="decision-result decision-evidence"><Lightbulb size={24} /><span className="decision-step">Evidence required</span><h1>Do not force a recommendation yet</h1><p>{name} is closely balanced across the available paths. Validate vendor fit, lifecycle cost, differentiated data, and workflow integration before deciding.</p>{businessCaseNotice}<ScoreBars scores={assessment.scores} /><div className="decision-result-actions">{saveStatus}<button className="decision-primary" onClick={onRestart}>Start another decision <RotateCcw size={16} /></button></div></section>;
  const path = decisionPaths[assessment.path]; const guidance = resultGuidance[assessment.path];
  return <section className="decision-result"><span className="decision-step">Recommendation for {name}</span><div className="decision-result-title"><span style={{ background: path.color }}>{path.label}</span><div><h1>{guidance.title}</h1><p>{path.detail}</p></div></div>{businessCaseNotice}<ScoreBars scores={assessment.scores} /><div className="decision-result-grid"><section><span>Signals supporting this path</span>{assessment.signals.slice(0, 4).map(({ question, choice }) => <p key={question.id}><strong>{question.label}:</strong> {choice.label}</p>)}</section><section><span>Next actions</span><ol>{guidance.next.map(item => <li key={item}>{item}</li>)}</ol></section></div><SensitivityAnalysis answers={answers} businessCase={businessCase} /><div className="decision-result-actions">{saveStatus}<button className="decision-primary" onClick={onRestart}>New decision <RotateCcw size={16} /></button></div></section>;
}

function SaveStatus({ signedIn, saved, saveError }) {
  if (!signedIn) return <span className="decision-sign-in-prompt"><LockKeyhole size={16} /> Sign in to save this decision and access your history.</span>;
  if (saveError) return <span className="decision-save-error"><CircleAlert size={16} /> We could not save this decision. Please try again.</span>;
  if (saved) return <span className="decision-saved"><CheckCircle2 size={16} /> Saved to your account</span>;
  return <span className="decision-saved">Saving to your account…</span>;
}

function SensitivityAnalysis({ answers, businessCase }) {
  const levers = analyzeSensitivity(answers, businessCase);
  return <section className="decision-sensitivity"><div className="decision-sensitivity-heading"><Scale size={19} /><div><span>Decision sensitivity</span><h2>How stable is this recommendation?</h2><p>We tested what happens when one answer changes at a time. This reveals which assumptions could change the Build, Buy, or Hybrid result.</p></div></div>{levers.length > 0 ? <div className="decision-sensitivity-list">{levers.map(({ question, currentChoice, alternateChoice, outcome }) => <article key={`${question.id}-${alternateChoice.id}`}><span>{question.label}</span><p>If this changes from <strong>{currentChoice.label}</strong> to <strong>{alternateChoice.label}</strong>, it {outcome}.</p></article>)}</div> : <div className="decision-sensitivity-stable"><CheckCircle2 size={17} /><span>Your result stayed the same when any one answer was changed. It could still change if several assumptions shift together—for example, cost, timeline, and internal capability.</span></div>}</section>;
}

function ScoreBars({ scores }) { const max = Math.max(...Object.values(scores), 1); return <section className="decision-score-bars"><span>Decision signals</span>{Object.entries(decisionPaths).map(([key, path]) => <div key={key}><label><strong>{path.label}</strong><b>{scores[key]}</b></label><i><em style={{ width: `${(scores[key] / max) * 100}%`, background: path.color }} /></i></div>)}</section>; }
