import { Timestamp } from 'firebase-admin/firestore';
import { decrypt, encrypt, refreshAccessToken } from './googleHealth';

const API_ROOT = 'https://health.googleapis.com/v4/users/me/dataTypes';

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromCivil(civil) {
  const d = civil?.date;
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

async function request(accessToken, path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Google Health request failed (${response.status}).`);
  return data;
}

async function accessTokenFor(connectionRef, connection) {
  if (connection.expiresAt.toMillis() >= Date.now() + 60_000) return decrypt(connection.accessToken);
  const refreshed = await refreshAccessToken(decrypt(connection.refreshToken));
  await connectionRef.set({
    accessToken: encrypt(refreshed.accessToken),
    expiresAt: Timestamp.fromMillis(refreshed.expiresAt),
    updatedAt: Timestamp.now(),
  }, { merge: true });
  return refreshed.accessToken;
}

export async function syncHealthMetrics(adminDb, uid) {
  const connectionRef = adminDb.collection('healthConnections').doc(uid);
  const connectionSnap = await connectionRef.get();
  if (!connectionSnap.exists || connectionSnap.data().provider !== 'google-health') throw new Error('No Google Health connection found.');
  const accessToken = await accessTokenFor(connectionRef, connectionSnap.data());
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  const startDate = isoDate(start);
  const endDate = isoDate(end);

  const [stepsData, sleepData, rhrData] = await Promise.all([
    request(accessToken, '/steps/dataPoints:dailyRollUp', {
      method: 'POST',
      body: JSON.stringify({
        range: { start: { date: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() }, time: {} }, end: { date: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() }, time: {} } },
        windowSizeDays: 1,
        dataSourceFamily: 'users/me/dataSourceFamilies/google-wearables',
      }),
    }),
    request(accessToken, `/sleep/dataPoints?filter=${encodeURIComponent(`sleep.interval.civil_end_time >= "${startDate}" AND sleep.interval.civil_end_time < "${endDate}"`)}`),
    request(accessToken, `/daily-resting-heart-rate/dataPoints?filter=${encodeURIComponent(`daily_resting_heart_rate.date >= "${startDate}" AND daily_resting_heart_rate.date < "${endDate}"`)}`),
  ]);

  const metrics = new Map();
  for (const point of stepsData.rollupDataPoints || []) {
    const date = dateFromCivil(point.civilStartTime);
    if (date) metrics.set(date, { ...(metrics.get(date) || {}), steps: Number(point.steps?.countSum ?? 0) });
  }
  for (const point of sleepData.dataPoints || []) {
    const interval = point.sleep?.interval;
    const date = interval?.endTime?.slice(0, 10);
    if (!date || !interval?.startTime || !interval?.endTime) continue;
    const minutes = Math.round((new Date(interval.endTime) - new Date(interval.startTime)) / 60_000);
    metrics.set(date, { ...(metrics.get(date) || {}), sleepMinutes: (metrics.get(date)?.sleepMinutes || 0) + minutes });
  }
  for (const point of rhrData.dataPoints || []) {
    const rhr = point.dailyRestingHeartRate;
    const date = rhr?.date ? `${rhr.date.year}-${String(rhr.date.month).padStart(2, '0')}-${String(rhr.date.day).padStart(2, '0')}` : null;
    const bpm = Number(rhr?.beatsPerMinute);
    if (date && Number.isFinite(bpm)) metrics.set(date, { ...(metrics.get(date) || {}), restingHeartRate: bpm });
  }

  const batch = adminDb.batch();
  for (const [date, values] of metrics) {
    batch.set(adminDb.collection('healthDailyMetrics').doc(uid).collection('days').doc(date), {
      date, ...values, source: 'google-health', updatedAt: Timestamp.now(),
    }, { merge: true });
  }
  await batch.commit();
  await connectionRef.set({ lastSyncedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  return { daysSynced: metrics.size };
}
