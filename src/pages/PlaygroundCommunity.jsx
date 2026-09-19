import React, { useState } from 'react';
import { ArrowLeft, Lightbulb, MessageCircleQuestion, Plus, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForum } from '../context/ForumContext';
import PostCard from '../components/PostCard';
import AuthModal from '../components/AuthModal';
import { playgroundPostTypes, playgroundTools } from '../data/playgroundCommunity';
import './PlaygroundCommunity.css';

const promptIcons = [Lightbulb, MessageCircleQuestion, Sparkles];

export default function PlaygroundCommunity() {
  const { posts, user, loading } = useForum();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const params = new URLSearchParams(location.search);
  const tool = playgroundTools[params.get('tool')] ? params.get('tool') : 'all';
  const type = playgroundPostTypes.some(item => item.key === params.get('type')) ? params.get('type') : 'all';
  const toolLabel = playgroundTools[tool].label;
  const playgroundPosts = posts.filter(post => post.playground && (tool === 'all' || post.playgroundTool === tool) && (type === 'all' || post.playgroundType === type)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const openRoom = nextTool => navigate(`/playground/community${nextTool === 'all' ? '' : `?tool=${nextTool}`}`);
  const setType = nextType => {
    const next = new URLSearchParams();
    if (tool !== 'all') next.set('tool', tool);
    if (nextType !== 'all') next.set('type', nextType);
    navigate(`/playground/community${next.size ? `?${next}` : ''}`);
  };
  const startDiscussion = nextType => {
    const query = new URLSearchParams({ space: 'playground', tool: tool === 'all' ? 'general' : tool, type: nextType || 'question' });
    user ? navigate(`/create?${query}`) : setShowAuth(true);
  };

  return <main className="playground-community-page">
    <button className="playground-community-back" onClick={() => navigate('/playground')}><ArrowLeft size={15} /> AI Playground</button>
    <section className="playground-community-hero">
      <span><Sparkles size={15} /> Community workspace</span>
      <h1>{tool === 'all' ? 'Help shape the AI Playground' : `${toolLabel} community`}</h1>
      <p>{tool === 'all' ? 'Discuss each Playground tool in its own room—suggest improvements, ask practical questions, and share what you learned.' : `A focused room for suggestions, questions, and learnings about ${toolLabel}.`}</p>
      <button className="playground-community-cta" onClick={() => startDiscussion('question')}><Plus size={16} /> Start a discussion</button>
    </section>
    <nav className="playground-community-tools" aria-label="Playground discussion rooms">{Object.entries(playgroundTools).map(([key, item]) => <button key={key} className={tool === key ? 'active' : ''} onClick={() => openRoom(key)}>{item.shortLabel}</button>)}</nav>
    <section className="playground-community-prompts" aria-label="Discussion ideas">
      {playgroundPostTypes.map(({ key, label, prompt }, index) => { const Icon = promptIcons[index]; return <button key={key} onClick={() => startDiscussion(key)}><Icon size={17} /><span><strong>{label}</strong><small>{tool === 'all' ? 'Choose a tool when you post.' : prompt}</small></span></button>; })}
    </section>
    <section className="playground-community-feed">
      <header><div><h2>{type === 'all' ? 'Community discussion' : `${playgroundPostTypes.find(item => item.key === type).shortLabel}s`}</h2><p>{playgroundPosts.length} post{playgroundPosts.length === 1 ? '' : 's'} in {tool === 'all' ? 'the Playground' : toolLabel}</p></div><button onClick={() => startDiscussion(type === 'all' ? 'question' : type)}>New post <Plus size={14} /></button></header>
      <nav className="playground-community-types" aria-label="Discussion type">{['all', ...playgroundPostTypes.map(item => item.key)].map(key => <button key={key} className={type === key ? 'active' : ''} onClick={() => setType(key)}>{key === 'all' ? 'All activity' : playgroundPostTypes.find(item => item.key === key).shortLabel}</button>)}</nav>
      <div className="posts-list">{loading ? <p className="playground-community-empty">Loading discussions…</p> : playgroundPosts.length ? playgroundPosts.map(post => <PostCard key={post.id} post={post} />) : <section className="playground-community-empty"><Sparkles size={21} /><h3>Start the first conversation</h3><p>{tool === 'all' ? 'Choose a tool, then share an idea, question, or learning.' : `What would make ${toolLabel} more valuable to you?`}</p><button onClick={() => startDiscussion('suggestion')}>Share an idea</button></section>}</div>
    </section>
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
  </main>;
}
