import React, { useMemo, useState } from 'react';
import { Footprints, HeartPulse, Loader, Moon } from 'lucide-react';
import './HealthCharts.css';

const CHART_WIDTH = 760;
const CHART_HEIGHT = 290;
const PLOT = { left: 66, right: 24, top: 30, bottom: 50 };

const chartDefinitions = [
  { field: 'steps', title: 'Daily steps', axis: 'Steps', color: '#8b7cff', kind: 'bar', icon: Footprints, format: value => value.toLocaleString() },
  { field: 'sleepMinutes', title: 'Sleep duration', axis: 'Hours', color: '#42c7f4', kind: 'area', icon: Moon, format: formatSleep },
  { field: 'restingHeartRate', title: 'Resting heart rate', axis: 'BPM', color: '#fb7f83', kind: 'line', icon: HeartPulse, format: value => `${value} bpm` },
];

function parseDay(date) {
  return new Date(`${date}T12:00:00`);
}

function formatDay(date, options = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', options).format(parseDay(date));
}

function formatSleep(minutes) {
  if (!Number.isFinite(minutes)) return 'No data';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function latestValue(metrics, key) {
  return [...metrics].reverse().find(day => Number.isFinite(day[key]))?.[key];
}

function makeTicks(max, field) {
  if (field === 'sleepMinutes') {
    const hours = Math.max(1, Math.ceil(max / 60));
    const top = Math.ceil(hours / 2) * 2 * 60;
    return [0, top / 2, top];
  }
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(max, 1)));
  const normalized = max / magnitude;
  const step = (normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2) * magnitude;
  const top = Math.ceil(max / step) * step;
  return [0, top / 2, top];
}

function segments(points) {
  const result = [];
  let current = [];
  points.forEach(point => {
    if (point) current.push(point);
    else if (current.length) { result.push(current); current = []; }
  });
  if (current.length) result.push(current);
  return result;
}

function SnapshotCards({ metrics }) {
  return (
    <div className="signal-summary-cards">
      {chartDefinitions.map(({ field, title, color, icon: Icon, format }) => {
        const value = latestValue(metrics, field);
        return (
          <article className="signal-summary-card" key={field}>
            <span className="signal-summary-icon" style={{ '--signal-color': color }}><Icon size={17} /></span>
            <span>{title}</span>
            <strong>{Number.isFinite(value) ? format(value) : '—'}</strong>
            <small>Most recent available day</small>
          </article>
        );
      })}
    </div>
  );
}

