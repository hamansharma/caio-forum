import React, { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import './HealthInsights.css';

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

export default function HealthInsights({ insights = [] }) {
  const [expandedDate, setExpandedDate] = useState(insights[0]?.date || null);
  if (!insights.length) return null;
  return (
    <section className="health-insights" aria-labelledby="health-insights-heading">
      <div className="health-insights-heading"><span><Sparkles size={17} /> Daily Insights</span><p>Private, stored summaries based on completed daily signals. Informational only—not medical advice.</p></div>
      <div className="health-insight-list">
        {insights.map(insight => {
          const expanded = expandedDate === insight.date;
          return <article className={`health-insight${expanded ? ' expanded' : ''}`} key={insight.id || insight.date}>
            <button type="button" className="health-insight-toggle" aria-expanded={expanded} onClick={() => setExpandedDate(expanded ? null : insight.date)}>
              <span><strong>{insight.headline}</strong><small>{formatDate(insight.date)}</small></span><ChevronDown size={18} />
            </button>
            {expanded && <div className="health-insight-content"><p>{insight.summary}</p><ul>{(insight.observations || []).map((observation, index) => <li key={index}>{observation}</li>)}</ul>{insight.suggestion && <div className="health-insight-suggestion"><strong>Optional next step</strong><span>{insight.suggestion}</span></div>}</div>}
          </article>;
        })}
      </div>
    </section>
  );
}
