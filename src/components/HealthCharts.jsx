import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Dumbbell, Flame, Footprints, Gauge, HeartPulse, Loader, Moon, Route, Wind } from 'lucide-react';
import './HealthCharts.css';

const INITIAL_CHART_WIDTH = 760;

const coreCharts = [
  { field: 'steps', title: 'Daily steps', axis: 'Steps', color: '#8b7cff', kind: 'bar', icon: Footprints, format: value => value.toLocaleString() },
  { field: 'sleepMinutes', title: 'Sleep duration', axis: 'Hours', color: '#42c7f4', kind: 'area', icon: Moon, format: formatSleep },
  { field: 'restingHeartRate', title: 'Resting heart rate', axis: 'BPM', color: '#fb7f83', kind: 'line', icon: HeartPulse, format: value => `${value} bpm` },
];

const activityCharts = [
  { field: 'activeZoneMinutes', title: 'Active Zone Minutes', axis: 'Minutes', color: '#ff9b4a', kind: 'bar', icon: Flame, format: value => `${value} min` },
  { field: 'activeCalories', title: 'Active energy burned', axis: 'kcal', color: '#f973a6', kind: 'area', icon: Flame, format: value => `${value.toLocaleString()} kcal` },
  { field: 'activeMinutes', title: 'Active minutes', axis: 'Minutes', color: '#eab308', kind: 'bar', icon: Activity, format: value => `${value} min` },
  { field: 'distanceKm', title: 'Distance', axis: 'Miles', color: '#4ade80', kind: 'line', icon: Route, format: value => `${(value * 0.621371).toFixed(1)} mi` },
  { field: 'exerciseMinutes', title: 'Exercise time', axis: 'Minutes', color: '#a78bfa', kind: 'bar', icon: Dumbbell, format: value => `${value} min` },
  { field: 'floors', title: 'Floors climbed', axis: 'Floors', color: '#facc15', kind: 'bar', icon: Activity, format: value => `${value} floors` },
  { field: 'cardioMinutes', title: 'Cardio Zone Minutes', axis: 'Minutes', color: '#fb923c', kind: 'bar', icon: HeartPulse, format: value => `${value} min` },
  { field: 'totalCalories', title: 'Total energy burned', axis: 'kcal', color: '#fb7185', kind: 'area', icon: Flame, format: value => `${value.toLocaleString()} kcal` },
];

const recoveryCharts = [
  { field: 'hrvMs', title: 'Heart-rate variability', axis: 'Milliseconds', color: '#c084fc', kind: 'line', icon: HeartPulse, format: value => `${value} ms` },
  { field: 'oxygenSaturation', title: 'Blood oxygen', axis: 'SpO₂ %', color: '#22d3ee', kind: 'line', icon: Gauge, format: value => `${value}%` },
  { field: 'respiratoryRate', title: 'Sleep respiratory rate', axis: 'Breaths / min', color: '#60a5fa', kind: 'line', icon: Wind, format: value => `${value} breaths/min` },
  { field: 'vo2Max', title: 'Cardio fitness (VO₂ max)', axis: 'ml/kg/min', color: '#34d399', kind: 'line', icon: Activity, format: value => `${value} ml/kg/min` },
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

function makeTicks(min, max, field, zeroBaseline) {
  if (field === 'sleepMinutes') {
    const hours = Math.max(1, Math.ceil(max / 60));
    const top = Math.ceil(hours / 2) * 2 * 60;
    return [0, top / 2, top];
  }
  if (!zeroBaseline) return [min, (min + max) / 2, max];
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(max, 1)));
  const normalized = max / magnitude;
  const step = (normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2) * magnitude;
  const top = Math.ceil(max / step) * step;
  return [0, top / 2, top];
}

function chartDomain(values, field, kind) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const zeroBaseline = kind === 'bar' || kind === 'area' || field === 'sleepMinutes';
  if (zeroBaseline) return { min: 0, max: maximum || 1, zeroBaseline };
  const spread = Math.max(maximum - minimum, Math.abs(maximum) * 0.08, 1);
  return { min: Math.max(0, minimum - spread * 0.25), max: maximum + spread * 0.25, zeroBaseline };
}

