import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { decrypt, encrypt, exchangeCode, getAuthorizationUrl, refreshAccessToken } from '../_lib/googleHealth';
import { generateDailyInsight } from '../_lib/healthInsights';
import { syncHealthMetrics } from '../_lib/healthSync';

function redirectToHealth(res, status) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return res.redirect(`${appUrl}/health?connection=${status}`);
}

async function connect(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const user = await requireUser(req);
  const state = crypto.randomBytes(32).toString('base64url');
  await adminDb.collection('healthOAuthStates').doc(state).set({
    uid: user.uid,
    expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
  });
  return res.status(200).json({ authorizationUrl: getAuthorizationUrl(state) });
}

async function callback(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const { code, state, error } = req.query;
  if (error || !code || !state || typeof code !== 'string' || typeof state !== 'string') return redirectToHealth(res, 'cancelled');

  const stateRef = adminDb.collection('healthOAuthStates').doc(state);
  try {
    const stateDoc = await stateRef.get();
    if (!stateDoc.exists || stateDoc.data().expiresAt.toMillis() < Date.now()) {
      await stateRef.delete();
      return redirectToHealth(res, 'expired');
    }
    const tokens = await exchangeCode(code);
    await adminDb.collection('healthConnections').doc(stateDoc.data().uid).set({
      provider: 'google-health',
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: Timestamp.fromMillis(tokens.expiry_date || Date.now() + 3_600_000),
      scopes: tokens.scope?.split(' ') || [],
      connectedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    await stateRef.delete();
    return redirectToHealth(res, 'connected');
  } catch (err) {
    console.error('Google Health callback failed:', err.message);
    await stateRef.delete().catch(() => undefined);
    return redirectToHealth(res, 'error');
  }
}

async function identity(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const user = await requireUser(req);
  const ref = adminDb.collection('healthConnections').doc(user.uid);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().provider !== 'google-health') return res.status(404).json({ error: 'No Google Health connection found.' });
  let connection = snapshot.data();
  if (connection.expiresAt.toMillis() < Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(decrypt(connection.refreshToken));
    await ref.set({ accessToken: encrypt(refreshed.accessToken), expiresAt: Timestamp.fromMillis(refreshed.expiresAt), updatedAt: Timestamp.now() }, { merge: true });
    connection = { ...connection, accessToken: encrypt(refreshed.accessToken) };
  }
  const response = await fetch('https://health.googleapis.com/v4/users/me/identity', {
    headers: { Authorization: `Bearer ${decrypt(connection.accessToken)}`, Accept: 'application/json' },
  });
  const result = await response.json();
  if (!response.ok) return res.status(response.status).json({ error: result.error?.message || 'Google Health did not return an identity.' });
  await ref.set({ healthUserId: result.healthUserId, identityVerifiedAt: Timestamp.now() }, { merge: true });
  return res.status(200).json({ connected: true });
}

async function insights(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const user = await requireUser(req);
  const snapshot = await adminDb.collection('healthInsights').doc(user.uid).collection('daily').orderBy('date', 'desc').limit(90).get();
  return res.status(200).json({ insights: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
}

async function metrics(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const user = await requireUser(req);
  const requestedDays = Number.parseInt(req.query.days, 10);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 90) : 30;
  const snapshot = await adminDb.collection('healthDailyMetrics').doc(user.uid).collection('days').orderBy('date', 'desc').limit(days).get();
  return res.status(200).json({ days: snapshot.docs.map(doc => doc.data()).reverse() });
}

async function status(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const user = await requireUser(req);
  const connection = await adminDb.collection('healthConnections').doc(user.uid).get();
  const data = connection.data();
  return res.status(200).json({
    connected: connection.exists && data.provider === 'google-health',
    connectedAt: data?.connectedAt?.toDate?.().toISOString() || null,
    identityVerifiedAt: data?.identityVerifiedAt?.toDate?.().toISOString() || null,
  });
}

async function sync(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const user = await requireUser(req);
  const synced = await syncHealthMetrics(adminDb, user.uid);
  let insight;
  try {
    insight = await generateDailyInsight(adminDb, user.uid);
  } catch (insightError) {
    console.error('Daily health insight failed:', insightError.message);
    insight = { generated: false, error: 'Health data synced, but the daily insight was unavailable.' };
  }
  return res.status(200).json({ ...synced, insight });
}

async function workouts(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const user = await requireUser(req);
  const snapshot = await adminDb.collection('healthWorkouts').doc(user.uid).collection('items').orderBy('startTime', 'desc').limit(12).get();
  return res.status(200).json({ workouts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
}

const actions = { callback, connect, identity, insights, metrics, status, sync, workouts };

export default async function handler(req, res) {
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;
  const handle = actions[action];
  if (!handle) return res.status(404).json({ error: 'Unknown Google Health action.' });
  try {
    return await handle(req, res);
  } catch (error) {
    console.error(`Google Health ${action} failed:`, error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || `Unable to ${action} Google Health data.` });
  }
}