function HealthChart({ metrics, definition }) {
  const { field, title, axis, color, kind, format, icon: Icon } = definition;
  const [selectedIndex, setSelectedIndex] = useState(Math.max(metrics.length - 1, 0));
  const values = metrics.map(day => day[field]);
  const available = values.filter(Number.isFinite);
  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const max = available.length ? Math.max(...available) : 0;
  const ticks = makeTicks(max || 1, field);
  const chartMax = ticks[ticks.length - 1] || 1;
  const xFor = index => metrics.length <= 1 ? PLOT.left + plotWidth / 2 : PLOT.left + (index / (metrics.length - 1)) * plotWidth;
  const yFor = value => PLOT.top + plotHeight - (value / chartMax) * plotHeight;
  const points = values.map((value, index) => Number.isFinite(value) ? { x: xFor(index), y: yFor(value), value, index } : null);
  const activeIndex = Math.min(selectedIndex, Math.max(metrics.length - 1, 0));
  const activeDay = metrics[activeIndex];
  const activeValue = activeDay?.[field];
  const xTicks = useMemo(() => {
    if (metrics.length <= 1) return [0];
    return [...new Set([0, Math.round((metrics.length - 1) / 3), Math.round((metrics.length - 1) * 2 / 3), metrics.length - 1])];
  }, [metrics.length]);

  const selectFromPointer = event => {
    if (!metrics.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const index = Math.round((relativeX / rect.width) * (metrics.length - 1));
    setSelectedIndex(index);
  };

  if (!metrics.length || !available.length) {
    return <article className="health-chart-panel"><div className="health-chart-title"><span className="health-chart-icon" style={{ '--signal-color': color }}><Icon size={17} /></span><div><h3>{title}</h3><p>Daily private signal</p></div></div><div className="health-chart-no-data">No wearable data is available for this metric yet.</div></article>;
  }

  const activeX = xFor(activeIndex);
  return (
    <article className="health-chart-panel">
      <div className="health-chart-header">
        <div className="health-chart-title"><span className="health-chart-icon" style={{ '--signal-color': color }}><Icon size={17} /></span><div><h3>{title}</h3><p>Touch, click, or hover a day to inspect it</p></div></div>
        <div className="health-chart-reading" aria-live="polite"><strong>{Number.isFinite(activeValue) ? format(activeValue) : 'No data'}</strong><span>{activeDay ? formatDay(activeDay.date, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}</span></div>
      </div>
      <div className="health-chart-canvas" onPointerMove={selectFromPointer} onClick={selectFromPointer} role="presentation">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-label={`${title} over the last ${metrics.length} days`} role="img">
          <rect className="health-chart-plot" x={PLOT.left} y={PLOT.top} width={plotWidth} height={plotHeight} rx="8" />
          {ticks.map(tick => {
            const y = yFor(tick);
            return <g key={tick}><line className="health-chart-grid" x1={PLOT.left} x2={CHART_WIDTH - PLOT.right} y1={y} y2={y} /><text className="health-chart-y-label" x={PLOT.left - 10} y={y + 4}>{field === 'sleepMinutes' ? `${tick / 60}h` : Math.round(tick).toLocaleString()}</text></g>;
          })}
          <text className="health-chart-axis-title" x="17" y={PLOT.top + plotHeight / 2} transform={`rotate(-90 17 ${PLOT.top + plotHeight / 2})`}>{axis}</text>
          {xTicks.map(index => <g key={index}><line className="health-chart-tick" x1={xFor(index)} x2={xFor(index)} y1={PLOT.top + plotHeight} y2={PLOT.top + plotHeight + 5} /><text className="health-chart-x-label" x={xFor(index)} y={CHART_HEIGHT - 19}>{formatDay(metrics[index].date)}</text></g>)}
          {kind === 'bar' && points.map(point => point && <rect key={point.index} className="health-chart-bar" x={point.x - Math.max(3, Math.min(9, plotWidth / metrics.length / 2))} y={point.y} width={Math.max(6, Math.min(18, plotWidth / metrics.length - 4))} height={PLOT.top + plotHeight - point.y} rx="3" fill={color} />)}
          {kind !== 'bar' && segments(points).map((segment, index) => <React.Fragment key={index}>{kind === 'area' && <path className="health-chart-area" d={`M ${segment[0].x} ${PLOT.top + plotHeight} L ${segment.map(point => `${point.x} ${point.y}`).join(' L ')} L ${segment[segment.length - 1].x} ${PLOT.top + plotHeight} Z`} fill={color} />}<polyline className="health-chart-line" points={segment.map(point => `${point.x},${point.y}`).join(' ')} stroke={color} /></React.Fragment>)}
          <line className="health-chart-crosshair" x1={activeX} x2={activeX} y1={PLOT.top} y2={PLOT.top + plotHeight} />
          {points[activeIndex] && <circle className="health-chart-marker" cx={points[activeIndex].x} cy={points[activeIndex].y} r="5" fill={color} />}
        </svg>
      </div>
      <p className="health-chart-caption">Gaps indicate that no wearable value was recorded for that day.</p>
    </article>
  );
}

export default function HealthCharts({ metrics, loading }) {
  return (
    <section className="signals-dashboard" aria-labelledby="signals-heading">
      <div className="signals-heading"><div><span className="signals-eyebrow">Your health signals</span><h2 id="signals-heading">Last 30 days, at a glance</h2><p>Each chart uses your secure Fitbit-backed Google Health data. Select any day for its reading.</p></div>{loading && <Loader className="spin" size={18} />}</div>
      <SnapshotCards metrics={metrics} />
      <div className="health-chart-stack">{chartDefinitions.map(definition => <HealthChart key={definition.field} metrics={metrics} definition={definition} />)}</div>
    </section>
  );
}
