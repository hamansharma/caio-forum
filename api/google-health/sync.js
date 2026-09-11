import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { generateDailyInsight } from '../_lib/healthInsights';
import { syncHealthMetrics } from '../_lib/healthSync';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    const sync = await syncHealthMetrics(adminDb, user.uid);
    let insight;
    try {
      insight = await generateDailyInsight(adminDb, user.uid);
    } catch (insightError) {
      console.error('Daily health insight failed:', insightError.message);
      insight = { generated: false, error: 'Health data synced, but the daily insight was unavailable.' };
    }
    return res.status(200).json({ ...sync, insight });
  } catch (error) {
    console.error('Google Health sync failed:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to sync health metrics.' });
  }
}
