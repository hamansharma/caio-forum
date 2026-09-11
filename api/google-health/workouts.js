import { adminDb, requireUser } from '../_lib/firebaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const user = await requireUser(req);
    const snapshot = await adminDb.collection('healthWorkouts').doc(user.uid).collection('items')
      .orderBy('startTime', 'desc').limit(12).get();
    return res.status(200).json({ workouts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error('Unable to load workout summaries:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to load workout summaries.' });
  }
}
