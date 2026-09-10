import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, HeartPulse, Link2, Loader, Moon, RefreshCw, ShieldCheck, Footprints } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { auth } from '../firebase';
import './Health.css';

async function authenticatedFetch(path, options = {}) {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  return fetch(path, {
    ...options,
    cache: options.cache ?? 'no-store',
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export default function Health() {
  const { user, authLoading } = useForum();
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [metrics, setMetrics] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const queryStatus = new URLSearchParams(window.location.search).get('connection');

  useEffect(() => {
    if (!user) return;
    let active = true;
    authenticatedFetch('/api/google-health/status')
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (active) setStatus(body);
      })
      .catch(err => active && setError(err.message || 'Unable to check Fitbit status.'));
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!status?.connected) return;
    let active = true;
    setMetricsLoading(true);
    authenticatedFetch('/api/google-health/metrics?days=30')
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (active) setMetrics(body.days || []);
      })
      .catch(err => active && setError(err.message || 'Unable to load your health summaries.'))
      .finally(() => active && setMetricsLoading(false));
    return () => { active = false; };
  }, [status?.connected]);

  const connect = async () => {
    setConnecting(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/google-health/connect');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      window.location.assign(body.authorizationUrl);
    } catch (err) {
      setError(err.message || 'Unable to begin Fitbit connection.');
      setConnecting(false);
    }
  };

  const verifyConnection = async () => {
    setError('');
    setProfile(null);
    try {
      const response = await authenticatedFetch('/api/google-health/identity');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setProfile(body.profile);
      setStatus(previous => ({ ...previous, identityVerifiedAt: new Date().toISOString() }));
    } catch (err) {
      setError(err.message || 'Unable to verify Fitbit connection.');
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setError('');
    setSyncMessage('');
    try {
      const response = await authenticatedFetch('/api/google-health/sync', { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setSyncMessage(`Synced ${body.daysSynced} days of private health summaries.`);
      const metricsResponse = await authenticatedFetch('/api/google-health/metrics?days=30');
      const metricsBody = await metricsResponse.json();
      if (metricsResponse.ok) setMetrics(metricsBody.days || []);
    } catch (err) {
      setError(err.message || 'Unable to sync health metrics.');
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading) return <main className="health-page"><p>Loading…</p></main>;
  if (!user) {
    return <main className="health-page"><section className="health-card"><h1>Personal Signals</h1><p>Please sign in to connect a Fitbit. Your health data is private to your account.</p></section></main>;
  }

  return (
    <main className="health-page">
      <section className="health-hero">
        <span className="health-kicker"><Activity size={15} /> CAIO Leadership Lab</span>
        <h1>Personal Signals</h1>
        <p>Connect Fitbit once. We’ll use your data only for your private dashboard and future personal insights.</p>
      </section>

      <section className="health-card">
        <div className="health-card-heading">
          <div className="fitbit-mark">F</div>
          <div><h2>Fitbit via Google Health</h2><p>Sleep, activity, heart rate, and workout data</p></div>
        </div>

        {queryStatus === 'connected' && <p className="health-success"><CheckCircle2 size={17} /> Your health account is connected. Verify it below.</p>}
        {queryStatus && queryStatus !== 'connected' && <p className="health-error">Connection was not completed. Please try again.</p>}
        {error && <p className="health-error">{error}</p>}

        {status?.connected ? (
          <div className="health-connected">
            <p><CheckCircle2 size={18} /> Connected securely</p>
            <button className="health-secondary" onClick={verifyConnection}>Verify connection</button>
            <button className="health-secondary" onClick={syncNow} disabled={syncing}>{syncing ? <><Loader className="spin" size={15} /> Syncing…</> : <><RefreshCw size={15} /> Sync last 30 days</>}</button>
            {profile && <p className="health-verified">Google Health connection verified.</p>}
            {syncMessage && <p className="health-verified">{syncMessage}</p>}
          </div>
        ) : (
          <button className="health-connect" onClick={connect} disabled={connecting || !status}>
            {connecting ? <><Loader className="spin" size={17} /> Opening Google…</> : <><Link2 size={17} /> Connect Fitbit</>}
          </button>
        )}
      </section>

      <section className="health-privacy">
        <ShieldCheck size={20} />
        <div><strong>Private by design</strong><p>Your Google Health access tokens stay on the server, encrypted. No health data is posted to the forum or shared with other members.</p></div>
      </section>

      {status?.connected && <SignalsDashboard metrics={metrics} loading={metricsLoading} />}
    </main>
  );
}

function latestValue(metrics, key) {
  return [...metrics].reverse().find(day => Number.isFinite(day[key]))?.[key];
}

function formatSleep(minutes) {
  if (!Number.isFinite(minutes)) return '—';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function Sparkline({ metrics, field, color }) {
  const values = metrics.map(day => day[field]);
  const available = values.filter(Number.isFinite);
  if (!available.length) return <div className="signal-empty">No wearable data yet</div>;
  const min = Math.min(...available);
  const max = Math.max(...available);
  const points = values.map((value, index) => {
    if (!Number.isFinite(value)) return null;
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = max === min ? 50 : 88 - ((value - min) / (max - min)) * 76;
    return `${x},${y}`;
  }).filter(Boolean).join(' ');
  return <svg className="signal-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SignalsDashboard({ metrics, loading }) {
  const latestSteps = latestValue(metrics, 'steps');
  const latestSleep = latestValue(metrics, 'sleepMinutes');
  const latestRhr = latestValue(metrics, 'restingHeartRate');
  return (
    <section className="signals-dashboard">
      <div className="signals-heading"><div><h2>Your last 30 days</h2><p>Private Fitbit-backed summaries. Gaps mean no wearable data was available that day.</p></div>{loading && <Loader className="spin" size={18} />}</div>
      <div className="signal-cards">
        <article className="signal-card"><span className="signal-icon steps"><Footprints size={17} /></span><span className="signal-label">Latest steps</span><strong>{Number.isFinite(latestSteps) ? latestSteps.toLocaleString() : '—'}</strong><Sparkline metrics={metrics} field="steps" color="#7c6af7" /></article>
        <article className="signal-card"><span className="signal-icon sleep"><Moon size={17} /></span><span className="signal-label">Latest sleep</span><strong>{formatSleep(latestSleep)}</strong><Sparkline metrics={metrics} field="sleepMinutes" color="#38bdf8" /></article>
        <article className="signal-card"><span className="signal-icon heart"><HeartPulse size={17} /></span><span className="signal-label">Resting heart rate</span><strong>{Number.isFinite(latestRhr) ? `${latestRhr} bpm` : '—'}</strong><Sparkline metrics={metrics} field="restingHeartRate" color="#f87171" /></article>
      </div>
    </section>
  );
}
