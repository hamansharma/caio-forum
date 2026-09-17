import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import { certificationCategories } from '../data/certificationCategories';
import './CertificationAdmin.css';

async function api(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in is required.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export default function CertificationAdmin() {
  const { user, authLoading } = useForum();
  const [allowed, setAllowed] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(null);

  const load = async () => {
    try {
      const access = await api('/api/certifications?action=admin');
      setAllowed(access.isAdmin);
      if (access.isAdmin) {
        const [result, reportResult] = await Promise.all([api('/api/certifications?action=submissions'), api('/api/certifications?action=reports')]);
        setSubmissions(result.submissions || []);
        setReports(reportResult.reports || []);
      }
    } catch (error) { setMessage(error.message); setAllowed(false); }
  };
  useEffect(() => { if (user) load(); }, [user]);
  const setStatus = async (id, status) => { try { await api('/api/certifications?action=submission', { method: 'PATCH', body: JSON.stringify({ id, status }) }); setSubmissions(current => current.map(item => item.id === id ? { ...item, status } : item)); } catch (error) { setMessage(error.message); } };
  const setReportStatus = async (id, status) => { try { await api('/api/certifications?action=report', { method: 'PATCH', body: JSON.stringify({ id, status }) }); setReports(current => current.map(item => item.id === id ? { ...item, status } : item)); } catch (error) { setMessage(error.message); } };

  if (authLoading || (user && allowed === null)) return <main className="cert-admin-page"><p>Loading…</p></main>;
  if (!user || !allowed) return <main className="cert-admin-page"><section className="cert-admin-empty"><ShieldCheck size={22} /><h1>Certification catalog administration</h1><p>{message || 'This area is available only to configured catalog administrators.'}</p></section></main>;
  return <main className="cert-admin-page"><section className="cert-admin-heading"><span><ShieldCheck size={15} /> Administrator</span><h1>Certification catalog review</h1><p>The catalog is imported privately to Firestore from the local CLI. Review member suggestions against official issuer sources before publishing them.</p></section>{message && <p className="cert-admin-message">{message}</p>}<section className="cert-admin-submissions"><h2>Suggestions ({submissions.length})</h2>{!submissions.length ? <p>No suggestions awaiting review.</p> : submissions.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.authority}</span><a href={item.officialUrl} target="_blank" rel="noreferrer">Open official link <ExternalLink size={13} /></a>{item.note && <p>{item.note}</p>}</div><div className="cert-admin-status"><span>{item.status}</span><button onClick={() => setPublishing(item)} title="Publish to catalog">Publish</button><button onClick={() => setStatus(item.id, 'Reviewed')} title="Mark reviewed"><Check size={15} /></button><button onClick={() => setStatus(item.id, 'Rejected')} title="Reject"><X size={15} /></button></div></article>)}</section><section className="cert-admin-submissions"><h2>Catalog reports ({reports.length})</h2>{!reports.length ? <p>No open reports.</p> : reports.map(item => <article key={item.id}><div><strong>{item.certificationId}</strong><p>{item.comment}</p></div><div className="cert-admin-status"><span>{item.status}</span><button onClick={() => setReportStatus(item.id, 'Resolved')}>Resolve</button><button onClick={() => setReportStatus(item.id, 'Dismissed')}>Dismiss</button></div></article>)}</section>{publishing && <PublishSuggestion item={publishing} onClose={() => setPublishing(null)} onPublished={() => { setSubmissions(current => current.map(entry => entry.id === publishing.id ? { ...entry, status: 'Published' } : entry)); setPublishing(null); setMessage('Suggestion published to the catalog.'); }} />}</main>;
}

function PublishSuggestion({ item, onClose, onPublished }) {
  const [form, setForm] = useState({ category: 'Technology & Cloud', level: 'Intermediate', description: item.note || '', cost: '', prerequisites: '', validity: '', geography: 'Global', skills: '', targetRoles: '' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async event => { event.preventDefault(); setSaving(true); try { await api('/api/certifications?action=publish-submission', { method: 'POST', body: JSON.stringify({ submissionId: item.id, record: { ...form, name: item.name, authority: item.authority, officialUrl: item.officialUrl, skills: form.skills.split(',').map(x => x.trim()).filter(Boolean), targetRoles: form.targetRoles.split(',').map(x => x.trim()).filter(Boolean) } }) }); onPublished(); } catch (err) { setError(err.message); } finally { setSaving(false); } };
  return <div className="cert-admin-modal"><form onSubmit={submit}><button type="button" onClick={onClose}>Close</button><h2>Publish suggestion</h2><p>{item.name} · {item.authority}</p><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{certificationCategories.map(category => <option key={category}>{category}</option>)}</select></label><label>Level<select value={form.level} onChange={event => setForm({ ...form, level: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label>Skills (comma separated)<input value={form.skills} onChange={event => setForm({ ...form, skills: event.target.value })} /></label><label>Target roles (comma separated)<input value={form.targetRoles} onChange={event => setForm({ ...form, targetRoles: event.target.value })} /></label>{error && <p>{error}</p>}<button disabled={saving}>{saving ? 'Publishing…' : 'Publish credential'}</button></form></div>;
}
