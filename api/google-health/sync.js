import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { syncHealthMetrics } from '../_lib/healthSync';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    return res.status(200).json(await syncHealthMetrics(adminDb, user.uid));
  } catch (error) {
    console.error('Google Health sync failed:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to sync health metrics.' });
  }
}
