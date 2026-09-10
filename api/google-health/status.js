import { adminDb, requireUser } from '../_lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const user = await requireUser(req);
    const connection = await adminDb.collection('healthConnections').doc(user.uid).get();
    const data = connection.data();
    return res.status(200).json({
      connected: connection.exists && data.provider === 'google-health',
      connectedAt: data?.connectedAt?.toDate?.().toISOString() || null,
      identityVerifiedAt: data?.identityVerifiedAt?.toDate?.().toISOString() || null,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to read connection status.' });
  }
}
