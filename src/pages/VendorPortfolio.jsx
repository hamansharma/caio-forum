import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardPaste, ExternalLink, Link2, LoaderCircle, MessageCircle, Network, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import VendorJourney from '../components/VendorJourney';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import usePageMeta from '../hooks/usePageMeta';
import './VendorPortfolio.css';

const blankRow = (id) => ({ id, name: '', statedUse: '', websiteUrl: '', owner: '', department: '', status: 'Active', renewalDate: '', annualCost: '', licenseCount: '' });

async function authenticatedRequest(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in to save your private inventory.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

export default function VendorPortfolio() {
  usePageMeta('Vendor Portfolio Mapper | Free Open-Source SaaS Portfolio Tool', 'A free, open-source workspace for startups and small teams to inventory software, identify potential overlap, and prepare better renewal decisions.');
  const { user, authLoading } = useForum();
  const [rows, setRows] = useState(() => [blankRow('new-1')]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [suggestions, setSuggestions] = useState({ rowId: null, matches: [] });
  const searchTimer = useRef(null);
  const populatedRows = useMemo(() => rows.filter(row => row.name.trim()), [rows]);
  const updateRow = (id, field, value) => setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row));
  const updateToolName = (id, value) => {
    updateRow(id, 'name', value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!user || value.trim().length < 2) { setSuggestions({ rowId: null, matches: [] }); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await authenticatedRequest(`/api/vendor-portfolio?action=catalog-search&q=${encodeURIComponent(value.trim())}`);
        setSuggestions({ rowId: id, matches: data.matches || [] });
      } catch { setSuggestions({ rowId: null, matches: [] }); }
    }, 220);
  };
  const chooseSuggestion = (rowId, match) => {
    setRows(current => current.map(row => row.id === rowId ? { ...row, name: match.name, websiteUrl: row.websiteUrl || match.websiteUrl } : row));
    setSuggestions({ rowId: null, matches: [] });
  };
  const addRow = () => setRows(current => [blankRow(`new-${Date.now()}`), ...current]);
  const removeRow = (id) => setRows(current => current.length === 1 ? [blankRow(`new-${Date.now()}`)] : current.filter(row => row.id !== id));
  const updateSelectedRow = (field, value) => setSelectedRow(current => ({ ...current, [field]: value }));
  const applySelectedRow = () => { setRows(current => current.map(row => row.id === selectedRow.id ? selectedRow : row)); setSelectedRow(null); };
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    authenticatedRequest('/api/vendor-portfolio?action=inventory').then(data => setRows(data.rows?.length ? data.rows : [blankRow('new-1')])).catch(requestError => setError(requestError.message)).finally(() => setLoading(false));
  }, [user]);
  const addPastedRows = () => {
    const additions = pasteValue.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 40).map((line, index) => {
      const [name = '', statedUse = '', websiteUrl = ''] = line.split('\t').map(cell => cell.trim());
      return { id: `paste-${Date.now()}-${index}`, name, statedUse, websiteUrl };
    });
    if (!additions.length) return;
    setRows(current => [...current.filter(row => row.name.trim() || row.statedUse.trim() || row.websiteUrl.trim()), ...additions]);
    setPasteValue(''); setPasteOpen(false);
  };
  const saveInventory = async () => {
    if (!user) { setShowAuth(true); return; }
    setSaving(true); setError(''); setSaveMessage('');
    try { const data = await authenticatedRequest('/api/vendor-portfolio?action=inventory', { method: 'POST', body: JSON.stringify({ rows: populatedRows }) }); setRows(data.rows); setSaveMessage('Private inventory saved.'); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };

  return <main className="vendor-page">
    <Link className="vendor-back" to="/playground"><ArrowLeft size={15} /> AI Playground</Link>
    <VendorJourney current="inventory" />
    <section className="vendor-hero"><div><span className="vendor-eyebrow"><Network size={15} /> Portfolio intake</span><h1>Vendor Portfolio Mapper</h1><p>Start with a clear inventory. Add the tools your company uses and the job each one does—then we will layer in capability mapping later.</p></div><Link className="vendor-discuss-link" to="/playground/community?tool=vendors"><MessageCircle size={16} /> Discuss this tool</Link></section>
    {error && <div className="vendor-error">{error}</div>}{saveMessage && <div className="vendor-save-message">{saveMessage}</div>}
    <section className="vendor-intake-card">
      <div className="vendor-intake-heading"><div><span className="vendor-step-label">Step 1 · Portfolio intake</span><h2>Your tool inventory <b>{populatedRows.length}</b></h2><p>Keep it simple: product name, how it is used, and an optional official URL. Open details to add ownership and renewal context.</p></div><div className="vendor-intake-actions"><button className="vendor-secondary" onClick={() => setPasteOpen(value => !value)}><ClipboardPaste size={16} /> Paste several</button><button className="vendor-primary" onClick={addRow}><Plus size={17} /> Add tool</button></div></div>
      {pasteOpen && <div className="vendor-paste-panel"><div><strong>Paste a list</strong><p>Use one tool per line. You can paste tab-separated columns: name, use, URL.</p></div><textarea value={pasteValue} onChange={event => setPasteValue(event.target.value)} placeholder={'Slack\tInternal messaging\thttps://slack.com\nNotion\tTeam knowledge base\thttps://notion.so'} rows="5" /><div><button className="vendor-secondary" onClick={() => { setPasteOpen(false); setPasteValue(''); }}>Cancel</button><button className="vendor-primary" onClick={addPastedRows} disabled={!pasteValue.trim()}>Add pasted tools</button></div></div>}
      {loading ? <div className="vendor-loading"><LoaderCircle className="spin" size={18} /><p>Loading your private inventory…</p></div> : <div className="vendor-table-wrap"><table className="vendor-table"><thead><tr><th>Tool</th><th>How is it used?</th><th>Official website</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}><td className="vendor-tool-cell"><label className="sr-only" htmlFor={`tool-${row.id}`}>Tool name</label><input id={`tool-${row.id}`} value={row.name} onFocus={() => { if (suggestions.rowId !== row.id) setSuggestions({ rowId: null, matches: [] }); }} onChange={event => updateToolName(row.id, event.target.value)} placeholder={index === 0 ? 'e.g., Notion' : 'Tool name'} />{suggestions.rowId === row.id && suggestions.matches.length > 0 && <div className="vendor-suggestions">{suggestions.matches.map(match => <button key={match.id} onMouseDown={event => { event.preventDefault(); chooseSuggestion(row.id, match); }}><strong>{match.name}</strong><span>{match.category} · Catalog profile</span></button>)}</div>}</td><td><label className="sr-only" htmlFor={`use-${row.id}`}>Tool use</label><input id={`use-${row.id}`} value={row.statedUse} onChange={event => updateRow(row.id, 'statedUse', event.target.value)} placeholder="What job does it do?" /></td><td><label className="sr-only" htmlFor={`url-${row.id}`}>Official website</label><div className="vendor-table-url"><Link2 size={14} /><input id={`url-${row.id}`} value={row.websiteUrl} onChange={event => updateRow(row.id, 'websiteUrl', event.target.value)} placeholder="https://" />{row.websiteUrl.startsWith('https://') && <a href={row.websiteUrl} target="_blank" rel="noreferrer" aria-label={`Open ${row.name || 'tool'} website`}><ExternalLink size={13} /></a>}</div></td><td><span className={`vendor-status ${(row.status || 'Active').toLowerCase().replaceAll(' ', '-')}`}>{row.status || 'Active'}</span></td><td><div className="vendor-row-actions"><button className="vendor-row-detail" onClick={() => setSelectedRow({ ...row, status: row.status || 'Active' })} aria-label={`Edit details for ${row.name || 'tool row'}`}><Settings2 size={16} /></button><button className="vendor-remove" onClick={() => removeRow(row.id)} aria-label={`Remove ${row.name || 'tool row'}`}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
      <div className="vendor-save-bar"><button className="vendor-add-row" onClick={addRow}><Plus size={16} /> Add another tool</button><button className="vendor-primary" onClick={saveInventory} disabled={saving || authLoading || loading}>{saving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : <><Save size={16} /> {user ? 'Save private inventory' : 'Sign in to save'}</>}</button></div>
    </section>
    <section className="vendor-next-card"><div><span className="vendor-step-label">Next step</span><h2>Confirm capability profiles, then analyze overlap.</h2><p>Next, we’ll map each tool to the capabilities it supports. You can review and confirm those profiles before looking for potential overlap across your portfolio.</p></div><Link className="vendor-next-link" to="/playground/vendor-portfolio/profiles">Continue to profiles <ArrowRight size={17} /></Link></section>
    {selectedRow && <div className="vendor-drawer-backdrop" onMouseDown={() => setSelectedRow(null)}><aside className="vendor-detail-drawer vendor-inventory-drawer" role="dialog" aria-modal="true" aria-label={`${selectedRow.name || 'Tool'} inventory details`} onMouseDown={event => event.stopPropagation()}><button className="vendor-drawer-close" onClick={() => setSelectedRow(null)} aria-label="Close inventory details"><X size={19} /></button><span className="vendor-eyebrow">Inventory details</span><h2>{selectedRow.name || 'New tool'}</h2><label>Business owner<input value={selectedRow.owner || ''} onChange={event => updateSelectedRow('owner', event.target.value)} placeholder="e.g., VP of Sales" /></label><label>Department<input value={selectedRow.department || ''} onChange={event => updateSelectedRow('department', event.target.value)} placeholder="e.g., Revenue Operations" /></label><label>Status<select value={selectedRow.status || 'Active'} onChange={event => updateSelectedRow('status', event.target.value)}>{['Active', 'Under review', 'Retiring', 'Approved replacement'].map(status => <option key={status}>{status}</option>)}</select></label><div className="vendor-drawer-field-row"><label>Renewal date<input type="date" value={selectedRow.renewalDate || ''} onChange={event => updateSelectedRow('renewalDate', event.target.value)} /></label><label>Annual cost <small>Optional</small><input type="number" min="0" value={selectedRow.annualCost ?? ''} onChange={event => updateSelectedRow('annualCost', event.target.value)} placeholder="0" /></label></div><label>License count <small>Optional</small><input type="number" min="0" value={selectedRow.licenseCount ?? ''} onChange={event => updateSelectedRow('licenseCount', event.target.value)} placeholder="0" /></label><button className="vendor-primary" onClick={applySelectedRow}>Apply details</button></aside></div>}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}