function formatTick(value, field) {
  if (field === 'sleepMinutes') return `${value / 60}h`;
  if (field === 'distanceKm') return `${(value * 0.621371).toFixed(1)}`;
  if (['oxygenSaturation', 'respiratoryRate', 'hrvMs', 'vo2Max'].includes(field)) return value.toFixed(1);
  return Math.round(value).toLocaleString();
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
      {coreCharts.map(({ field, title, color, icon: Icon, format }) => {
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
  const [chartWidth, setChartWidth] = useState(INITIAL_CHART_WIDTH);
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const measure = () => setChartWidth(Math.max(280, Math.round(canvas.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  const values = metrics.map(day => day[field]);
  const available = values.filter(Number.isFinite);
  const chartHeight = Math.max(275, Math.min(350, Math.round(chartWidth * 0.42)));
  const plot = { left: 56, right: 14, top: 28, bottom: 48 };
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const domain = available.length ? chartDomain(available, field, kind) : { min: 0, max: 1, zeroBaseline: true };
  const ticks = makeTicks(domain.min, domain.max, field, domain.zeroBaseline);
  const chartMin = ticks[0] || 0;
  const chartMax = ticks[ticks.length - 1] || 1;
  const xFor = index => metrics.length <= 1 ? plot.left + plotWidth / 2 : plot.left + (index / (metrics.length - 1)) * plotWidth;
  const yFor = value => plot.top + plotHeight - ((value - chartMin) / (chartMax - chartMin || 1)) * plotHeight;
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
    const svgX = (relativeX / rect.width) * chartWidth;
    const clampedX = Math.min(Math.max(svgX, plot.left), plot.left + plotWidth);
    const index = Math.round(((clampedX - plot.left) / plotWidth) * (metrics.length - 1));
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
      <div className="health-chart-canvas" ref={canvasRef} onPointerMove={selectFromPointer} onClick={selectFromPointer} role="presentation">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} aria-label={`${title} over the last ${metrics.length} days`} role="img">
          <rect className="health-chart-plot" x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} rx="8" />
          {ticks.map(tick => {
            const y = yFor(tick);
            return <g key={tick}><line className="health-chart-grid" x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} /><text className="health-chart-y-label" x={plot.left - 10} y={y + 4}>{formatTick(tick, field)}</text></g>;
          })}
          <text className="health-chart-axis-title" x="16" y={plot.top + plotHeight / 2} transform={`rotate(-90 16 ${plot.top + plotHeight / 2})`}>{axis}</text>
          {xTicks.map(index => <g key={index}><line className="health-chart-tick" x1={xFor(index)} x2={xFor(index)} y1={plot.top + plotHeight} y2={plot.top + plotHeight + 5} /><text className="health-chart-x-label" x={xFor(index)} y={chartHeight - 18}>{formatDay(metrics[index].date)}</text></g>)}
          {kind === 'bar' && points.map(point => point && <rect key={point.index} className="health-chart-bar" x={point.x - Math.max(3, Math.min(9, plotWidth / metrics.length / 2))} y={point.y} width={Math.max(6, Math.min(18, plotWidth / metrics.length - 4))} height={plot.top + plotHeight - point.y} rx="3" fill={color} />)}
          {kind !== 'bar' && segments(points).map((segment, index) => <React.Fragment key={index}>{kind === 'area' && <path className="health-chart-area" d={`M ${segment[0].x} ${plot.top + plotHeight} L ${segment.map(point => `${point.x} ${point.y}`).join(' L ')} L ${segment[segment.length - 1].x} ${plot.top + plotHeight} Z`} fill={color} />}<polyline className="health-chart-line" points={segment.map(point => `${point.x},${point.y}`).join(' ')} stroke={color} /></React.Fragment>)}
          <line className="health-chart-crosshair" x1={activeX} x2={activeX} y1={plot.top} y2={plot.top + plotHeight} />
          {points[activeIndex] && <circle className="health-chart-marker" cx={points[activeIndex].x} cy={points[activeIndex].y} r="5" fill={color} />}
        </svg>
      </div>
      <p className="health-chart-caption">Gaps indicate that no wearable value was recorded for that day.</p>
    </article>
  );
}

function WorkoutTimeline({ workouts }) {
  if (!workouts.length) return null;
  return (
    <section className="health-workouts" aria-labelledby="workout-heading">
      <div className="health-chart-group-heading"><span id="workout-heading">Recent workouts</span><p>Workout summaries from Fitbit. Route traces and raw sensor streams are not stored here.</p></div>
      <div className="health-workout-list">
        {workouts.map(workout => <article className="health-workout" key={workout.id}>
          <span className="health-workout-icon"><Dumbbell size={16} /></span>
          <div><strong>{workout.displayName}</strong><span>{formatDay(workout.date, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
          <div className="health-workout-metrics">
            {Number.isFinite(workout.durationMinutes) && <span>{workout.durationMinutes} min</span>}
            {Number.isFinite(workout.calories) && <span>{workout.calories} kcal</span>}
            {Number.isFinite(workout.averageHeartRate) && <span>{workout.averageHeartRate} bpm avg</span>}
          </div>
        </article>)}
      </div>
    </section>
  );
}

export default function HealthCharts({ metrics, workouts = [], loading }) {
  const availableCharts = definitions => definitions.filter(({ field }) => metrics.some(day => Number.isFinite(day[field])));
  const activity = availableCharts(activityCharts);
  const recovery = availableCharts(recoveryCharts);
  return (
    <section className="signals-dashboard" aria-labelledby="signals-heading">
      <div className="signals-heading"><div><span className="signals-eyebrow">Your health signals</span><h2 id="signals-heading">Last 30 days, at a glance</h2><p>Each chart uses your secure Fitbit-backed Google Health data. Select any day for its reading.</p></div>{loading && <Loader className="spin" size={18} />}</div>
      <SnapshotCards metrics={metrics} />
      <div className="health-chart-stack">{coreCharts.map(definition => <HealthChart key={definition.field} metrics={metrics} definition={definition} />)}</div>
      {activity.length > 0 && <section className="health-chart-group"><div className="health-chart-group-heading"><span>Activity & energy</span><p>Movement, effort, and workout totals from Fitbit.</p></div><div className="health-chart-stack">{activity.map(definition => <HealthChart key={definition.field} metrics={metrics} definition={definition} />)}</div></section>}
      <WorkoutTimeline workouts={workouts} />
      {recovery.length > 0 && <section className="health-chart-group"><div className="health-chart-group-heading"><span>Recovery context</span><p>Available overnight and fitness trends from your device. These are not medical assessments.</p></div><div className="health-chart-stack">{recovery.map(definition => <HealthChart key={definition.field} metrics={metrics} definition={definition} />)}</div></section>}
    </section>
  );
}
