import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Award, BookOpenCheck, CheckCircle2, ClipboardList, Filter, Flag, History, Info, Map, Search, SlidersHorizontal, Scale, X } from 'lucide-react';
import { certificationCategories } from '../data/certificationCategories';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import './Certifications.css';

const levels = ['Beginner', 'Intermediate', 'Advanced'];

export default function Certifications() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [selected, setSelected] = useState(null);
  const { user } = useForum();
  const [catalog, setCatalog] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState([null]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [comparisonReady, setComparisonReady] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [reporting, setReporting] = useState(null);
  const [showPathway, setShowPathway] = useState(false);
  const [showPathwayHistory, setShowPathwayHistory] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [achievedIds, setAchievedIds] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('certification-achievements') || '[]'); } catch { return []; }
  });
  const [achievementError, setAchievementError] = useState('');

  const visibleQuery = query.trim();

  useEffect(() => {
    const ids = [...new Set((new URLSearchParams(window.location.search).get('compare') || '').split(',').filter(id => /^[a-z0-9-]{1,160}$/i.test(id)))].slice(0, 3);
    if (!ids.length) {
      setComparisonReady(true);
      return;
    }
    fetch(`/api/certifications?ids=${encodeURIComponent(ids.join(','))}`)
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load the shared comparison.');
        return response.json();
      })
      .then(body => setComparison(body.entries || []))
      .catch(() => setComparisonError('Unable to load the shared comparison.'))
      .finally(() => setComparisonReady(true));
  }, []);

  useEffect(() => {
    if (!comparisonReady) return;
    const url = new URL(window.location.href);
    if (comparison.length) url.searchParams.set('compare', comparison.map(item => item.id).join(','));
    else url.searchParams.delete('compare');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [comparison, comparisonReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setCursors([null]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [visibleQuery, category, level]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(false);
    const params = new URLSearchParams();
    if (visibleQuery) params.set('q', visibleQuery);
    if (category !== 'All') params.set('category', category);
    if (level !== 'All') params.set('level', level);
    if (cursors[page - 1]) params.set('cursor', cursors[page - 1]);
    fetch(`/api/certifications?${params.toString()}`).then(async response => {
      if (!response.ok) throw new Error('Catalog request failed');
      return response.json();
    }).then(body => {
      if (!active) return;
      setCatalog(body.entries || []);
      setNextCursor(body.nextCursor || null);
      setCatalogTotal(Number.isInteger(body.totalEntries) ? body.totalEntries : null);
    }).catch(() => {
      if (!active) return;
      setCatalog([]);
      setNextCursor(null);
      setCatalogError(true);
    }).finally(() => active && setCatalogLoading(false));
    return () => { active = false; };
  }, [visibleQuery, category, level, page, cursors]);

  const goNext = () => {
    if (!nextCursor) return;
    setCursors(current => [...current.slice(0, page), nextCursor]);
    setPage(current => current + 1);
  };
  const toggleComparison = item => {
    setComparisonError('');
    setComparison(current => {
      if (current.some(entry => entry.id === item.id)) return current.filter(entry => entry.id !== item.id);
      if (current.length === 3) {
        setComparisonError('You can compare up to three certifications at a time.');
        return current;
      }
      return [...current, item];
    });
  };
  const toggleAchievement = async item => {
    setAchievementError('');
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/certifications?action=achievement', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ certificationId: item.id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setAchievedIds(current => {
        const next = body.achieved ? [...new Set([...current, item.id])] : current.filter(id => id !== item.id);
        window.localStorage.setItem('certification-achievements', JSON.stringify(next));
        return next;
      });
      setCatalog(current => current.map(entry => entry.id === item.id ? { ...entry, achievedCount: body.achievedCount } : entry));
    } catch (error) { setAchievementError(error.message || 'Unable to save your achievement.'); }
  };

  return <main className="certifications-page">
    <section className="certifications-hero"><span><Award size={15} /> CAIO Leadership Lab</span><h1>Certification Navigator</h1><p>Find credible credentials across technology, finance, education, operations, and more—then compare requirements, cost, authority, and renewal commitment before you invest. <span className="cert-methodology-wrap"><button className="cert-methodology-toggle" onClick={() => setShowMethodology(current => !current)} aria-expanded={showMethodology}><Info size={14} /> How this catalog is maintained</button>{showMethodology && <span className="cert-methodology-popover" role="status">We use direct links to issuing authorities and show the date each record was checked. Costs, requirements, and credential status can change; confirm details with the issuer before registering. Community suggestions are reviewed before publication.</span>}</span></p><div className="cert-hero-actions"><div className="cert-pathway-actions"><button className="cert-pathway-cta" onClick={() => user ? setShowPathway(true) : setShowAuth(true)}><Map size={17} /> Build my path <ArrowRight size={16} /></button><button className="cert-plan-button" onClick={() => user ? setShowPlan(true) : setShowAuth(true)}><ClipboardList size={16} /> My plan</button></div><button className="cert-history-button" onClick={() => user ? setShowPathwayHistory(true) : setShowAuth(true)}><History size={15} /> Path history</button></div><button className="cert-suggest-link" onClick={() => user ? setShowSuggestion(true) : setShowAuth(true)}>Know a credential we should include? <span>Suggest it <ArrowUpRight size={13} /></span></button></section>
    <section className="certifications-toolbar" aria-label="Certification filters"><label className="cert-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search certifications, skills, or roles" /></label><div className="cert-filter"><Filter size={15} /><select value={category} onChange={event => setCategory(event.target.value)}><option>All</option>{certificationCategories.map(item => <option key={item}>{item}</option>)}</select></div><div className="cert-filter"><SlidersHorizontal size={15} /><select value={level} onChange={event => setLevel(event.target.value)}><option>All</option>{levels.map(item => <option key={item}>{item}</option>)}</select></div></section>
    <section className="cert-compare-bar"><div><Scale size={17} /><strong>Compare credentials</strong><span>Select up to three to weigh the commitment side by side.</span></div><span className="cert-compare-count">{comparison.length}/3 selected</span></section>
    {!!comparison.length && <aside className="cert-compare-dock"><span><Scale size={16} /> {comparison.length} credential{comparison.length === 1 ? '' : 's'} selected</span><div><button className="cert-compare-reset" onClick={() => setComparison([])}>Reset</button><button onClick={() => setComparisonOpen(true)}>Compare <ArrowRight size={15} /></button></div></aside>}
    {comparisonError && <p className="cert-compare-error">{comparisonError}</p>}{achievementError && <p className="cert-compare-error">{achievementError}</p>}
    <section className="cert-results-head"><p><strong>{visibleQuery || category !== 'All' || level !== 'All' || !catalogTotal ? `${catalog.length} entries` : `${catalog.length} of ${catalogTotal} entries`}</strong> · Page {page}{!visibleQuery && category === 'All' && level === 'All' && catalogTotal ? ` of ${Math.ceil(catalogTotal / 24)}` : ''}{catalogLoading ? ' · Updating…' : ''}{catalogError ? ' · Catalog temporarily unavailable' : ''}</p><span>Every entry links directly to its issuing authority.</span></section>
    <section className="cert-grid" aria-busy={catalogLoading}>{catalog.map(item => { const achieved = achievedIds.includes(item.id); return <article className="cert-card" key={item.id}><div className="cert-card-top"><span className={`cert-level ${item.level.toLowerCase()}`}>{item.level}</span><div><span className="cert-status">{item.status || 'Active'}</span><span className="cert-type">{item.credentialType}</span></div></div><h2>{item.name}</h2><p className="cert-authority">{item.authority}</p><p className="cert-description">{item.description}</p><div className="cert-tags">{item.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}</div><button className={`cert-achievement-button ${achieved ? 'achieved' : ''}`} onClick={() => toggleAchievement(item)}>{achieved ? <CheckCircle2 size={14} /> : <Award size={14} />}{achieved ? 'I earned this' : 'I have this certification'}<span>{item.achievedCount ? `${item.achievedCount} achieved` : 'Be the first'}</span></button><label className="cert-compare-select"><input type="checkbox" checked={comparison.some(entry => entry.id === item.id)} onChange={() => toggleComparison(item)} disabled={comparison.length === 3 && !comparison.some(entry => entry.id === item.id)} /> Compare</label><button onClick={() => setSelected(item)}>View credential <ArrowUpRight size={15} /></button></article>; })}</section>
    {!catalogLoading && !catalog.length && <section className="cert-empty"><BookOpenCheck size={22} /><h2>No certifications match those filters</h2><p>Try a broader role, skill, or category.</p></section>}
    {(page > 1 || nextCursor) && <nav className="cert-pagination" aria-label="Certification catalog pages"><button onClick={() => setPage(current => current - 1)} disabled={page === 1}><ArrowLeft size={15} /> Previous</button><span>Page {page}</span><button onClick={goNext} disabled={!nextCursor}>Next <ArrowRight size={15} /></button></nav>}
    {selected && <CertificationDetail certification={selected} onClose={() => setSelected(null)} onReport={() => { setSelected(null); user ? setReporting(selected) : setShowAuth(true); }} />}
    {comparisonOpen && <CertificationComparison entries={comparison} onClose={() => setComparisonOpen(false)} onRemove={toggleComparison} />}
    {showSuggestion && <CertificationSuggestion onClose={() => setShowSuggestion(false)} />}
    {reporting && <CertificationReport certification={reporting} onClose={() => setReporting(null)} />}
    {showPathway && <CertificationPathway onClose={() => setShowPathway(false)} onViewCertification={item => { setShowPathway(false); setSelected(item); }} onOpenPlan={() => { setShowPathway(false); setShowPlan(true); }} />}
    {showPathwayHistory && <CertificationPathwayHistory onClose={() => setShowPathwayHistory(false)} onViewCertification={item => { setShowPathwayHistory(false); setSelected(item); }} />}
    {showPlan && <CertificationPlan onClose={() => setShowPlan(false)} />}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}

