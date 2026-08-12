import React from 'react';
import './CharCount.css';

export default function CharCount({ current, max }) {
  const remaining = max - current;
  const pct = current / max;
  const status = pct >= 1 ? 'over' : pct >= 0.9 ? 'warning' : 'ok';

  if (pct < 0.7) return null; // only show when getting close

  return (
    <span className={`char-count char-count-${status}`}>
      {remaining < 0
        ? `${Math.abs(remaining)} over limit`
        : `${remaining.toLocaleString()} remaining`}
    </span>
  );
}