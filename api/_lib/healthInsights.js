import { Timestamp } from 'firebase-admin/firestore';

const MODEL = 'claude-sonnet-4-6';
const PROMPT_VERSION = 1;

const SIGNALS = [
  ['steps', 'steps', 'steps'],
  ['sleepMinutes', 'sleep minutes', 'minutes'],
  ['restingHeartRate', 'resting heart rate', 'bpm'],
  ['activeZoneMinutes', 'active zone minutes', 'minutes'],
  ['activeCalories', 'active energy burned', 'kcal'],
  ['activeMinutes', 'active minutes', 'minutes'],
  ['distanceKm', 'distance', 'km'],
  ['exerciseMinutes', 'exercise minutes', 'minutes'],
  ['hrvMs', 'heart-rate variability', 'ms'],
  ['oxygenSaturation', 'blood oxygen', '%'],
  ['respiratoryRate', 'sleep respiratory rate', 'breaths/min'],
  ['vo2Max', 'cardio fitness', 'ml/kg/min'],
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function completedDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}

function average(days, field) {
  const values = days.map(day => day[field]).filter(Number.isFinite);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function dailyContext(target, previousDays) {
  const today = [];
  const sevenDay = [];
  const thirtyDay = [];
  for (const [field, label, unit] of SIGNALS) {
    if (Number.isFinite(target[field])) today.push({ signal: label, value: round(target[field]), unit });
    const weekAverage = average(previousDays.slice(-7), field);
    const monthAverage = average(previousDays, field);
    if (weekAverage !== null) sevenDay.push({ signal: label, average: round(weekAverage), unit });
    if (monthAverage !== null) thirtyDay.push({ signal: label, average: round(monthAverage), unit });
  }
  return { today, sevenDay, thirtyDay };
}

function parseInsight(text) {
  const candidate = text.match(/\{[\s\S]*\}/)?.[0] || text;
  const parsed = JSON.parse(candidate);
  if (!parsed.headline || !parsed.summary || !Array.isArray(parsed.observations)) throw new Error('Claude returned an incomplete daily insight.');
  return {
    headline: String(parsed.headline).slice(0, 120),
    summary: String(parsed.summary).slice(0, 600),
    observations: parsed.observations.slice(0, 3).map(item => String(item).slice(0, 280)),
    suggestion: parsed.suggestion ? String(parsed.suggestion).slice(0, 280) : null,
  };
}

async function requestInsight(context, date) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 450,
      system: 'You write concise, supportive personal wellness pattern summaries. You are not a medical professional. Never diagnose, assess disease risk, make treatment recommendations, claim causation, or use alarming language. Describe only the supplied measurements and comparisons. If data is sparse, say so. Return JSON only with: headline (short string), summary (one or two sentences), observations (array of 2 or 3 short strings), suggestion (one low-risk, optional lifestyle suggestion or null).',
      messages: [{ role: 'user', content: `Create the private daily wellness summary for ${date}. The data is aggregated and may contain gaps.\n${JSON.stringify(context)}` }],
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Claude request failed (${response.status}).`);
  return parseInsight(body.content?.[0]?.text || '');
}

export async function generateDailyInsight(adminDb, uid) {
  const date = completedDate();
  const insightRef = adminDb.collection('healthInsights').doc(uid).collection('daily').doc(date);
  const existing = await insightRef.get();
  if (existing.exists) return { generated: false, date, reason: 'already-exists' };

  const daysSnapshot = await adminDb.collection('healthDailyMetrics').doc(uid).collection('days').orderBy('date', 'desc').limit(31).get();
  const days = daysSnapshot.docs.map(doc => doc.data()).sort((a, b) => a.date.localeCompare(b.date));
  const targetIndex = days.findIndex(day => day.date === date);
  if (targetIndex === -1) return { generated: false, date, reason: 'no-data-for-completed-day' };

  const context = dailyContext(days[targetIndex], days.slice(0, targetIndex));
  if (!context.today.length) return { generated: false, date, reason: 'no-signals-for-completed-day' };
  const insight = await requestInsight(context, date);
  await insightRef.create({
    date,
    ...insight,
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    sourceDates: days.map(day => day.date),
    createdAt: Timestamp.now(),
  });
  return { generated: true, date };
}
