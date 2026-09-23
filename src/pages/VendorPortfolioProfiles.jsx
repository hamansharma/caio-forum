import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, CircleAlert, CircleHelp, ExternalLink, LoaderCircle, Network, Search, Sparkles, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import VendorJourney from '../components/VendorJourney';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import usePageMeta from '../hooks/usePageMeta';
import './VendorPortfolio.css';


async function authenticatedRequest(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in to create private capability profiles.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

const profileKey = value => String(value || '').trim().toLowerCase();
const combineInventoryAndProfiles = (inventory, savedProfiles) => {
  const byInventoryId = new Map(savedProfiles.filter(profile => profile.inventoryId).map(profile => [profile.inventoryId, profile]));
  const byName = new Map(savedProfiles.map(profile => [profileKey(profile.name), profile]));
  return inventory.map(item => {
    const saved = byInventoryId.get(item.id) || byName.get(profileKey(item.name));
    return saved ? { ...saved, inventoryId: saved.inventoryId || item.id, reviewStatus: 'saved', profileMissing: false } : {
      ...item, id: `inventory-${item.id}`, inventoryId: item.id, category: 'Needs profile', summary: '', capabilities: [],
      profileMissing: true, reviewStatus: 'missing', confidence: '',
    };
  });
};

export default function VendorPortfolioProfiles() {
  usePageMeta('Capability Profiles | Vendor Portfolio Mapper', 'Review reusable catalog profiles and AI-generated software capability profiles in the free, open-source Vendor Portfolio Mapper.', { canonicalPath: '/playground/vendor-portfolio/profiles', noIndex: true });
  const [searchParams] = useSearchParams();
  const { user, authLoading } = useForum();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const categories = useMemo(() => ['All', ...new Set(profiles.map(tool => tool.category))], [profiles]);
  const shownTools = useMemo(() => profiles.filter(tool => (category === 'All' || tool.category === category) && `${tool.name} ${tool.category} ${tool.summary} ${(tool.capabilities || []).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [category, query, profiles]);

  useEffect(() => {
    if (!user) { setLoadingProfiles(false); return; }
    setLoadingProfiles(true);
    Promise.all([authenticatedRequest('/api/vendor-portfolio?action=inventory'), authenticatedRequest('/api/vendor-portfolio?action=tools')]).then(([inventoryData, toolData]) => setProfiles(combineInventoryAndProfiles(inventoryData.rows || [], toolData.tools || []))).catch(requestError => setError(requestError.message)).finally(() => setLoadingProfiles(false));
  }, [user]);

  useEffect(() => {
    const requestedName = searchParams.get('tool');
    if (!requestedName) return;
    const requestedTool = profiles.find(tool => tool.name === requestedName);
    if (requestedTool) { setSelectedTool(requestedTool); setCategory(requestedTool.category); setQuery(''); }
  }, [searchParams, profiles]);

  const generateProfiles = async () => {
    if (!user) { setShowAuth(true); return; }
    const missingInventoryIds = profiles.filter(profile => profile.profileMissing && profile.inventoryId).map(profile => profile.inventoryId);
    if (!missingInventoryIds.length) { setProfileMessage('Every tool in this inventory already has a capability profile.'); return; }
    setGenerating(true); setError(''); setProfileMessage('');
    try { const data = await authenticatedRequest('/api/vendor-portfolio?action=generate-profiles', { method: 'POST', body: JSON.stringify({ inventoryIds: missingInventoryIds }) }); const drafts = data.profiles.map(profile => ({ ...profile, id: profile.inventoryId || profileKey(profile.name), reviewStatus: 'pending', profileMissing: false })); const draftByInventoryId = new Map(drafts.map(profile => [profile.inventoryId, profile])); setProfiles(current => current.map(profile => draftByInventoryId.get(profile.inventoryId) || profile)); setPendingProfiles(drafts); setProfileMessage(`${data.catalogCount} catalog profile${data.catalogCount === 1 ? '' : 's'} reused · ${data.aiCount} new AI profile${data.aiCount === 1 ? '' : 's'} created. Review each new profile before accepting it.`); }
    catch (requestError) { setError(requestError.message); }
    finally { setGenerating(false); }
  };
  const saveConfirmedProfiles = async () => {
    const acceptedProfiles = profiles.filter(profile => profile.reviewStatus === 'accepted');
    if (!acceptedProfiles.length) { setError('Accept at least one profile before saving.'); return; }
    setSaving(true); setError('');
    try { const data = await authenticatedRequest('/api/vendor-portfolio?action=tool', { method: 'POST', body: JSON.stringify({ tools: acceptedProfiles }) }); const savedByInventoryId = new Map(data.tools.map(profile => [profile.inventoryId, profile])); const savedByName = new Map(data.tools.map(profile => [profileKey(profile.name), profile])); setProfiles(current => current.map(profile => { const saved = savedByInventoryId.get(profile.inventoryId) || savedByName.get(profileKey(profile.name)); return saved ? { ...saved, inventoryId: saved.inventoryId || profile.inventoryId, reviewStatus: 'saved', profileMissing: false } : profile; })); setPendingProfiles([]); setProfileMessage(`${data.tools.length} confirmed profile${data.tools.length === 1 ? '' : 's'} saved privately.`); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const updateProfile = (id, field, value) => {
    setProfiles(current => current.map(profile => profile.id === id ? { ...profile, [field]: value } : profile));
    setSelectedTool(current => current?.id === id ? { ...current, [field]: value } : current);
  };
  const setReviewStatus = (id, reviewStatus) => {
    updateProfile(id, 'reviewStatus', reviewStatus);
    setPendingProfiles(current => current.map(profile => profile.id === id ? { ...profile, reviewStatus } : profile));
  };
  const acceptAllProfiles = () => {
    const pendingIds = new Set(pendingProfiles.map(profile => profile.id));
    setProfiles(current => current.map(profile => pendingIds.has(profile.id) ? { ...profile, reviewStatus: 'accepted' } : profile));
    setPendingProfiles(current => current.map(profile => ({ ...profile, reviewStatus: 'accepted' })));
  };
  const reviewNextProfile = () => setSelectedTool(profiles.find(profile => profile.reviewStatus === 'pending') || null);
  const acceptedCount = profiles.filter(profile => profile.reviewStatus === 'accepted').length;
  const missingProfileCount = profiles.filter(profile => profile.profileMissing).length;
  const reviewNeededCount = pendingProfiles.filter(profile => profile.reviewStatus === 'pending').length;
  const workflowStage = missingProfileCount ? 1 : reviewNeededCount ? 2 : pendingProfiles.length ? 3 : 4;

  return <main className="vendor-page">
    <Link className="vendor-back" to="/playground/vendor-portfolio"><ArrowLeft size={15} /> Portfolio intake</Link>
    <VendorJourney current="profiles" />
    <section className="vendor-profile-hero"><div><span className="vendor-eyebrow"><Sparkles size={15} /> Capability profiles</span><h1>Review capability profiles</h1><p>Review each tool’s capabilities, intended use, and confidence before adding it to your private portfolio analysis.</p></div><div className="vendor-profile-count"><Network size={18} /><strong>{profiles.length}</strong><span>tools in inventory</span></div></section>
    {error && <div className="vendor-error">{error}</div>}{profileMessage && <div className="vendor-save-message">{profileMessage}</div>}
    <section className="vendor-profile-workflow" aria-label="Capability profile workflow"><div className={`vendor-profile-workflow-step ${workflowStage > 1 ? 'complete' : workflowStage === 1 ? 'active' : ''}`}><b>{workflowStage > 1 ? <CheckCircle2 size={16} /> : '1'}</b><div><strong>{missingProfileCount ? `Create ${missingProfileCount} profile${missingProfileCount === 1 ? '' : 's'}` : 'Profiles created'}</strong><small>{missingProfileCount ? 'Map the remaining inventory tools.' : 'Every inventory tool has a profile.'}</small></div></div><i className={workflowStage > 1 ? 'complete' : ''} /><div className={`vendor-profile-workflow-step ${workflowStage > 2 ? 'complete' : workflowStage === 2 ? 'active' : ''}`}><b>{workflowStage > 2 ? <CheckCircle2 size={16} /> : '2'}</b><div><strong>{reviewNeededCount ? `Accept ${reviewNeededCount} profile${reviewNeededCount === 1 ? '' : 's'}` : 'Profiles reviewed'}</strong><small>{reviewNeededCount ? 'Review details, then accept or exclude.' : 'Review decisions are ready.'}</small></div></div><i className={workflowStage > 2 ? 'complete' : ''} /><div className={`vendor-profile-workflow-step ${workflowStage > 3 ? 'complete' : workflowStage === 3 ? 'active' : ''}`}><b>{workflowStage > 3 ? <CheckCircle2 size={16} /> : '3'}</b><div><strong>{acceptedCount ? `Save ${acceptedCount} accepted` : 'Save profiles'}</strong><small>{acceptedCount ? 'Store confirmed profiles privately.' : 'Accepted profiles will be ready to save.'}</small></div></div></section>
    <div className="vendor-profile-actions">{missingProfileCount || !user ? <button className="vendor-primary" disabled={generating || authLoading || (Boolean(user) && !missingProfileCount)} onClick={generateProfiles}>{generating ? <><LoaderCircle className="spin" size={16} /> Creating profiles…</> : <><Sparkles size={16} /> {!user ? 'Sign in to create profiles' : `Create ${missingProfileCount} capability profile${missingProfileCount === 1 ? '' : 's'}`}</>}</button> : reviewNeededCount ? <button className="vendor-primary" onClick={reviewNextProfile}>Next: review profile <ArrowRight size={16} /></button> : pendingProfiles.length && acceptedCount ? <button className="vendor-primary" disabled={saving} onClick={saveConfirmedProfiles}>{saving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : <><CheckCircle2 size={16} /> Next: save {acceptedCount} accepted</>}</button> : <Link className="vendor-primary vendor-analysis-next" to="/playground/vendor-portfolio/analysis">Continue to overlap analysis <ArrowRight size={16} /></Link>}{pendingProfiles.length > 0 && <><button className="vendor-secondary" disabled={saving || acceptedCount === pendingProfiles.length} onClick={acceptAllProfiles}><CheckCircle2 size={16} /> Accept all {pendingProfiles.length}</button>{reviewNeededCount > 0 && <button className="vendor-secondary" disabled={saving || !acceptedCount} onClick={saveConfirmedProfiles}>{saving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : <><CheckCircle2 size={16} /> Save {acceptedCount} accepted</>}</button>}<span className="vendor-review-hint">Review individual cards, or accept all after your review.</span></>}</div>
    <section className="vendor-profile-layout"><aside className="vendor-filter-sidebar"><div className="vendor-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a tool or capability" /></div><span>Filter by capability area</span><div className="vendor-filter-list">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}<b>{item === 'All' ? profiles.length : profiles.filter(tool => tool.category === item).length}</b></button>)}</div></aside><div className="vendor-profile-results"><div className="vendor-results-label"><strong>{loadingProfiles ? 'Loading profiles…' : `${shownTools.length} tools`}</strong><span>{category === 'All' ? 'All capability areas' : category}</span></div>{loadingProfiles ? <div className="vendor-loading"><LoaderCircle className="spin" size={18} /><p>Loading your inventory and saved capability profiles…</p></div> : profiles.length === 0 ? <div className="vendor-empty-tools"><Sparkles size={18} /><p>Save your inventory, then create capability profiles to review them here.</p></div> : <section className="vendor-profile-grid">{shownTools.map(tool => <article className={`vendor-profile-card ${tool.reviewStatus || ''} ${tool.profileMissing ? 'needs-profile' : ''}`} key={tool.id}><div className="vendor-profile-card-top"><span>{tool.profileMissing ? 'Needs profile' : tool.category}</span><small>{tool.profileMissing ? 'Not created' : tool.reviewStatus === 'accepted' ? 'Accepted' : tool.reviewStatus === 'excluded' ? 'Excluded' : tool.reviewStatus === 'saved' ? 'Saved' : tool.reviewStatus === 'pending' ? 'Review needed' : tool.confidence}</small></div><h2>{tool.name}</h2>{tool.profileMissing ? <p className="vendor-profile-missing-copy">This inventory tool does not have a capability profile yet. Create the missing profiles to review it before analysis.</p> : <>{tool.profileSource === 'ai' && <span className="vendor-ai-badge">AI draft</span>}{tool.catalogProfile && <span className="vendor-catalog-badge">Catalog profile <CircleHelp size={13} /><i>Reused from the CAIO Capability Catalog. It contains generic product information only—not another organization’s data.</i></span>}<p>{tool.summary}</p><div className="vendor-capabilities">{(tool.capabilities || []).map(capability => <b key={capability}>{capability}</b>)}</div><button className="vendor-profile-detail" onClick={() => setSelectedTool(tool)}>Review details <ChevronRight size={16} /></button></>}</article>)}</section>}</div></section>
    {selectedTool && <div className="vendor-drawer-backdrop" onMouseDown={() => setSelectedTool(null)}><aside className="vendor-detail-drawer vendor-profile-drawer" role="dialog" aria-modal="true" aria-label={`${selectedTool.name} profile details`} onMouseDown={event => event.stopPropagation()}><button className="vendor-drawer-close" onClick={() => setSelectedTool(null)} aria-label="Close profile details"><X size={19} /></button><span className="vendor-eyebrow">{selectedTool.category}</span><h2>{selectedTool.name}</h2>{selectedTool.catalogProfile && <span className="vendor-catalog-badge">Catalog profile <CircleHelp size={13} /><i>Generic product profile; no organization data is reused.</i></span>}{pendingProfiles.length > 0 ? <><label>Category<select value={selectedTool.category} onChange={event => updateProfile(selectedTool.id, 'category', event.target.value)}>{['Collaboration', 'Knowledge & Content', 'Work Management', 'Analytics & BI', 'AI & Automation', 'Customer & Revenue', 'Security & IT', 'Finance & Operations', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label><label>Profile summary<textarea rows="4" value={selectedTool.summary} onChange={event => updateProfile(selectedTool.id, 'summary', event.target.value)} /></label><label>Capabilities <small>Comma-separated</small><textarea rows="4" value={selectedTool.capabilities.join(', ')} onChange={event => updateProfile(selectedTool.id, 'capabilities', event.target.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 10))} /></label></> : <><p>{selectedTool.summary}</p><div className="vendor-detail-section"><span>Core capabilities</span>{selectedTool.capabilities.map(capability => <b key={capability}>{capability}</b>)}</div></>}<div className="vendor-detail-section"><span>Stated use in this inventory</span><p>{selectedTool.statedUse}</p></div>{selectedTool.websiteUrl && <a href={selectedTool.websiteUrl} target="_blank" rel="noreferrer">Open official website <ExternalLink size={15} /></a>}<div className="vendor-drawer-note"><CircleAlert size={16} /> Review these generic capabilities against your product edition and actual implementation before confirming the profile.</div>{pendingProfiles.length > 0 && <div className="vendor-review-actions"><button className="vendor-secondary" onClick={() => setReviewStatus(selectedTool.id, 'excluded')}>Exclude</button><button className="vendor-primary" disabled={selectedTool.reviewStatus === 'accepted'} onClick={() => setReviewStatus(selectedTool.id, 'accepted')}><CheckCircle2 size={16} /> {selectedTool.reviewStatus === 'accepted' ? 'Accepted' : 'Accept profile'}</button></div>}</aside></div>}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}
