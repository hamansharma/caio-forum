import { adminDb } from '../_lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  try {
    const snapshot = await adminDb.collection('certifications').where('status', '==', 'Active').get();
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name));
    return res.status(200).json({ entries });
  } catch (error) {
    console.error('Unable to load certifications:', error.message);
    return res.status(500).json({ error: 'Unable to load certification catalog.' });
  }
}
