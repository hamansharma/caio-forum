import { adminDb } from '../_lib/firebaseAdmin';
import { syncHealthMetrics } from '../_lib/healthSync';

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized.' });
  const connections = await adminDb.collection('healthConnections').where('provider', '==', 'google-health').get();
  const results = await Promise.allSettled(connections.docs.map(doc => syncHealthMetrics(adminDb, doc.id)));
  console.info('Google Health scheduled sync complete:', { connectedUsers: connections.size, failed: results.filter(r => r.status === 'rejected').length });
  return res.status(200).json({ connectedUsers: connections.size, failed: results.filter(r => r.status === 'rejected').length });
}
