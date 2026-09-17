import { adminDb, requireUser } from './_lib/firebaseAdmin';
import { isCertificationAdmin, requireCertificationAdmin } from './_lib/certificationAdmin';
import { certifications } from '../src/data/certifications';

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function listCatalog(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  const snapshot = await adminDb.collection('certifications').where('status', '==', 'Active').get();
  const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name.localeCompare(b.name));
  return res.status(200).json({ entries });
}

async function seedCatalog(user, res) {
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
}

async function createSubmission(user, req, res) {
  const name = clean(req.body?.name, 160);
  const authority = clean(req.body?.authority, 160);
  const officialUrl = clean(req.body?.officialUrl, 1000);
  const note = clean(req.body?.note, 1200);
  if (!name || !authority || !/^https:\/\//i.test(officialUrl)) return res.status(400).json({ error: 'Name, issuing authority, and an HTTPS official link are required.' });
  await adminDb.collection('certificationSubmissions').add({ name, authority, officialUrl, note, status: 'Pending review', submittedByUid: user.uid, submittedAt: new Date().toISOString() });
  return res.status(201).json({ ok: true });
}

async function listSubmissions(user, res) {
  requireCertificationAdmin(user);
  const snapshot = await adminDb.collection('certificationSubmissions').orderBy('submittedAt', 'desc').limit(100).get();
  return res.status(200).json({ submissions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
}

async function updateSubmission(user, req, res) {
  requireCertificationAdmin(user);
  const id = clean(req.body?.id, 200);
  const status = clean(req.body?.status, 40);
  if (!id || !['Pending review', 'Reviewed', 'Rejected'].includes(status)) return res.status(400).json({ error: 'A valid submission status is required.' });
  await adminDb.collection('certificationSubmissions').doc(id).set({ status, reviewedAt: new Date().toISOString(), reviewedByUid: user.uid }, { merge: true });
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  const action = req.query.action || '';
  try {
    if (req.method === 'GET' && !action) return await listCatalog(req, res);
    res.setHeader('Cache-Control', 'no-store');
    const user = await requireUser(req);
    if (req.method === 'GET' && action === 'admin') return res.status(200).json({ isAdmin: isCertificationAdmin(user) });
    if (req.method === 'GET' && action === 'submissions') return await listSubmissions(user, res);
    if (req.method === 'POST' && action === 'seed') return await seedCatalog(user, res);
    if (req.method === 'POST' && action === 'submission') return await createSubmission(user, req, res);
    if (req.method === 'PATCH' && action === 'submission') return await updateSubmission(user, req, res);
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Unable to process certification request:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process certification request.' });
  }
}
