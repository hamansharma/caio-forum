import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { calculateCompassAssessment } from '../_lib/caioCompass';

const MAX_ORGANIZATION_NAME = 120;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const user = await requireUser(req);
    const collection = adminDb.collection('caioCompassAssessments').doc(user.uid).collection('assessments');

    if (req.method === 'GET') {
      const snapshot = await collection.orderBy('createdAt', 'desc').limit(12).get();
      return res.status(200).json({ assessments: snapshot.docs.map(item => ({ id: item.id, ...item.data() })) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    const organizationName = typeof req.body?.organizationName === 'string' ? req.body.organizationName.trim() : '';
    if (organizationName.length > MAX_ORGANIZATION_NAME) {
      return res.status(400).json({ error: 'Organization name must be 120 characters or fewer.' });
    }

    const result = calculateCompassAssessment(req.body?.answers);
    const createdAt = new Date().toISOString();
    const record = {
      version: 1,
      organizationName,
      ...result,
      createdAt,
    };
    const saved = await collection.add(record);
    return res.status(201).json({ assessment: { id: saved.id, ...record } });
  } catch (error) {
    console.error('Unable to process CAIO Compass assessment:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process this assessment.' });
  }
}
