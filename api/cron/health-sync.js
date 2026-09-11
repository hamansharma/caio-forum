import { adminDb } from '../_lib/firebaseAdmin';
import { generateDailyInsight } from '../_lib/healthInsights';
import { syncHealthMetrics } from '../_lib/healthSync';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized.' });
  const connections = await adminDb.collection('healthConnections').where('provider', '==', 'google-health').get();
  const results = await Promise.allSettled(connections.docs.map(async doc => {
    await syncHealthMetrics(adminDb, doc.id);
    try {
      await generateDailyInsight(adminDb, doc.id);
    } catch (error) {
      console.error(`Daily health insight failed for ${doc.id}:`, error.message);
    }
  }));
  console.info('Google Health scheduled sync complete:', { connectedUsers: connections.size, failed: results.filter(r => r.status === 'rejected').length });
  return res.status(200).json({ connectedUsers: connections.size, failed: results.filter(r => r.status === 'rejected').length });
}
