import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
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
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const access = await api('/api/certifications?action=admin');
      setAllowed(access.isAdmin);
      if (access.isAdmin) {
        const result = await api('/api/certifications?action=submissions');
        setSubmissions(result.submissions || []);
      }
    } catch (error) { setMessage(error.message); setAllowed(false); }
  };
  useEffect(() => { if (user) load(); }, [user]);
  const setStatus = async (id, status) => { try { await api('/api/certifications?action=submission', { method: 'PATCH', body: JSON.stringify({ id, status }) }); setSubmissions(current => current.map(item => item.id === id ? { ...item, status } : item)); } catch (error) { setMessage(error.message); } };

  if (authLoading || (user && allowed === null)) return <main className="cert-admin-page"><p>Loading…</p></main>;
  if (!user || !allowed) return <main className="cert-admin-page"><section className="cert-admin-empty"><ShieldCheck size={22} /><h1>Certification catalog administration</h1><p>{message || 'This area is available only to configured catalog administrators.'}</p></section></main>;
  return <main className="cert-admin-page"><section className="cert-admin-heading"><span><ShieldCheck size={15} /> Administrator</span><h1>Certification catalog review</h1><p>The catalog is imported privately to Firestore from the local CLI. Review member suggestions against official issuer sources before publishing them.</p></section>{message && <p className="cert-admin-message">{message}</p>}<section className="cert-admin-submissions"><h2>Suggestions ({submissions.length})</h2>{!submissions.length ? <p>No suggestions awaiting review.</p> : submissions.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.authority}</span><a href={item.officialUrl} target="_blank" rel="noreferrer">Open official link <ExternalLink size={13} /></a>{item.note && <p>{item.note}</p>}</div><div className="cert-admin-status"><span>{item.status}</span><button onClick={() => setStatus(item.id, 'Reviewed')} title="Mark reviewed"><Check size={15} /></button><button onClick={() => setStatus(item.id, 'Rejected')} title="Reject"><X size={15} /></button></div></article>)}</section></main>;
}
