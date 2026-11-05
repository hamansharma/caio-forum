import React from 'react';
import { PAGE_GUIDES } from '../data/pageGuides';
import './PageGuide.css';

// "About this tool" section at the bottom of an AI Playground page: a plain
// explanation and a few common questions (content in src/data/pageGuides.js).
export default function PageGuide({ id }) {
  const guide = PAGE_GUIDES[id];
  if (!guide) return null;
  return (
    <section className="page-guide" aria-labelledby={`guide-${id}`}>
      <h2 id={`guide-${id}`}>{guide.title}</h2>
      {guide.paragraphs.map(text => <p key={text}>{text}</p>)}
      <h3>Common questions</h3>
      <dl>
        {guide.faqs.map(({ q, a }) => (
          <div key={q}><dt>{q}</dt><dd>{a}</dd></div>
        ))}
      </dl>
    </section>
  );
}