function CertificationDetail({ certification, onClose, onReport }) {
  const lastChecked = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${certification.lastVerified}T12:00:00`));
  return <div className="cert-detail-overlay" onClick={onClose}><aside className="cert-detail" onClick={event => event.stopPropagation()} aria-label={`${certification.name} details`}><button className="cert-close" onClick={onClose} aria-label="Close details"><X size={19} /></button><span className={`cert-level ${certification.level.toLowerCase()}`}>{certification.level}</span><h2>{certification.name}</h2><p className="cert-authority">Issued by {certification.authority}</p><p className="cert-detail-description">{certification.description}</p><dl><div><dt>Catalog status</dt><dd>{certification.status || 'Active'} · {certification.sourceType || 'Official issuer source'}</dd></div><div><dt>Credential type</dt><dd>{certification.credentialType}</dd></div><div><dt>Typical exam cost</dt><dd>{certification.cost}</dd></div><div><dt>Prerequisites</dt><dd>{certification.prerequisites}</dd></div><div><dt>Validity / renewal</dt><dd>{certification.validity}</dd></div><div><dt>Where it applies</dt><dd>{certification.geography}</dd></div><div><dt>Best for</dt><dd>{certification.targetRoles.join(' · ')}</dd></div></dl><section className="cert-detail-skills"><h3>Skills covered</h3>{certification.skills.map(skill => <span key={skill}>{skill}</span>)}</section><a className="cert-official-link" href={certification.officialUrl} target="_blank" rel="noreferrer">View official credential page <ArrowUpRight size={16} /></a><button className="cert-report-link" onClick={onReport}><Flag size={14} /> Report an issue</button><p className="cert-verified"><CheckCircle2 size={14} /> Official source last checked {lastChecked}</p></aside></div>;
}

function CertificationComparison({ entries, onClose, onRemove }) {
  const fields = [
    ['Level', entry => entry.level],
    ['Issued by', entry => entry.authority],
    ['Credential type', entry => entry.credentialType],
    ['Typical exam cost', entry => entry.cost],
    ['Prerequisites', entry => entry.prerequisites],
    ['Validity / renewal', entry => entry.validity],
    ['Where it applies', entry => entry.geography],
    ['Best for', entry => entry.targetRoles.join(' · ')],
    ['Skills covered', entry => entry.skills.join(' · ')],
  ];
  const gridStyle = { '--comparison-count': entries.length };
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-comparison" onClick={event => event.stopPropagation()} aria-label="Certification comparison"><button className="cert-close" onClick={onClose} aria-label="Close comparison"><X size={19} /></button><span className="cert-comparison-kicker"><Scale size={15} /> Certification comparison</span><h2>Make the trade-offs visible</h2><p>Compare the investment, eligibility, and career fit before committing to a credential.</p><div className="cert-comparison-table"><div className="cert-comparison-row cert-comparison-heading" style={gridStyle}><div>What to compare</div>{entries.map(entry => <div key={entry.id}><strong>{entry.name}</strong><button onClick={() => onRemove(entry)}>Remove</button></div>)}</div>{fields.map(([label, value]) => <div className="cert-comparison-row" style={gridStyle} key={label}><div>{label}</div>{entries.map(entry => <div key={entry.id}>{value(entry)}</div>)}</div>)}</div><div className="cert-comparison-links">{entries.map(entry => <a key={entry.id} href={entry.officialUrl} target="_blank" rel="noreferrer">Official {entry.authority} page <ArrowUpRight size={14} /></a>)}</div></section></div>;
}

function CertificationReport({ certification, onClose }) {
  const [comment, setComment] = useState(''); const [status, setStatus] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async event => { event.preventDefault(); setSaving(true); try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/certifications?action=report', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ certificationId: certification.id, comment }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setStatus('Thank you. Your report is now queued for review.'); setComment(''); } catch (error) { setStatus(error.message || 'Unable to submit report.'); } finally { setSaving(false); } };
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-suggestion" onClick={event => event.stopPropagation()}><button className="cert-close" onClick={onClose}><X size={19} /></button><h2>Report a catalog issue</h2><p>Tell us what needs correction for <strong>{certification.name}</strong>. Reports are reviewed privately.</p><form onSubmit={submit}><label>What is inaccurate or outdated?<textarea required minLength="10" value={comment} onChange={event => setComment(event.target.value)} /></label>{status && <p className="cert-form-status">{status}</p>}<button className="cert-official-link" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'}</button></form></section></div>;
}

function CertificationPathway({ onClose, onViewCertification, onOpenPlan }) {
  const [form, setForm] = useState({ targetRole: '', domain: '', experience: 'New' }); const [result, setResult] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [usage, setUsage] = useState(null); const [confirming, setConfirming] = useState(false); const [selectedIds, setSelectedIds] = useState([]); const [savedPlanIds, setSavedPlanIds] = useState([]); const [planStatus, setPlanStatus] = useState(''); const [savingPlan, setSavingPlan] = useState(false);
  useEffect(() => { let active = true; auth.currentUser.getIdToken().then(token => fetch('/api/certifications?action=pathway-status', { headers: { Authorization: `Bearer ${token}` } })).then(response => response.json()).then(body => active && setUsage(body)).catch(() => active && setUsage(null)); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; auth.currentUser.getIdToken().then(token => fetch('/api/certifications?action=plan', { headers: { Authorization: `Bearer ${token}` } })).then(response => response.ok ? response.json() : { items: [] }).then(body => active && setSavedPlanIds((body.items || []).map(item => item.id))).catch(() => {}); return () => { active = false; }; }, []);
  const build = async () => { setLoading(true); setError(''); try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/certifications?action=pathway', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setResult(body); setSelectedIds((body.recommendations || []).map(item => item.id)); setPlanStatus(''); setUsage(current => ({ ...(current || {}), remaining: body.remaining, used: 2 - body.remaining })); setConfirming(false); } catch (err) { setError(err.message || 'Unable to build your pathway.'); setConfirming(false); } finally { setLoading(false); } };
  const submit = event => { event.preventDefault(); setError(''); if (usage?.remaining === 0) { setError('You have used both free pathway requests for today. Please return tomorrow.'); return; } setConfirming(true); };
  const savePlan = async () => { const unsavedIds = selectedIds.filter(id => !savedPlanIds.includes(id)); if (!unsavedIds.length) return; setSavingPlan(true); setPlanStatus(''); try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/certifications?action=plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ certificationIds: unsavedIds }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setSavedPlanIds(current => [...new Set([...current, ...body.saved])]); setPlanStatus(`${body.saved.length} credential${body.saved.length === 1 ? '' : 's'} saved to My plan.`); } catch (err) { setPlanStatus(err.message || 'Unable to save your plan.'); } finally { setSavingPlan(false); } };
  const remaining = usage?.remaining;
  const unsavedSelectedCount = selectedIds.filter(id => !savedPlanIds.includes(id)).length;
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-suggestion cert-pathway" onClick={event => event.stopPropagation()}><button className="cert-close" onClick={onClose}><X size={19} /></button><div className={`cert-credit-status ${remaining === 0 ? 'exhausted' : ''}`}><span>Daily pathway credits</span><strong>{remaining === undefined ? 'Checking…' : `${remaining} of 2 free requests remaining`}</strong></div><h2>Build my certification path</h2><p>Recommendations are ranked from this verified catalog—not generated from a generic prompt. Completed paths are saved privately to your history.</p><form onSubmit={submit}><label>Target role<input required value={form.targetRole} placeholder="e.g., Cloud security engineer" onChange={event => setForm(current => ({ ...current, targetRole: event.target.value }))} /></label><label>Primary domain<select value={form.domain} onChange={event => setForm(current => ({ ...current, domain: event.target.value }))} required><option value="">Choose a domain</option>{certificationCategories.map(item => <option key={item}>{item}</option>)}</select></label><label>Experience<select value={form.experience} onChange={event => setForm(current => ({ ...current, experience: event.target.value }))}><option>New</option><option>Some experience</option><option>Experienced</option></select></label>{error && <p className="cert-form-status">{error}</p>}{confirming && <section className="cert-credit-confirm"><strong>Use one free request?</strong><p>This will use 1 of your 2 free pathway requests for today. Your completed path will be saved to Path history.</p><div><button type="button" onClick={() => setConfirming(false)}>Go back</button><button type="button" onClick={build} disabled={loading}>{loading ? 'Building…' : 'Use 1 free request'}</button></div></section>}{!confirming && <button className="cert-official-link" disabled={loading || remaining === 0}>{remaining === 0 ? 'No free requests left today' : 'Build pathway'}</button>}</form>{result && <section className="cert-path-results"><p>{result.rationale}</p>{result.recommendations.length ? <><div className="cert-path-save"><span>{unsavedSelectedCount ? 'Select the credentials you want to pursue.' : 'Selected credentials are already in My plan.'}</span><button type="button" onClick={savePlan} disabled={!unsavedSelectedCount || savingPlan}>{savingPlan ? 'Saving…' : unsavedSelectedCount ? `Save ${unsavedSelectedCount} selected to My plan` : 'Added to My plan'}</button></div>{planStatus && <p className="cert-form-status">{planStatus} {planStatus.includes('saved') && <button className="cert-inline-link" onClick={onOpenPlan}>Open My plan</button>}</p>}{result.recommendations.map((item, index) => { const isSaved = savedPlanIds.includes(item.id); return <article className={`cert-path-recommendation ${isSaved ? 'saved' : ''}`} key={item.id}><label><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} disabled={isSaved} aria-label={`${isSaved ? 'Saved' : 'Save'} ${item.name} to my plan`} /></label><button type="button" onClick={() => onViewCertification(item)}><strong>{index + 1}. {item.name}</strong><span>{isSaved ? 'Saved to My plan · ' : ''}{item.authority} · {item.level}</span><p>{item.description}</p></button></article>; })}</> : <p>No strong catalog match yet. Try a broader target role or domain.</p>}</section>}</section></div>;
}

function CertificationPathwayHistory({ onClose, onViewCertification }) {
  const [paths, setPaths] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; auth.currentUser.getIdToken().then(token => fetch('/api/certifications?action=pathway-history', { headers: { Authorization: `Bearer ${token}` } })).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); return body; }).then(body => active && setPaths(body.pathways || [])).catch(err => active && setError(err.message || 'Unable to load your pathway history.')).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-suggestion cert-pathway" onClick={event => event.stopPropagation()}><button className="cert-close" onClick={onClose}><X size={19} /></button><h2>Your path history</h2><p>Completed pathway recommendations are saved privately to your account. Select a credential to review its current details.</p>{loading && <p className="cert-form-status">Loading your saved paths…</p>}{error && <p className="cert-form-status">{error}</p>}{!loading && !error && (!paths.length ? <p className="cert-form-status">No saved paths yet. Build your first path from the Navigator.</p> : <section className="cert-path-history">{paths.map(path => <article key={path.id}><span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(path.createdAt))}</span><h3>{path.targetRole}</h3><p>{path.domain} · {path.experience}</p><ol>{(path.recommendations || []).map(item => <li key={item.id}><button onClick={() => onViewCertification(item)}>{item.name} <ArrowUpRight size={12} /></button></li>)}</ol></article>)}</section>)}</section></div>;
}

function CertificationPlan({ onClose }) {
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState('');
  const load = async () => { setLoading(true); try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/certifications?action=plan', { headers: { Authorization: `Bearer ${token}` } }); const body = await response.json(); if (!response.ok) throw new Error(body.error); setItems(body.items || []); } catch (err) { setError(err.message || 'Unable to load your plan.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const update = async (item, patch) => { const next = { ...item, ...patch }; setItems(current => current.map(entry => entry.id === item.id ? next : entry)); setSaving(item.id); setError(''); try { const token = await auth.currentUser.getIdToken(); const response = await fetch('/api/certifications?action=plan', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ certificationId: item.id, status: next.status, targetDate: next.targetDate }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); } catch (err) { setError(err.message || 'Unable to update this plan item.'); await load(); } finally { setSaving(''); } };
  const ordered = [...items].sort((a, b) => (a.targetDate || '9999-12-31').localeCompare(b.targetDate || '9999-12-31') || a.name.localeCompare(b.name));
  const nextItem = ordered.find(item => item.status !== 'Completed');
  const nextAction = nextItem ? ({ Exploring: 'Review the official requirements and decide whether to pursue it.', Studying: 'Continue preparation and set an exam date when ready.', Scheduled: 'Complete your scheduled exam and record the outcome.' }[nextItem.status]) : 'You have completed every credential currently in your plan.';
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-suggestion cert-plan" onClick={event => event.stopPropagation()}><button className="cert-close" onClick={onClose}><X size={19} /></button><h2>My certification plan</h2><p>Track each credential from exploration through completion. Your plan is private to your account.</p>{loading && <p className="cert-form-status">Loading your plan…</p>}{error && <p className="cert-form-status">{error}</p>}{!loading && !items.length && <p className="cert-form-status">Your plan is empty. Build a pathway, select recommendations, and save them here.</p>}{!!items.length && <><section className="cert-next-step"><span>Next recommended step</span><strong>{nextItem ? nextItem.name : 'Plan complete'}</strong><p>{nextAction}</p></section><section className="cert-plan-timeline">{ordered.map((item, index) => <article key={item.id}><div className="cert-plan-marker"><span>{index + 1}</span></div><div className="cert-plan-card"><header><div><h3>{item.name}</h3><p>{item.authority} · {item.level}</p></div><span className={`cert-plan-status ${item.status.toLowerCase()}`}>{item.status}</span></header><div className="cert-plan-fields"><label>Status<select value={item.status} onChange={event => update(item, { status: event.target.value })} disabled={saving === item.id}><option>Exploring</option><option>Studying</option><option>Scheduled</option><option>Completed</option></select></label><label>Target date<input type="date" value={item.targetDate || ''} onChange={event => update(item, { targetDate: event.target.value })} disabled={saving === item.id} /></label></div><dl><div><dt>Estimated cost</dt><dd>{item.cost}</dd></div><div><dt>Renewal</dt><dd>{item.validity}</dd></div></dl><a href={item.officialUrl} target="_blank" rel="noreferrer">Official registration & details <ArrowUpRight size={14} /></a></div></article>)}</section></>}</section></div>;
}

function CertificationSuggestion({ onClose }) {
  const [form, setForm] = useState({ name: '', authority: '', officialUrl: '', note: '' });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const submit = async event => {
    event.preventDefault(); setSaving(true); setStatus('');
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/certifications?action=submission', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setStatus('Thank you—your suggestion is queued for official-source review.');
      setForm({ name: '', authority: '', officialUrl: '', note: '' });
    } catch (error) { setStatus(error.message || 'Unable to submit your suggestion.'); }
    finally { setSaving(false); }
  };
  return <div className="cert-detail-overlay" onClick={onClose}><section className="cert-suggestion" onClick={event => event.stopPropagation()}><button className="cert-close" onClick={onClose} aria-label="Close suggestion form"><X size={19} /></button><h2>Suggest a certification</h2><p>Include the direct official issuer page. Suggestions are reviewed before being added to the public catalog.</p><form onSubmit={submit}><label>Name<input required value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Issuing authority<input required value={form.authority} onChange={event => update('authority', event.target.value)} /></label><label>Official HTTPS link<input required type="url" value={form.officialUrl} onChange={event => update('officialUrl', event.target.value)} /></label><label>Why should it be included? <span>(optional)</span><textarea value={form.note} maxLength="1200" onChange={event => update('note', event.target.value)} /></label>{status && <p className="cert-form-status">{status}</p>}<button className="cert-official-link" disabled={saving}>{saving ? 'Submitting…' : 'Submit for review'}</button></form></section></div>;
}
