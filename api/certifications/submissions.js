import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { requireCertificationAdmin } from '../_lib/certificationAdmin';

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await requireUser(req);
    if (req.method === 'POST') {
      const name = clean(req.body?.name, 160);
      const authority = clean(req.body?.authority, 160);
      const officialUrl = clean(req.body?.officialUrl, 1000);
      const note = clean(req.body?.note, 1200);
      if (!name || !authority || !/^https:\/\//i.test(officialUrl)) return res.status(400).json({ error: 'Name, issuing authority, and an HTTPS official link are required.' });
      await adminDb.collection('certificationSubmissions').add({ name, authority, officialUrl, note, status: 'Pending review', submittedByUid: user.uid, submittedAt: new Date().toISOString() });
      return res.status(201).json({ ok: true });
    }
    if (req.method === 'GET') {
      requireCertificationAdmin(user);
      const snapshot = await adminDb.collection('certificationSubmissions').orderBy('submittedAt', 'desc').limit(100).get();
      return res.status(200).json({ submissions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
    }
    if (req.method === 'PATCH') {
      requireCertificationAdmin(user);
      const id = clean(req.body?.id, 200);
      const status = clean(req.body?.status, 40);
      if (!id || !['Pending review', 'Reviewed', 'Rejected'].includes(status)) return res.status(400).json({ error: 'A valid submission status is required.' });
      await adminDb.collection('certificationSubmissions').doc(id).set({ status, reviewedAt: new Date().toISOString(), reviewedByUid: user.uid }, { merge: true });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Unable to process certification submission:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process certification submission.' });
  }
}
