import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BrainCircuit, CheckCircle2, CircleAlert, DollarSign, ExternalLink, History, LoaderCircle, MessageCircle, Network, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { useForum } from '../context/ForumContext';
import AuthModal from '../components/AuthModal';
import VendorJourney from '../components/VendorJourney';
import usePageMeta from '../hooks/usePageMeta';
import './VendorPortfolio.css';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

async function authenticatedRequest(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in to access private analysis.');
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

export default function VendorPortfolioAnalysis() {
  usePageMeta('Vendor Overlap Analysis | Free Open-Source Portfolio Mapper', 'Identify software overlap hypotheses and validate renewal decisions with a free, open-source vendor portfolio analysis workspace.', { canonicalPath: '/playground/vendor-portfolio/analysis', noIndex: true });
  const { user, authLoading } = useForum();
  const [tools, setTools] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [selected, setSelected] = useState(0);
  const [selectedTool, setSelectedTool] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  useEffect(() => {
    if (!user) { setLoadingAnalysis(false); return; }
    setLoadingAnalysis(true);
    Promise.all([authenticatedRequest('/api/vendor-portfolio?action=tools'), authenticatedRequest('/api/vendor-portfolio?action=analyses')]).then(([toolData, analysisData]) => { setTools(toolData.tools || []); setAnalyses(analysisData.analyses || []); setActiveAnalysis(analysisData.analyses?.[0] || null); setSelected(0); }).catch(requestError => setError(requestError.message)).finally(() => setLoadingAnalysis(false));
  }, [user]);
  const runAnalysis = async () => {
    if (!user) { setShowAuth(true); return; }
    setAnalyzing(true); setError('');
    try { const result = await authenticatedRequest('/api/vendor-portfolio?action=overlap', { method: 'POST', body: '{}' }); setAnalyses(current => [result, ...current]); setActiveAnalysis(result); setSelected(0); }
    catch (requestError) { setError(requestError.message); }
    finally { setAnalyzing(false); }
  };
  const clusters = activeAnalysis?.clusters || [];
  const cluster = clusters[selected] || null;
  const spend = activeAnalysis?.spend;
  const toolNames = useMemo(() => cluster?.toolNames || cluster?.toolIds?.map(id => tools.find(tool => tool.id === id)?.name || activeAnalysis?.toolSnapshot?.find(tool => tool.id === id)?.name || 'Tool') || [], [cluster, tools, activeAnalysis]);
  return <main className="vendor-page"><div className="vendor-feature-nav"><Link to="/playground"><ArrowLeft size={15} /> AI Playground</Link><Link to="/playground/vendor-portfolio">Portfolio intake</Link><Link to="/playground/community?tool=vendors"><MessageCircle size={15} /> Discuss this tool</Link></div><VendorJourney current="analysis" />
    <section className="vendor-analysis-hero"><div><span className="vendor-eyebrow"><BrainCircuit size={15} /> Private analysis</span><h1>Portfolio review prompts</h1><p>{activeAnalysis?.summary || 'Analyze confirmed capability profiles to identify areas worth validating with real usage, contract, and workflow evidence.'}</p></div><div className="vendor-analysis-hero-actions">{analyses.length > 0 && <button className="vendor-secondary vendor-history-trigger" onClick={() => setHistoryOpen(true)}><History size={16} /> History <b>{analyses.length}</b></button>}<button className="vendor-primary" onClick={runAnalysis} disabled={analyzing || authLoading || loadingAnalysis}>{analyzing ? <><LoaderCircle className="spin" size={16} /> Analyzing…</> : <><BrainCircuit size={16} /> {user ? activeAnalysis ? 'Run another analysis' : 'Run analysis' : 'Sign in to analyze'}</>}</button></div></section>
    {error && <div className="vendor-error">{error}</div>}
    {activeAnalysis && <section className="vendor-spend-summary"><div className="vendor-spend-heading"><div><span className="vendor-eyebrow"><DollarSign size={15} /> Spend signal</span><h2>Cost context for this review</h2><p>{spend?.costedToolCount ? `Based on annual costs entered for ${spend.costedToolCount} of ${spend.totalInventoryTools} inventory tools.` : 'Add annual costs to turn overlap hypotheses into spend and savings estimates.'}</p></div><span className="vendor-spend-profile-count"><Network size={16} /><strong>{tools.length}</strong> profiles ready</span></div>{spend?.costedToolCount ? <><div className="vendor-spend-metrics"><div><span>Entered annual IT spend</span><strong>{money.format(spend.totalAnnualSpend)}</strong><small>{spend.costedToolCount}/{spend.totalInventoryTools} tools with cost data</small></div><div><span>Spend in overlap review</span><strong>{spend.addressableCostedToolCount ? money.format(spend.addressableSpend) : '—'}</strong><small>{spend.addressableCostedToolCount ? `${spend.addressableCostedToolCount} costed tools in review areas` : 'No costed overlap tools'}</small></div><div className="vendor-savings-metric"><span>Estimated addressable savings</span><strong>{spend.addressableCostedToolCount ? `${money.format(spend.potentialSavingsLow)}–${money.format(spend.potentialSavingsHigh)}/yr` : 'No overlap costs yet'}</strong><small>{spend.addressableCostedToolCount ? 'A conservative scenario range—not guaranteed savings.' : 'Costs are never inferred.'}</small></div></div><p className="vendor-spend-method">Estimate uses 5–30% of the costed tools appearing in overlap review areas, weighted by the strongest confidence signal and counted once. Confirm usage, contracts, migration effort, and owner needs before acting.</p></> : <div className="vendor-spend-empty"><DollarSign size={18} /><div><strong>No annual cost data yet</strong><p>Add annual costs to inventory tools to see total IT spend, cost coverage, and estimated addressable savings. We never infer a price.</p></div><Link className="vendor-secondary" to="/playground/vendor-portfolio">Add annual costs</Link></div>}</section>}
    {loadingAnalysis ? <div className="vendor-loading"><LoaderCircle className="spin" size={18} /><p>Loading your private analysis and saved profiles…</p></div> : !cluster ? <section className="vendor-profile-empty"><BrainCircuit size={29} /><h1>No analysis yet.</h1><p>Save and accept at least two capability profiles, then run a private analysis.</p></section> : <section className="vendor-analysis-layout"><aside className="vendor-analysis-nav"><span>Potential review areas</span>{clusters.map((item, index) => <button key={`${item.title}-${index}`} className={selected === index ? 'active' : ''} onClick={() => setSelected(index)}><b>{index + 1}</b><div><strong>{item.title}</strong><small>{(item.toolNames || item.toolIds || []).length} tools · {item.confidence} confidence</small></div><ArrowRight size={15} /></button>)}</aside><article className="vendor-analysis-detail"><div className="vendor-analysis-detail-top"><span className={`vendor-confidence ${(cluster.confidence || 'Low').toLowerCase()}`}>{cluster.confidence || 'Low'} confidence</span><span>Hypothesis to validate</span></div><h2>{cluster.title}</h2><div className="vendor-analysis-tools">{toolNames.map(name => <button key={name} onClick={() => setSelectedTool(tools.find(tool => tool.name === name) || null)}>{name}</button>)}</div><section><span>Shared capability</span><p>{cluster.sharedCapability}</p></section><section><span>Why this is worth reviewing</span><p>{cluster.hypothesis}</p></section><section className="vendor-validate"><CircleAlert size={17} /><div><span>Validate with</span><p>{cluster.evidenceNeeded}</p></div></section><div className="vendor-analysis-footer"><CheckCircle2 size={17} /><p>A review prompt is not a consolidation recommendation. Confirm evidence with tool owners before taking action.</p></div></article></section>}
    {historyOpen && <div className="vendor-drawer-backdrop" onMouseDown={() => setHistoryOpen(false)}><aside className="vendor-detail-drawer vendor-analysis-history" role="dialog" aria-modal="true" aria-label="Private analysis history" onMouseDown={event => event.stopPropagation()}><button className="vendor-drawer-close" onClick={() => setHistoryOpen(false)} aria-label="Close analysis history"><X size={19} /></button><span className="vendor-eyebrow"><History size={15} /> Private history</span><h2>Saved analysis runs</h2><p>Choose a snapshot to revisit the overlap hypotheses and cost context captured at that time.</p><div className="vendor-history-list">{analyses.map(analysis => <button className={activeAnalysis?.id === analysis.id ? 'active' : ''} key={analysis.id} onClick={() => { setActiveAnalysis(analysis); setSelected(0); setHistoryOpen(false); }}><History size={16} /><span>{new Date(analysis.createdAt || analysis.analyzedAt).toLocaleDateString()}</span><strong>{analysis.clusters?.length || 0} review areas</strong><small>{analysis.toolSnapshot?.length || tools.length} profiles</small></button>)}</div></aside></div>}{selectedTool && <div className="vendor-drawer-backdrop" onMouseDown={() => setSelectedTool(null)}><aside className="vendor-detail-drawer" role="dialog" aria-modal="true" aria-label={`${selectedTool.name} profile details`} onMouseDown={event => event.stopPropagation()}><button className="vendor-drawer-close" onClick={() => setSelectedTool(null)} aria-label="Close profile details"><X size={19} /></button><span className="vendor-eyebrow">{selectedTool.category}</span><h2>{selectedTool.name}</h2><p>{selectedTool.summary}</p><div className="vendor-detail-section"><span>Core capabilities</span>{selectedTool.capabilities.map(capability => <b key={capability}>{capability}</b>)}</div><div className="vendor-detail-section"><span>Stated use in this inventory</span><p>{selectedTool.statedUse}</p></div>{selectedTool.websiteUrl && <a href={selectedTool.websiteUrl} target="_blank" rel="noreferrer">Open official website <ExternalLink size={15} /></a>}</aside></div>}{showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}
