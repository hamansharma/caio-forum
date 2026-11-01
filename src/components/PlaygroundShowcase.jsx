import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Award, ClipboardCheck, Database, FlaskConical, Network, Scale } from 'lucide-react';
import { PLAYGROUND_TOOLS } from '../data/playgroundTools';
import './PlaygroundShowcase.css';

// Same icons as the Playground page, so a tool looks the same everywhere.
const ICONS = { compass: ClipboardCheck, 'build-buy': Scale, vendors: Network, certifications: Award, 'data-atlas': Database, health: Activity };

const NewBadge = () => <span className="showcase-new">New</span>;

// Sidebar card listing every tool. Feed pages put it first in the sidebar, which
// only shows on wider screens; PlaygroundFeedCard covers phones.
export function PlaygroundSidebarCard() {
  return (
    <section className="sidebar-card showcase-card" aria-labelledby="showcase-title">
      <div className="showcase-head">
        <h2 id="showcase-title"><FlaskConical size={15} aria-hidden="true" /> AI Playground</h2>
        <span>{PLAYGROUND_TOOLS.length} free tools</span>
      </div>
      <p>Practical tools for AI decisions.</p>
      <ul className="showcase-tools">
        {PLAYGROUND_TOOLS.map(tool => {
          const Icon = ICONS[tool.id];
          return (
            <li key={tool.id}>
              <Link to={tool.path} className="showcase-tool">
                <span className="showcase-icon" aria-hidden="true"><Icon size={15} /></span>
                <span>
                  <strong>{tool.name}{tool.isNew && <NewBadge />}</strong>
                  <small>{tool.blurb}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/playground" className="showcase-all">See all tools <ArrowRight size={13} aria-hidden="true" /></Link>
    </section>
  );
}

// One tool per visit, taking turns, so returning visitors see a different one.
// Chosen once per page load; storage may be unavailable (private mode), which
// just means always starting from the first tool.
const spotlightIndex = (() => {
  try {
    const next = (Number(window.localStorage.getItem('caio-playground-spotlight')) || 0) + 1;
    window.localStorage.setItem('caio-playground-spotlight', String(next));
    return next % PLAYGROUND_TOOLS.length;
  } catch {
    return 0;
  }
})();

// Shown inside the post list on phones only (CSS), where the sidebar is hidden.
export function PlaygroundFeedCard() {
  const tool = PLAYGROUND_TOOLS[spotlightIndex];
  const Icon = ICONS[tool.id];
  return (
    <aside className="showcase-feed-card" aria-label="From the AI Playground">
      <div className="showcase-feed-eyebrow"><FlaskConical size={13} aria-hidden="true" /> From the AI Playground</div>
      <div className="showcase-feed-body">
        <span className="showcase-icon large" aria-hidden="true"><Icon size={18} /></span>
        <div>
          <h2>{tool.name}{tool.isNew && <NewBadge />}</h2>
          <p>{tool.pitch}</p>
        </div>
      </div>
      <div className="showcase-feed-actions">
        <Link to={tool.path} className="showcase-feed-cta">{tool.cta}</Link>
        <Link to="/playground" className="showcase-all">All {PLAYGROUND_TOOLS.length} tools <ArrowRight size={13} aria-hidden="true" /></Link>
      </div>
    </aside>
  );
}

// Inserts the feed card after the third post (or after the last, if fewer).
export function withPlaygroundCard(postElements) {
  if (!postElements.length) return postElements;
  const at = Math.min(3, postElements.length);
  return [...postElements.slice(0, at), <PlaygroundFeedCard key="playground-card" />, ...postElements.slice(at)];
}
