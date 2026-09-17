import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Award, BookOpenCheck, CheckCircle2, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { certificationCategories } from '../data/certificationCategories';
import { auth } from '../firebase';
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
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const visibleQuery = query.trim();

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

  return <main className="certifications-page">
    <section className="certifications-hero"><span><Award size={15} /> CAIO Leadership Lab</span><h1>Certification Navigator</h1><p>Find credible credentials across technology, finance, education, operations, and more—then compare requirements, cost, authority, and renewal commitment before you invest.</p><button className="cert-suggest-button" onClick={() => user ? setShowSuggestion(true) : setShowAuth(true)}>Suggest a certification <ArrowUpRight size={15} /></button></section>
    <section className="cert-methodology"><h2>How this catalog is maintained</h2><p>We use direct links to issuing authorities and show the date each record was checked. Costs, requirements, and credential status can change; confirm details with the issuer before registering. Community suggestions are reviewed before publication.</p></section>
    <section className="certifications-toolbar" aria-label="Certification filters"><label className="cert-search"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search certifications, skills, or roles" /></label><div className="cert-filter"><Filter size={15} /><select value={category} onChange={event => setCategory(event.target.value)}><option>All</option>{certificationCategories.map(item => <option key={item}>{item}</option>)}</select></div><div className="cert-filter"><SlidersHorizontal size={15} /><select value={level} onChange={event => setLevel(event.target.value)}><option>All</option>{levels.map(item => <option key={item}>{item}</option>)}</select></div></section>
    <section className="cert-results-head"><p><strong>{catalog.length}</strong> entries on page {page}{catalogLoading ? ' · Updating…' : ''}{catalogError ? ' · Catalog temporarily unavailable' : ''}</p><span>Every entry links directly to its issuing authority.</span></section>
    <section className="cert-grid" aria-busy={catalogLoading}>{catalog.map(item => <article className="cert-card" key={item.id}><div className="cert-card-top"><span className={`cert-level ${item.level.toLowerCase()}`}>{item.level}</span><div><span className="cert-status">{item.status || 'Active'}</span><span className="cert-type">{item.credentialType}</span></div></div><h2>{item.name}</h2><p className="cert-authority">{item.authority}</p><p className="cert-description">{item.description}</p><div className="cert-tags">{item.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}</div><button onClick={() => setSelected(item)}>View credential <ArrowUpRight size={15} /></button></article>)}</section>
    {!catalogLoading && !catalog.length && <section className="cert-empty"><BookOpenCheck size={22} /><h2>No certifications match those filters</h2><p>Try a broader role, skill, or category.</p></section>}
    {(page > 1 || nextCursor) && <nav className="cert-pagination" aria-label="Certification catalog pages"><button onClick={() => setPage(current => current - 1)} disabled={page === 1}><ArrowLeft size={15} /> Previous</button><span>Page {page}</span><button onClick={goNext} disabled={!nextCursor}>Next <ArrowRight size={15} /></button></nav>}
    {selected && <CertificationDetail certification={selected} onClose={() => setSelected(null)} />}
    {showSuggestion && <CertificationSuggestion onClose={() => setShowSuggestion(false)} />}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}

function CertificationDetail({ certification, onClose }) {
  const lastChecked = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${certification.lastVerified}T12:00:00`));
  return <div className="cert-detail-overlay" onClick={onClose}><aside className="cert-detail" onClick={event => event.stopPropagation()} aria-label={`${certification.name} details`}><button className="cert-close" onClick={onClose} aria-label="Close details"><X size={19} /></button><span className={`cert-level ${certification.level.toLowerCase()}`}>{certification.level}</span><h2>{certification.name}</h2><p className="cert-authority">Issued by {certification.authority}</p><p className="cert-detail-description">{certification.description}</p><dl><div><dt>Catalog status</dt><dd>{certification.status || 'Active'} · {certification.sourceType || 'Official issuer source'}</dd></div><div><dt>Credential type</dt><dd>{certification.credentialType}</dd></div><div><dt>Typical exam cost</dt><dd>{certification.cost}</dd></div><div><dt>Prerequisites</dt><dd>{certification.prerequisites}</dd></div><div><dt>Validity / renewal</dt><dd>{certification.validity}</dd></div><div><dt>Where it applies</dt><dd>{certification.geography}</dd></div><div><dt>Best for</dt><dd>{certification.targetRoles.join(' · ')}</dd></div></dl><section className="cert-detail-skills"><h3>Skills covered</h3>{certification.skills.map(skill => <span key={skill}>{skill}</span>)}</section><a className="cert-official-link" href={certification.officialUrl} target="_blank" rel="noreferrer">View official credential page <ArrowUpRight size={16} /></a><p className="cert-verified"><CheckCircle2 size={14} /> Official source last checked {lastChecked}</p></aside></div>;
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
