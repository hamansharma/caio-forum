import { FieldPath } from 'firebase-admin/firestore';
import { adminDb, requireUser } from './_lib/firebaseAdmin';
import { isCertificationAdmin, requireCertificationAdmin } from './_lib/certificationAdmin';

const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const PAGE_SIZE = 24;
const SCAN_BATCH_SIZE = 60;
const MAX_SEARCH_SCAN = 1200;

const encodeCursor = document => Buffer.from(JSON.stringify({ name: document.get('name'), id: document.id })).toString('base64url');
const decodeCursor = value => {
  if (!value || typeof value !== 'string') return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return typeof cursor.name === 'string' && typeof cursor.id === 'string' ? cursor : null;
  } catch {
    return null;
  }
};
const searchMatches = (entry, search) => {
  if (!search) return true;
  const text = [entry.name, entry.authority, entry.category, ...(entry.skills || []), ...(entry.targetRoles || [])].join(' ').toLowerCase();
  return search.split(/\s+/).every(term => text.includes(term));
};

async function listCatalog(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  const category = clean(req.query.category, 100);
  const level = clean(req.query.level, 30);
  const search = clean(req.query.q, 160).toLowerCase();
  const cursor = decodeCursor(req.query.cursor);
  let query = adminDb.collection('certifications').orderBy('name').orderBy(FieldPath.documentId());
  if (cursor) query = query.startAfter(cursor.name, cursor.id);

  const entries = [];
  let lastDocument = null;
  let scanned = 0;
  let hasMore = false;
  while (entries.length < PAGE_SIZE && scanned < MAX_SEARCH_SCAN) {
    const snapshot = await query.limit(SCAN_BATCH_SIZE).get();
    if (snapshot.empty) break;
    scanned += snapshot.size;
    for (let index = 0; index < snapshot.docs.length; index += 1) {
      const document = snapshot.docs[index];
      lastDocument = document;
      const entry = { id: document.id, ...document.data() };
      if (entry.status !== 'Active' || (category && entry.category !== category) || (level && entry.level !== level) || !searchMatches(entry, search)) continue;
      entries.push(entry);
      if (entries.length === PAGE_SIZE) {
        hasMore = index < snapshot.docs.length - 1 || snapshot.size === SCAN_BATCH_SIZE;
        break;
      }
    }
    if (entries.length === PAGE_SIZE || snapshot.size < SCAN_BATCH_SIZE) break;
    query = adminDb.collection('certifications').orderBy('name').orderBy(FieldPath.documentId()).startAfter(lastDocument.get('name'), lastDocument.id);
  }
  return res.status(200).json({ entries, nextCursor: hasMore && lastDocument ? encodeCursor(lastDocument) : null, pageSize: PAGE_SIZE });
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
    if (req.method === 'POST' && action === 'submission') return await createSubmission(user, req, res);
    if (req.method === 'PATCH' && action === 'submission') return await updateSubmission(user, req, res);
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Unable to process certification request:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process certification request.' });
  }
}
