import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Lightbulb, MessageSquare, ShieldCheck, X } from 'lucide-react';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import { certificationCategories } from '../data/certificationCategories';
import { playgroundTools } from '../data/playgroundCommunity';
import './CertificationAdmin.css';
import usePageMeta from '../hooks/usePageMeta';

async function api(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in is required.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed.');
  return body;
}

export default function CertificationAdmin() {
  usePageMeta('Admin Workspace | CAIO Forum', 'Private CAIO Leadership administration workspace.', { canonicalPath: '/workspace/review-center', noIndex: true });
  const { user, authLoading } = useForum();
  const [allowed, setAllowed] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [requests, setRequests] = useState([]);
  const [moderationEntries, setModerationEntries] = useState([]);
  const [tab, setTab] = useState('catalog');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(null);

  const load = async () => {
    try {
      const access = await api('/api/certifications?action=admin');
      setAllowed(access.isAdmin);
      if (access.isAdmin) {
        const [result, reportResult, requestResult, moderationResult] = await Promise.all([
          api('/api/certifications?action=submissions'),
          api('/api/certifications?action=reports'),
          api('/api/certifications?action=project-requests'),
          api('/api/certifications?action=community-moderation'),
        ]);
        setSubmissions(result.submissions || []);
        setReports(reportResult.reports || []);
        setRequests(requestResult.requests || []);
        setModerationEntries(moderationResult.entries || []);
      }
    } catch (error) { setMessage(error.message); setAllowed(false); }
  };

  useEffect(() => { if (user) load(); }, [user]);
  const setStatus = async (id, status) => { try { await api('/api/certifications?action=submission', { method: 'PATCH', body: JSON.stringify({ id, status }) }); setSubmissions(current => current.map(item => item.id === id ? { ...item, status } : item)); } catch (error) { setMessage(error.message); } };
  const setReportStatus = async (id, status) => { try { await api('/api/certifications?action=report', { method: 'PATCH', body: JSON.stringify({ id, status }) }); setReports(current => current.map(item => item.id === id ? { ...item, status } : item)); } catch (error) { setMessage(error.message); } };
  const setRequestStatus = async (item, status) => { try { await api('/api/certifications?action=project-request', { method: 'PATCH', body: JSON.stringify({ id: item.id, status, adminNotes: item.adminNotes || '' }) }); setRequests(current => current.map(entry => entry.id === item.id ? { ...entry, status } : entry)); } catch (error) { setMessage(error.message); } };
  const moderate = async (item, action) => { try { await api('/api/certifications?action=community-moderation', { method: 'PATCH', body: JSON.stringify({ postId: item.postId, commentId: item.commentId, action }) }); setModerationEntries(current => current.map(entry => entry.id === item.id ? { ...entry, status: action === 'hide' ? 'Hidden' : 'Visible', canRestore: action === 'hide' } : entry)); } catch (error) { setMessage(error.message); } };

  if (authLoading || (user && allowed === null)) return <main className="cert-admin-page"><p>Loading…</p></main>;
  if (!user || !allowed) return <main className="cert-admin-page"><section className="cert-admin-empty"><ShieldCheck size={22} /><h1>Admin workspace</h1><p>{message || 'This area is available only to configured administrators.'}</p></section></main>;
  return <main className="cert-admin-page"><section className="cert-admin-heading"><span><ShieldCheck size={15} /> Administrator</span><h1>Admin workspace</h1><p>Review catalog contributions, data-quality reports, community content, and member ideas that shape the AI Playground roadmap.</p></section><nav className="cert-admin-tabs" aria-label="Admin sections"><button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>Catalog review</button><button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>Project requests <b>{requests.filter(item => item.status === 'New').length}</b></button><button className={tab === 'community' ? 'active' : ''} onClick={() => setTab('community')}>Community moderation <b>{moderationEntries.filter(item => item.status === 'Visible').length}</b></button></nav>{message && <p className="cert-admin-message">{message}</p>}{tab === 'catalog' ? <CatalogReview submissions={submissions} reports={reports} onPublish={setPublishing} onSetStatus={setStatus} onSetReportStatus={setReportStatus} /> : tab === 'requests' ? <ProjectRequests requests={requests} onSetStatus={setRequestStatus} /> : <CommunityModeration entries={moderationEntries} onModerate={moderate} />}{publishing && <PublishSuggestion item={publishing} onClose={() => setPublishing(null)} onPublished={() => { setSubmissions(current => current.map(entry => entry.id === publishing.id ? { ...entry, status: 'Published' } : entry)); setPublishing(null); setMessage('Suggestion published to the catalog.'); }} />}</main>;
}

