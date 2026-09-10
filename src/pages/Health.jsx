import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Link2, Loader, RefreshCw, ShieldCheck } from 'lucide-react';
import { useForum } from '../context/ForumContext';
import { auth } from '../firebase';
import './Health.css';

async function authenticatedFetch(path) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

export default function Health() {
  const { user, authLoading } = useForum();
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
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
    </main>
  );
}
