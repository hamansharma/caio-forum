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

async function optionalRequest(accessToken, path, options, label) {
  try {
    return await request(accessToken, path, options);
  } catch (error) {
    console.info(`Google Health ${label} was unavailable for this connection: ${error.message}`);
    return { dataPoints: [], rollupDataPoints: [] };
  }
}

function civilRange(start, end) {
  return {
    start: { date: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate() }, time: {} },
    end: { date: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate() }, time: {} },
  };
}

function dailyRollup(accessToken, dataType, start, end, optional = false) {
  const options = {
    method: 'POST',
    body: JSON.stringify({
      range: civilRange(start, end),
      windowSizeDays: 1,
      dataSourceFamily: 'users/me/dataSourceFamilies/google-wearables',
    }),
  };
  const path = `/${dataType}/dataPoints:dailyRollUp`;
  return optional ? optionalRequest(accessToken, path, options, dataType) : request(accessToken, path, options);
}

async function dailyRollupInChunks(accessToken, dataType, start, end, maxDays = 14) {
  const ranges = [];
  for (let chunkStart = new Date(start); chunkStart < end;) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + maxDays);
    ranges.push([new Date(chunkStart), chunkEnd < end ? chunkEnd : end]);
    chunkStart = chunkEnd;
  }
  const results = await Promise.all(ranges.map(([chunkStart, chunkEnd]) => dailyRollup(accessToken, dataType, chunkStart, chunkEnd, true)));
  return { rollupDataPoints: results.flatMap(result => result.rollupDataPoints || []) };
}

function dateFromDailyValue(value) {
  return dateFromCivil({ date: value?.date });
}

function setMetric(metrics, date, values) {
  if (date) metrics.set(date, { ...(metrics.get(date) || {}), ...values });
}

function finiteValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function durationMinutes(value) {
  const seconds = Number.parseFloat(String(value || '').replace(/s$/, ''));
  return Number.isFinite(seconds) ? Math.round(seconds / 60) : null;
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

  const [stepsData, sleepData, rhrData, zoneData, activeEnergyData, totalCaloriesData, activeMinutesData, distanceData, floorsData, hrvData, oxygenData, respiratoryData, vo2Data, exerciseData] = await Promise.all([
    dailyRollup(accessToken, 'steps', start, end),
    request(accessToken, `/sleep/dataPoints?filter=${encodeURIComponent(`sleep.interval.civil_end_time >= "${startDate}" AND sleep.interval.civil_end_time < "${endDate}"`)}`),
    request(accessToken, `/daily-resting-heart-rate/dataPoints?filter=${encodeURIComponent(`daily_resting_heart_rate.date >= "${startDate}" AND daily_resting_heart_rate.date < "${endDate}"`)}`),
    dailyRollup(accessToken, 'active-zone-minutes', start, end, true),
    dailyRollup(accessToken, 'active-energy-burned', start, end, true),
    dailyRollupInChunks(accessToken, 'total-calories', start, end),
    dailyRollupInChunks(accessToken, 'active-minutes', start, end),
    dailyRollup(accessToken, 'distance', start, end, true),
    dailyRollup(accessToken, 'floors', start, end, true),
    optionalRequest(accessToken, `/daily-heart-rate-variability/dataPoints?filter=${encodeURIComponent(`daily_heart_rate_variability.date >= "${startDate}" AND daily_heart_rate_variability.date < "${endDate}"`)}`, {}, 'daily heart-rate variability'),
    optionalRequest(accessToken, `/daily-oxygen-saturation/dataPoints?filter=${encodeURIComponent(`daily_oxygen_saturation.date >= "${startDate}" AND daily_oxygen_saturation.date < "${endDate}"`)}`, {}, 'daily oxygen saturation'),
    optionalRequest(accessToken, `/daily-respiratory-rate/dataPoints?filter=${encodeURIComponent(`daily_respiratory_rate.date >= "${startDate}" AND daily_respiratory_rate.date < "${endDate}"`)}`, {}, 'daily respiratory rate'),
    optionalRequest(accessToken, `/daily-vo2-max/dataPoints?filter=${encodeURIComponent(`daily_vo2_max.date >= "${startDate}" AND daily_vo2_max.date < "${endDate}"`)}`, {}, 'daily VO2 max'),
    optionalRequest(accessToken, `/exercise/dataPoints?filter=${encodeURIComponent(`exercise.interval.start_time >= "${start.toISOString()}" AND exercise.interval.start_time < "${end.toISOString()}"`)}`, {}, 'exercise sessions'),
  ]);

  const metrics = new Map();
  const workouts = [];
  for (const point of stepsData.rollupDataPoints || []) {
    const date = dateFromCivil(point.civilStartTime);
    const steps = finiteValue(point.steps?.countSum);
    if (steps !== null) setMetric(metrics, date, { steps });
  }
  for (const point of sleepData.dataPoints || []) {
    const interval = point.sleep?.interval;
    const date = interval?.endTime?.slice(0, 10);
    if (!date || !interval?.startTime || !interval?.endTime) continue;
    const minutes = Math.round((new Date(interval.endTime) - new Date(interval.startTime)) / 60_000);
    setMetric(metrics, date, { sleepMinutes: (metrics.get(date)?.sleepMinutes || 0) + minutes });
  }
  for (const point of rhrData.dataPoints || []) {
    const rhr = point.dailyRestingHeartRate;
    const date = rhr?.date ? `${rhr.date.year}-${String(rhr.date.month).padStart(2, '0')}-${String(rhr.date.day).padStart(2, '0')}` : null;
    const bpm = Number(rhr?.beatsPerMinute);
    if (Number.isFinite(bpm)) setMetric(metrics, date, { restingHeartRate: bpm });
  }
  for (const point of zoneData.rollupDataPoints || []) {
    const zones = point.activeZoneMinutes;
    const fatBurn = finiteValue(zones?.sumInFatBurnHeartZone);
    const cardio = finiteValue(zones?.sumInCardioHeartZone);
    const peak = finiteValue(zones?.sumInPeakHeartZone);
    const values = [fatBurn, cardio, peak].filter(value => value !== null);
    if (values.length) setMetric(metrics, dateFromCivil(point.civilStartTime), {
      activeZoneMinutes: values.reduce((sum, value) => sum + value, 0),
      ...(fatBurn !== null && { fatBurnMinutes: fatBurn }),
      ...(cardio !== null && { cardioMinutes: cardio }),
      ...(peak !== null && { peakMinutes: peak }),
    });
  }
  for (const point of activeEnergyData.rollupDataPoints || []) {
    const activeCalories = finiteValue(point.activeEnergyBurned?.kcalSum);
    if (activeCalories !== null) setMetric(metrics, dateFromCivil(point.civilStartTime), { activeCalories: Math.round(activeCalories) });
  }
  for (const point of totalCaloriesData.rollupDataPoints || []) {
    const totalCalories = finiteValue(point.totalCalories?.kcalSum);
    if (totalCalories !== null) setMetric(metrics, dateFromCivil(point.civilStartTime), { totalCalories: Math.round(totalCalories) });
  }
  for (const point of activeMinutesData.rollupDataPoints || []) {
    const levels = point.activeMinutes?.activeMinutesRollupByActivityLevel || [];
    const values = levels.map(level => ({ type: level.activityLevel, minutes: finiteValue(level.activeMinutesSum) })).filter(level => level.minutes !== null);
    if (!values.length) continue;
    const total = values.reduce((sum, level) => sum + level.minutes, 0);
    const moderate = values.find(level => level.type === 'MODERATE')?.minutes;
    const vigorous = values.find(level => level.type === 'VIGOROUS')?.minutes;
    setMetric(metrics, dateFromCivil(point.civilStartTime), {
      activeMinutes: total,
      ...(moderate !== undefined && { moderateMinutes: moderate }),
      ...(vigorous !== undefined && { vigorousMinutes: vigorous }),
    });
  }
  for (const point of distanceData.rollupDataPoints || []) {
    const millimeters = finiteValue(point.distance?.millimetersSum);
    if (millimeters !== null) setMetric(metrics, dateFromCivil(point.civilStartTime), { distanceKm: Math.round((millimeters / 1_000_000) * 100) / 100 });
  }
  for (const point of floorsData.rollupDataPoints || []) {
    const floors = finiteValue(point.floors?.countSum);
    if (floors !== null) setMetric(metrics, dateFromCivil(point.civilStartTime), { floors });
  }
  for (const point of hrvData.dataPoints || []) {
    const hrv = point.dailyHeartRateVariability;
    const hrvMs = finiteValue(hrv?.averageHeartRateVariabilityMilliseconds);
    if (hrvMs !== null) setMetric(metrics, dateFromDailyValue(hrv), { hrvMs: Math.round(hrvMs * 10) / 10 });
  }
  for (const point of oxygenData.dataPoints || []) {
    const oxygen = point.dailyOxygenSaturation;
    const oxygenSaturation = finiteValue(oxygen?.averagePercentage);
    if (oxygenSaturation !== null) setMetric(metrics, dateFromDailyValue(oxygen), { oxygenSaturation: Math.round(oxygenSaturation * 10) / 10 });
  }
  for (const point of respiratoryData.dataPoints || []) {
    const respiratory = point.dailyRespiratoryRate;
    const respiratoryRate = finiteValue(respiratory?.breathsPerMinute);
    if (respiratoryRate !== null) setMetric(metrics, dateFromDailyValue(respiratory), { respiratoryRate: Math.round(respiratoryRate * 10) / 10 });
  }
  for (const point of vo2Data.dataPoints || []) {
    const vo2 = point.dailyVo2Max;
    const vo2Max = finiteValue(vo2?.vo2Max);
    if (vo2Max !== null) setMetric(metrics, dateFromDailyValue(vo2), { vo2Max: Math.round(vo2Max * 10) / 10 });
  }
  for (const [index, point] of (exerciseData.dataPoints || []).entries()) {
    const exercise = point.exercise;
    const date = dateFromCivil(exercise?.interval?.civilStartTime) || exercise?.interval?.startTime?.slice(0, 10);
    if (!date) continue;
    const previous = metrics.get(date) || {};
    const minutes = durationMinutes(exercise.activeDuration);
    const calories = finiteValue(exercise.metricsSummary?.caloriesKcal);
    const millimeters = finiteValue(exercise.metricsSummary?.distanceMillimeters);
    setMetric(metrics, date, {
      exerciseCount: (previous.exerciseCount || 0) + 1,
      ...(minutes !== null && { exerciseMinutes: (previous.exerciseMinutes || 0) + minutes }),
      ...(calories !== null && { workoutCalories: Math.round((previous.workoutCalories || 0) + calories) }),
      ...(millimeters !== null && { workoutDistanceKm: Math.round(((previous.workoutDistanceKm || 0) + millimeters / 1_000_000) * 100) / 100 }),
    });
    const workoutId = point.name?.split('/').pop() || `${date}-${index}`;
    workouts.push({
      id: workoutId,
      date,
      startTime: exercise.interval?.startTime || null,
      displayName: exercise.displayName || exercise.exerciseType || 'Workout',
      exerciseType: exercise.exerciseType || null,
      ...(minutes !== null && { durationMinutes: minutes }),
      ...(calories !== null && { calories: Math.round(calories) }),
      ...(millimeters !== null && { distanceKm: Math.round((millimeters / 1_000_000) * 100) / 100 }),
      ...(finiteValue(exercise.metricsSummary?.averageHeartRateBeatsPerMinute) !== null && { averageHeartRate: finiteValue(exercise.metricsSummary?.averageHeartRateBeatsPerMinute) }),
      ...(finiteValue(exercise.metricsSummary?.activeZoneMinutes) !== null && { activeZoneMinutes: finiteValue(exercise.metricsSummary?.activeZoneMinutes) }),
    });
  }

  const batch = adminDb.batch();
  for (const [date, values] of metrics) {
    batch.set(adminDb.collection('healthDailyMetrics').doc(uid).collection('days').doc(date), {
      date, ...values, source: 'google-health', updatedAt: Timestamp.now(),
    }, { merge: true });
  }
  for (const workout of workouts) {
    const { id, ...summary } = workout;
    batch.set(adminDb.collection('healthWorkouts').doc(uid).collection('items').doc(id), {
      ...summary, source: 'google-health', updatedAt: Timestamp.now(),
    }, { merge: true });
  }
  await batch.commit();
  await connectionRef.set({ lastSyncedAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
  return { daysSynced: metrics.size, workoutsSynced: workouts.length };
}
