import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { auth } from '../firebase';
import { playgroundTools } from '../data/playgroundCommunity';
import './ProjectRequestModal.css';

const initialForm = { problem: '', requestedCapability: '', audience: 'Just me', valueSignal: 'Useful', integrationOrData: '', contactOk: false };

export default function ProjectRequestModal({ tool, onClose }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const label = playgroundTools[tool]?.label || 'AI Playground';
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }));

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in to share an idea.');
      const response = await fetch('/api/certifications?action=project-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, tool }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to submit your idea.');
      setStatus('Thanks—your idea is now in the private roadmap queue.');
      setForm(initialForm);
    } catch (error) {
      setStatus(error.message || 'Unable to submit your idea.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="project-request-overlay" onMouseDown={onClose}>
    <section className="project-request-modal" role="dialog" aria-modal="true" aria-label={`Help shape ${label}`} onMouseDown={event => event.stopPropagation()}>
      <button className="project-request-close" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
      <span><Lightbulb size={15} /> Help shape this project</span>
      <h2>{label}</h2>
      <p>Tell us what would make this more useful in real work. The strongest patterns help decide what we build next.</p>
      <form onSubmit={submit}>
        <label>What are you trying to accomplish?<textarea required minLength="20" maxLength="1600" value={form.problem} onChange={event => update('problem', event.target.value)} placeholder="Describe the decision, workflow, or outcome you need help with." /></label>
        <label>What should this project help you do?<textarea required minLength="15" maxLength="1200" value={form.requestedCapability} onChange={event => update('requestedCapability', event.target.value)} placeholder="Describe the capability—not just a feature name." /></label>
        <div className="project-request-grid">
          <label>Who would use it?<select value={form.audience} onChange={event => update('audience', event.target.value)}><option>Just me</option><option>My team</option><option>My organization</option></select></label>
          <label>How valuable would it be?<select value={form.valueSignal} onChange={event => update('valueSignal', event.target.value)}><option>Useful</option><option>Important</option><option>Critical</option></select></label>
        </div>
        <label>Relevant data, tools, or workflow <em>Optional</em><textarea maxLength="1200" value={form.integrationOrData} onChange={event => update('integrationOrData', event.target.value)} placeholder="For example: Jira, Salesforce, an internal policy library, or a recurring decision process." /></label>
        <label className="project-request-check"><input type="checkbox" checked={form.contactOk} onChange={event => update('contactOk', event.target.checked)} /> I’m open to testing an early version or answering follow-up questions.</label>
        {status && <p className="project-request-status">{status}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit idea'}</button>
      </form>
    </section>
  </div>;
}
