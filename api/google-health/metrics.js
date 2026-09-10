import { adminDb, requireUser } from '../_lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const user = await requireUser(req);
    const requestedDays = Number.parseInt(req.query.days, 10);
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 90) : 30;
    const snapshot = await adminDb.collection('healthDailyMetrics').doc(user.uid).collection('days')
      .orderBy('date', 'desc').limit(days).get();
    return res.status(200).json({ days: snapshot.docs.map(doc => doc.data()).reverse() });
  } catch (error) {
    console.error('Unable to load health metrics:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to load health metrics.' });
  }
}
