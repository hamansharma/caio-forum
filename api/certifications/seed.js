import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { requireCertificationAdmin } from '../_lib/certificationAdmin';
import { certifications } from '../../src/data/certifications';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    requireCertificationAdmin(user);
    const now = new Date().toISOString();
    for (let index = 0; index < certifications.length; index += 400) {
      const batch = adminDb.batch();
      certifications.slice(index, index + 400).forEach(entry => {
        batch.set(adminDb.collection('certifications').doc(entry.id), { ...entry, createdAt: now, updatedAt: now }, { merge: true });
      });
      await batch.commit();
    }
    return res.status(200).json({ seeded: certifications.length });
  } catch (error) {
    console.error('Unable to seed certifications:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to seed catalog.' });
  }
}