function CatalogReview({ submissions, reports, onPublish, onSetStatus, onSetReportStatus }) {
  return <><section className="cert-admin-submissions"><h2>Suggestions ({submissions.length})</h2>{!submissions.length ? <p>No suggestions awaiting review.</p> : submissions.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.authority}</span><a href={item.officialUrl} target="_blank" rel="noreferrer">Open official link <ExternalLink size={13} /></a>{item.note && <p>{item.note}</p>}</div><div className="cert-admin-status"><span>{item.status}</span><button onClick={() => onPublish(item)} title="Publish to catalog">Publish</button><button onClick={() => onSetStatus(item.id, 'Reviewed')} title="Mark reviewed"><Check size={15} /></button><button onClick={() => onSetStatus(item.id, 'Rejected')} title="Reject"><X size={15} /></button></div></article>)}</section><section className="cert-admin-submissions"><h2>Catalog reports ({reports.length})</h2>{!reports.length ? <p>No open reports.</p> : reports.map(item => <article key={item.id}><div><strong>{item.certificationId}</strong><p>{item.comment}</p></div><div className="cert-admin-status"><span>{item.status}</span><button onClick={() => onSetReportStatus(item.id, 'Resolved')}>Resolve</button><button onClick={() => onSetReportStatus(item.id, 'Dismissed')}>Dismiss</button></div></article>)}</section></>;
}

function ProjectRequests({ requests, onSetStatus }) {
  const statuses = ['New', 'Reviewing', 'Planned', 'Building', 'Shipped', 'Declined'];
  return <section className="cert-admin-submissions cert-admin-project-requests"><div className="cert-admin-request-heading"><span><Lightbulb size={15} /> Roadmap input</span><h2>Project requests ({requests.length})</h2><p>Requests are private. Member email is visible only when they opted into follow-up.</p></div>{!requests.length ? <p>No member ideas yet.</p> : requests.map(item => <article key={item.id}><div><strong>{playgroundTools[item.tool]?.label || item.tool}</strong><span>{item.valueSignal || 'Useful'} · {item.audience || 'Not specified'} · {new Date(item.submittedAt).toLocaleDateString()}</span><h3>{item.requestedCapability}</h3><p><b>Problem:</b> {item.problem}</p>{item.integrationOrData && <p><b>Context:</b> {item.integrationOrData}</p>}{item.contactOk && item.contactEmail && <a href={`mailto:${item.contactEmail}`}>Contact willing beta tester</a>}</div><label className="cert-admin-request-status">Status<select value={item.status || 'New'} onChange={event => onSetStatus(item, event.target.value)}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></article>)}</section>;
}

function CommunityModeration({ entries, onModerate }) {
  return <section className="cert-admin-submissions cert-admin-community"><div className="cert-admin-request-heading"><span><MessageSquare size={15} /> Recent community content</span><h2>Posts and replies ({entries.length})</h2><p>Hide content only when necessary. Hidden content can be restored; author-deleted content remains untouched.</p></div>{!entries.length ? <p>No community content yet.</p> : <div className="cert-admin-table-wrap"><table><thead><tr><th>Type</th><th>Author</th><th>Content</th><th>Posted</th><th>Status</th><th>Action</th></tr></thead><tbody>{entries.map(item => <tr key={item.id}><td><span className="cert-admin-content-type">{item.type}</span></td><td>u/{item.author}</td><td><a href={`/post/${item.postId}`} target="_blank" rel="noreferrer"><strong>{item.title || 'Untitled post'}</strong><span>{item.body}</span></a></td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td><td><span className={`cert-admin-content-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td>{item.canRestore ? <button className="cert-admin-restore" onClick={() => onModerate(item, 'restore')}>Restore</button> : item.status === 'Visible' ? <button className="cert-admin-hide" onClick={() => onModerate(item, 'hide')}>Hide</button> : <span>—</span>}</td></tr>)}</tbody></table></div>}</section>;
}

function PublishSuggestion({ item, onClose, onPublished }) {
  const [form, setForm] = useState({ category: 'Technology & Cloud', level: 'Intermediate', description: item.note || '', cost: '', prerequisites: '', validity: '', geography: 'Global', skills: '', targetRoles: '' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async event => { event.preventDefault(); setSaving(true); try { await api('/api/certifications?action=publish-submission', { method: 'POST', body: JSON.stringify({ submissionId: item.id, record: { ...form, name: item.name, authority: item.authority, officialUrl: item.officialUrl, skills: form.skills.split(',').map(x => x.trim()).filter(Boolean), targetRoles: form.targetRoles.split(',').map(x => x.trim()).filter(Boolean) } }) }); onPublished(); } catch (err) { setError(err.message); } finally { setSaving(false); } };
  return <div className="cert-admin-modal"><form onSubmit={submit}><button type="button" onClick={onClose}>Close</button><h2>Publish suggestion</h2><p>{item.name} · {item.authority}</p><label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{certificationCategories.map(category => <option key={category}>{category}</option>)}</select></label><label>Level<select value={form.level} onChange={event => setForm({ ...form, level: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label>Skills (comma separated)<input value={form.skills} onChange={event => setForm({ ...form, skills: event.target.value })} /></label><label>Target roles (comma separated)<input value={form.targetRoles} onChange={event => setForm({ ...form, targetRoles: event.target.value })} /></label>{error && <p>{error}</p>}<button disabled={saving}>{saving ? 'Publishing…' : 'Publish credential'}</button></form></div>;
}
