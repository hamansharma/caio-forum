import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, CalendarClock, Check, Flag, Hourglass, Link2, Lock, Pencil, Share2, Trash2 } from 'lucide-react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import PageGuide from '../components/PageGuide';
import InlineConfirm from '../components/InlineConfirm';
import usePageMeta from '../hooks/usePageMeta';
import { PAGE_META } from '../data/pageMeta';
import {
  COLORS, PREDICTIONS_PER_MEMBER, START_SIZE, TEXT_MAX, TOPICS,
  allCanvasYears, canPlaceAt, cellId, continueSentence, currentYear, defaultCanvasYear, editableUntil, isCanvasYear, isOpen, isOutlineCell, isRevealed, outlineCells, predictionPath,
} from '../data/timeCapsule';
import './TimeCapsule.css';

async function capsuleApi(action, body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in first.');
  const response = await fetch(`/api/time-capsule?action=${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}

const formatDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const hoursLeft = prediction => Math.max(0, Math.ceil((editableUntil(prediction.createdAt) - Date.now()) / 3600000));
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Whole days until a canvas closes (midnight UTC on January 1 of its year).
const daysUntilClose = year => Math.ceil((Date.UTC(year, 0, 1) - Date.now()) / 86400000);
// "61 days from now" within a year; "about 4 years from now" further out.
const timeUntilClose = year => {
  const days = daysUntilClose(year);
  if (days <= 366) return `${days} day${days === 1 ? '' : 's'} from now`;
  const years = Math.round(days / 365.25);
  return `about ${years} year${years === 1 ? '' : 's'} from now`;
};

function SharePrediction({ year, cell }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${predictionPath(year, cell)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copy this link', url); }
  };
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  return (
    <div className="capsule-share" aria-label="Share this prediction">
      <button type="button" className="capsule-secondary" onClick={copy}>{copied ? <><Check size={13} /> Link copied</> : <><Link2 size={13} /> Copy link</>}</button>
      <a className="capsule-secondary" href={linkedIn} target="_blank" rel="noopener noreferrer"><Share2 size={13} /> Share on LinkedIn</a>
    </div>
  );
}

// Prediction counts for every canvas, for the year picker: { [year]: count }.
function useCanvasCounts() {
  const [counts, setCounts] = useState({});
  useEffect(() => onSnapshot(collection(db, 'timeCapsules'),
    snapshot => setCounts(Object.fromEntries(snapshot.docs.map(item => [item.id, item.get('count') || 0]))), () => {}), []);
  return counts;
}

// Live data for one canvas: { size, predictions: Map(cell → prediction) }. A
// prediction's `text` is filled in only where Firestore lets this visitor read
// it: everyone's after the canvas is revealed, otherwise only their own.
function useCanvas(year, uid) {
  const [size, setSize] = useState(START_SIZE);
  const [predictions, setPredictions] = useState(null);
  useEffect(() => {
    setPredictions(null);
    const ref = doc(db, 'timeCapsules', String(year));
    const stopCapsule = onSnapshot(ref, snapshot => setSize(snapshot.get('size') || START_SIZE), () => {});
    const stopPredictions = onSnapshot(collection(ref, 'predictions'),
      snapshot => setPredictions(new Map(snapshot.docs.map(item => [item.id, { cell: item.id, ...item.data() }]))),
      () => setPredictions(new Map()));
    return () => { stopCapsule(); stopPredictions(); };
  }, [year]);

  const [texts, setTexts] = useState({});
  useEffect(() => {
    setTexts({});
    const sealed = collection(db, 'timeCapsules', String(year), 'sealed');
    const source = isRevealed(year) ? sealed : uid ? query(sealed, where('authorUid', '==', uid)) : null;
    if (!source) return undefined;
    return onSnapshot(source, snapshot => setTexts(Object.fromEntries(snapshot.docs.map(item => [item.id, item.get('text')]))), () => {});
  }, [year, uid]);

  const merged = useMemo(() => (predictions
    ? new Map([...predictions].map(([cell, item]) => [cell, texts[cell] !== undefined ? { ...item, text: texts[cell] } : item]))
    : null), [predictions, texts]);
  return { size, predictions: merged };
}

// How many predictions the signed-in member has left this calendar year.
function usePredictionsLeft(user) {
  const [used, setUsed] = useState(0);
  const thisYear = currentYear();
  useEffect(() => {
    if (!user) return undefined;
    return onSnapshot(doc(db, 'timeCapsuleMembers', user.uid), snapshot => setUsed(snapshot.get(`counts.${thisYear}`) || 0), () => {});
  }, [user, thisYear]);
  return user ? Math.max(0, PREDICTIONS_PER_MEMBER - used) : 0;
}

// The pixel canvas. Coordinates are centred on 0,0 (see src/data/timeCapsule.js).
function CapsuleCanvas({ year, size, predictions, selected, spot, onCell }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  const [themeTick, setThemeTick] = useState(0);
  const outline = outlineCells(year);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(560, entry.contentRect.width)));
    observer.observe(wrapRef.current);
    // Redraw when the site theme changes (Navbar sets data-theme).
    const themeObserver = new MutationObserver(() => setThemeTick(tick => tick + 1));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { observer.disconnect(); themeObserver.disconnect(); };
  }, []);

  const cellSize = Math.max(3, Math.floor(width / size));
  const half = size / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width) return;
    const ratio = window.devicePixelRatio || 1;
    const pixels = cellSize * size;
    canvas.width = pixels * ratio;
    canvas.height = pixels * ratio;
    canvas.style.width = `${pixels}px`;
    canvas.style.height = `${pixels}px`;
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = cssVar('--bg-input');
    context.fillRect(0, 0, pixels, pixels);
    const gap = cellSize >= 6 ? 1 : 0;
    const paint = (cell, color) => {
      const [x, y] = cell.split('_').map(Number);
      context.fillStyle = color;
      context.fillRect((x + half) * cellSize + gap, (y + half) * cellSize + gap, cellSize - gap * 2, cellSize - gap * 2);
    };
    const faint = cssVar('--border-light');
    outline.forEach(cell => paint(cell, faint));
    const muted = cssVar('--text-muted');
    predictions?.forEach(item => paint(item.cell, item.hidden ? muted : COLORS[item.color] || COLORS[0]));
    const ring = (cell, color, line) => {
      if (!cell) return;
      const [x, y] = cell.split('_').map(Number);
      context.strokeStyle = color;
      context.lineWidth = line;
      context.strokeRect((x + half) * cellSize + line / 2, (y + half) * cellSize + line / 2, cellSize - line, cellSize - line);
    };
    ring(hover, cssVar('--text-secondary'), 1);
    ring(spot, cssVar('--accent'), 2);
    ring(selected, cssVar('--text-primary'), 2);
  }, [width, cellSize, size, half, outline, predictions, hover, spot, selected, themeTick]);

  const cellAt = event => {
    const box = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((event.clientX - box.left) / cellSize) - half;
    const y = Math.floor((event.clientY - box.top) / cellSize) - half;
    return x >= -half && x < half && y >= -half && y < half ? cellId(x, y) : null;
  };

  return (
    <div className="capsule-canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="capsule-canvas" role="img"
        aria-label={`Canvas of predictions due by the end of ${year}, with ${predictions?.size || 0} predictions. The list below has every prediction.`}
        onClick={event => { const cell = cellAt(event); if (cell) onCell(cell); }}
        onMouseMove={event => setHover(cellAt(event))} onMouseLeave={() => setHover(null)} />
    </div>
  );
}

function YearPicker({ year, counts, onChange }) {
  return (
    <section className="capsule-years" aria-labelledby="capsule-years-title">
      <h2 id="capsule-years-title">Comes true by the end of</h2>
      <div className="capsule-year-list">
        {allCanvasYears().map(option => (
          <button key={option} type="button" className={option === year ? 'active' : ''} aria-pressed={option === year} onClick={() => onChange(option)}>
            <strong>{option}</strong>
            <span>{counts[option] || 0}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PredictionForm({ year, initial, spot, submitLabel, onSubmit, onCancel }) {
  const [text, setText] = useState(initial?.text || '');
  const [topic, setTopic] = useState(initial?.topic || '');
  const [color, setColor] = useState(initial?.color ?? 0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (!spot) { setError('Click an empty pixel on the canvas to choose your spot.'); return; }
    if (!topic) { setError('Choose a topic.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ text, topic, color });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="capsule-form" onSubmit={submit}>
      <label htmlFor="capsule-text">Your prediction</label>
      {/* The fixed lead-in and the text box read as one sentence. */}
      <div className="capsule-sentence">
        <span className="capsule-sentence-lead" aria-hidden="true">By the end of {year},</span>
        <textarea id="capsule-text" rows={3} maxLength={TEXT_MAX} value={text} onChange={event => { setText(event.target.value); setError(''); }}
          aria-label={`By the end of ${year}, …`} placeholder="most US hospitals will use AI scribes in outpatient visits." />
      </div>
      <div className="capsule-form-hint">Make it specific enough to check. {TEXT_MAX - text.length} characters left.</div>
      <label>Topic
        <select value={topic} onChange={event => { setTopic(event.target.value); setError(''); }}>
          <option value="">Choose…</option>
          {TOPICS.map(option => <option key={option}>{option}</option>)}
        </select>
      </label>
      <fieldset className="capsule-colors">
        <legend>Pixel color</legend>
        {COLORS.map((swatch, index) => (
          <button key={swatch} type="button" className={color === index ? 'active' : ''} style={{ background: swatch }}
            aria-label={`Color ${index + 1}`} aria-pressed={color === index} onClick={() => setColor(index)} />
        ))}
      </fieldset>
      {!initial && <div className="capsule-spot">{spot ? 'Pixel chosen. Click another one to move it.' : 'Now choose your pixel on the canvas.'}</div>}
      {error && <div className="capsule-error">{error}</div>}
      <div className="capsule-form-actions">
        <button type="submit" className="capsule-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="capsule-secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

function PredictionDetail({ prediction, year, user, onEdit, onDeleted }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('');
  const mine = user?.uid === prediction.authorUid;
  const editable = mine && !prediction.hidden && hoursLeft(prediction) > 0;

  const remove = async () => {
    try { await capsuleApi('delete', { year, cell: prediction.cell }); onDeleted(); } catch (err) { setStatus(err.message); setConfirmDelete(false); }
  };
  const report = async event => {
    event.preventDefault();
    try { await capsuleApi('report', { year, cell: prediction.cell, reason }); setReporting(false); setStatus('Reported. A moderator will take a look.'); } catch (err) { setStatus(err.message); }
  };

  return (
    <section className="capsule-card" aria-live="polite">
      <div className="capsule-detail-meta">
        <span><span className="capsule-dot" style={{ background: prediction.hidden ? 'var(--text-muted)' : COLORS[prediction.color] }} />u/{prediction.author} · {prediction.topic}</span>
        <span className="capsule-chip">Predicted in {prediction.madeIn}</span>
      </div>
      {prediction.hidden ? <p className="capsule-detail-text removed">[removed by moderator]</p>
        : prediction.text === undefined ? (
          <div className="capsule-sealed">
            <Lock size={16} aria-hidden="true" />
            <div><strong>Sealed until Jan 1, {year + 1}</strong><span>A prediction about {prediction.topic.toLowerCase()}, due by the end of {year}. It's revealed when AI reviews this canvas.</span></div>
          </div>
        ) : (
          <>
            <p className="capsule-detail-text"><span className="capsule-detail-by">By the end of {year},</span> {continueSentence(prediction.text)}</p>
            {mine && !isRevealed(year) && <p className="capsule-muted capsule-only-you"><Lock size={12} aria-hidden="true" /> Sealed: only you can see this until Jan 1, {year + 1}.</p>}
          </>
        )}
      <div className="capsule-detail-foot">
        <span><Hourglass size={13} aria-hidden="true" /> AI review on Jan 1, {year + 1}</span>
        <span>Added {formatDate(prediction.createdAt)}</span>
      </div>
      {!prediction.hidden && <SharePrediction year={year} cell={prediction.cell} />}
      {editable && !confirmDelete && (
        <div className="capsule-detail-actions">
          <button type="button" className="capsule-secondary" onClick={onEdit}><Pencil size={13} /> Edit</button>
          <button type="button" className="capsule-secondary" onClick={() => setConfirmDelete(true)}><Trash2 size={13} /> Delete</button>
          <span className="capsule-muted"><Lock size={12} aria-hidden="true" /> Locks in {hoursLeft(prediction)} h</span>
        </div>
      )}
      {confirmDelete && <InlineConfirm message="Delete this prediction and free the pixel?" onConfirm={remove} onCancel={() => setConfirmDelete(false)} />}
      {user && !mine && !prediction.hidden && prediction.text !== undefined && !reporting && (
        <button type="button" className="capsule-link" onClick={() => setReporting(true)}><Flag size={12} /> Report</button>
      )}
      {reporting && (
        <form className="capsule-report" onSubmit={report}>
          <input value={reason} maxLength={500} onChange={event => setReason(event.target.value)} placeholder="What's wrong with it? (optional)" aria-label="Reason for reporting" />
          <button type="submit" className="capsule-secondary">Send report</button>
          <button type="button" className="capsule-link" onClick={() => setReporting(false)}>Cancel</button>
        </form>
      )}
      {status && <div className="capsule-muted">{status}</div>}
    </section>
  );
}

export default function TimeCapsule() {
  usePageMeta(PAGE_META.timeCapsule.title, PAGE_META.timeCapsule.description, { canonicalPath: PAGE_META.timeCapsule.path });
  const { user, authLoading } = useForum();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('year'));
  const year = isCanvasYear(requested) ? requested : defaultCanvasYear();
  const open = isOpen(year);
  const counts = useCanvasCounts();
  const { size, predictions } = useCanvas(year, user?.uid);
  const left = usePredictionsLeft(user);

  // A shared link (?year=2027&p=0_0) opens with that prediction selected.
  const [selected, setSelected] = useState(() => params.get('p'));
  const [spot, setSpot] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [notice, setNotice] = useState('');

  const list = useMemo(() => [...(predictions?.values() || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [predictions]);
  const canAdd = open && user?.emailVerified && left > 0;
  // Digits first: until every pixel of the year is taken, new predictions go on the grey digits.
  const outlineTotal = outlineCells(year).size;
  const outlineTaken = predictions ? [...predictions.keys()].filter(cell => isOutlineCell(year, cell)).length : 0;
  const fillingDigits = outlineTaken < outlineTotal;
  const [hint, setHint] = useState('');
  const selectedPrediction = selected ? predictions?.get(selected) : null;

  const changeYear = next => {
    setParams(next === defaultCanvasYear() ? {} : { year: String(next) }, { replace: true });
    setSelected(null);
    setSpot(null);
    setEditing(false);
    setNotice('');
    setHint('');
  };

  const onCell = useCallback(cell => {
    setHint('');
    if (predictions?.has(cell)) { setSelected(cell); setEditing(false); setNotice(''); return; }
    setSelected(null);
    setEditing(false);
    if (!canAdd) return;
    if (!canPlaceAt(year, cell, outlineTaken)) { setHint('Fill in the year first: choose one of the grey pixels.'); return; }
    setSpot(cell);
  }, [predictions, canAdd, year, outlineTaken]);

  const place = async fields => {
    const [x, y] = spot.split('_').map(Number);
    const { cell } = await capsuleApi('place', { ...fields, year, x, y });
    setSpot(null);
    setSelected(cell);
    setNotice(`You're on the record. Your prediction is sealed until Jan 1, ${year + 1}; share the link and people can open it then. You can edit or delete it for the next 24 hours.`);
  };
  const saveEdit = async fields => {
    await capsuleApi('edit', { ...fields, year, cell: selected });
    setEditing(false);
  };

  let addPanel = null;
  if (!open) {
    addPanel = <section className="capsule-card capsule-note"><Lock size={15} aria-hidden="true" /> This canvas closed to new predictions on Dec 31, {year - 1}. AI reviews it on January 1, {year + 1}.</section>;
  } else if (!user) {
    addPanel = <section className="capsule-card capsule-note">Add up to {PREDICTIONS_PER_MEMBER} predictions a year about AI.<button type="button" className="capsule-primary" onClick={() => setShowAuth(true)} disabled={authLoading}>Sign in to add yours</button></section>;
  } else if (!user.emailVerified) {
    addPanel = <section className="capsule-card capsule-note">Verify your email to add predictions. Use the banner at the top of the page to resend the link.</section>;
  } else if (!left) {
    addPanel = <section className="capsule-card capsule-note">You've added all {PREDICTIONS_PER_MEMBER} of your predictions for {currentYear()}. You get {PREDICTIONS_PER_MEMBER} more on January 1.</section>;
  } else if (!editing) {
    addPanel = (
      <section className="capsule-card">
        <h2>Add your prediction <span className="capsule-muted">· {left} left this year</span></h2>
        <PredictionForm key={`new-${year}`} year={year} spot={spot} submitLabel="Make my call" onSubmit={place} />
      </section>
    );
  }

  return (
    <main className="capsule-page">
      <Link to="/playground" className="capsule-back"><ArrowLeft size={14} /> AI Playground</Link>
      <header className="capsule-header">
        <span className="capsule-eyebrow"><Hourglass size={14} aria-hidden="true" /> AI Time Capsule</span>
        <h1>Put your AI predictions on the record</h1>
        <p>AI leaders talk about where AI is going. Few write it down. Pick a year, claim a pixel, and seal your call in the capsule. When that year ends, the canvas opens, AI reviews every prediction on it, and we find out who saw it coming.</p>
        <ul className="capsule-benefits">
          <li><CalendarClock size={18} aria-hidden="true" /><span><strong>Get credit for being early.</strong> Every prediction is dated and sealed until its year ends. When it opens and comes true, the record shows you called it.</span></li>
          <li><Award size={18} aria-hidden="true" /><span><strong>Build your forecaster record.</strong> Correct calls will earn a &ldquo;Called it&rdquo; badge on your profile, and your hit rate builds over the years.</span></li>
          <li><Lock size={18} aria-hidden="true" /><span><strong>Only {PREDICTIONS_PER_MEMBER} a year.</strong> Pick your best calls. Each pixel stays on the canvas for good.</span></li>
        </ul>
      </header>

      <YearPicker year={year} counts={counts} onChange={changeYear} />

      <div className="capsule-layout">
        <div>
          <div className="capsule-canvas-title">
            <h2>Due by the end of {year}</h2>
            <span className="capsule-muted">
              {predictions ? `${predictions.size} prediction${predictions.size === 1 ? '' : 's'}` : 'Loading…'} · {size}×{size} · {open ? `open until Dec 31, ${year - 1}` : 'closed'} · AI review Jan 1, {year + 1}
            </span>
          </div>
          {open && (
            <div className="capsule-countdown"><CalendarClock size={15} aria-hidden="true" />
              <span>Predictions about the end of {year} must be in by <strong>Dec 31, {year - 1}</strong>, {timeUntilClose(year)}, so every call is made at least a year ahead. Make yours early to get the earliest date on record.</span>
            </div>
          )}
          <CapsuleCanvas year={year} size={size} predictions={predictions} selected={selected} spot={spot} onCell={onCell} />
          {hint && <p className="capsule-hint" role="status">{hint}</p>}
          <p className="capsule-muted capsule-canvas-help">
            {!canAdd ? 'Click a colored pixel to read the prediction.'
              : fillingDigits ? `Click a grey pixel in the year to place yours (${outlineTotal - outlineTaken} of ${outlineTotal} left). Once the year is filled in, the rest of the canvas opens.`
                : 'Click a colored pixel to read it, or any empty one to place yours.'}
          </p>
        </div>

        <div className="capsule-side">
          {notice && <div className="capsule-notice">{notice}</div>}
          {selectedPrediction && !editing && (
            <PredictionDetail key={`${year}-${selected}`} prediction={selectedPrediction} year={year} user={user}
              onEdit={() => { setEditing(true); setNotice(''); }}
              onDeleted={() => { setSelected(null); setNotice('Prediction deleted. The pixel is free again, and you have the prediction back.'); }} />
          )}
          {editing && selectedPrediction && (
            <section className="capsule-card">
              <h2>Edit your prediction</h2>
              <PredictionForm key={`edit-${year}-${selected}`} year={year} initial={selectedPrediction} spot={selected} submitLabel="Save changes"
                onSubmit={saveEdit} onCancel={() => setEditing(false)} />
            </section>
          )}
          {addPanel}
        </div>
      </div>

      <section className="capsule-list" aria-labelledby="capsule-list-title">
        <h2 id="capsule-list-title">All predictions due by the end of {year}</h2>
        {!predictions ? <p className="capsule-muted">Loading…</p> : !list.length ? <p className="capsule-muted">No predictions for {year} yet.{open ? ' Be the first to add one.' : ''}</p> : (
          <ul>
            {list.map(item => (
              <li key={item.cell}>
                <button type="button" className={selected === item.cell ? 'active' : ''} onClick={() => { setSelected(item.cell); setEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <span className="capsule-dot" style={{ background: item.hidden ? 'var(--text-muted)' : COLORS[item.color] }} />
                  <span className={`capsule-list-text ${item.text === undefined ? 'sealed' : ''}`}>{item.hidden ? '[removed by moderator]' : item.text === undefined ? <><Lock size={12} aria-hidden="true" /> Sealed prediction · {item.topic}</> : item.text}</span>
                  <span className="capsule-muted">u/{item.author} · predicted in {item.madeIn}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <PageGuide id="timeCapsule" />
    </main>
  );
}
