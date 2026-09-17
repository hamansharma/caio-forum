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
const slugify = value => clean(value, 160).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function refreshCatalogMetadata() {
  const activeCount = (await adminDb.collection('certifications').where('status', '==', 'Active').count().get()).data().count;
  await adminDb.collection('catalogMetadata').doc('certifications').set({ activeCount, updatedAt: new Date().toISOString() }, { merge: true });
}

async function listCatalog(req, res) {
  // Catalog edits are imported directly into Firestore. Avoid serving a stale
  // edge-cached page after an administrator publishes new credentials.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const requestedIds = clean(req.query.ids, 600).split(',').filter(id => /^[a-z0-9-]{1,160}$/i.test(id)).slice(0, 3);
  if (requestedIds.length) {
    const documents = await adminDb.getAll(...requestedIds.map(id => adminDb.collection('certifications').doc(id)));
    const byId = new Map(documents.filter(document => document.exists && document.data().status === 'Active').map(document => [document.id, { id: document.id, ...document.data() }]));
    return res.status(200).json({ entries: requestedIds.map(id => byId.get(id)).filter(Boolean) });
  }
  const metadataPromise = adminDb.collection('catalogMetadata').doc('certifications').get();
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
  const metadata = await metadataPromise;
  return res.status(200).json({ entries, nextCursor: hasMore && lastDocument ? encodeCursor(lastDocument) : null, pageSize: PAGE_SIZE, totalEntries: Number.isInteger(metadata.data()?.activeCount) ? metadata.data().activeCount : null });
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

async function publishSubmission(user, req, res) {
  requireCertificationAdmin(user);
  const submissionId = clean(req.body?.submissionId, 200);
  const submission = await adminDb.collection('certificationSubmissions').doc(submissionId).get();
  if (!submission.exists) return res.status(404).json({ error: 'Suggestion not found.' });
  const draft = req.body?.record || {};
  const name = clean(draft.name || submission.data().name, 160);
  const authority = clean(draft.authority || submission.data().authority, 160);
  const officialUrl = clean(draft.officialUrl || submission.data().officialUrl, 1000);
  const category = clean(draft.category, 100);
  const level = clean(draft.level, 30);
  if (!name || !authority || !/^https:\/\//i.test(officialUrl) || !category || !['Beginner', 'Intermediate', 'Advanced'].includes(level)) return res.status(400).json({ error: 'Name, authority, official link, category, and level are required to publish.' });
  const id = slugify(draft.id || name);
  const now = new Date().toISOString();
  await adminDb.collection('certifications').doc(id).set({
    id, name, authority, officialUrl, category, level,
    credentialType: clean(draft.credentialType, 80) || 'Certification',
    description: clean(draft.description, 1200) || submission.data().note || 'Official credential submitted for catalog review.',
    cost: clean(draft.cost, 240) || 'See official issuer pricing',
    prerequisites: clean(draft.prerequisites, 500) || 'See official issuer requirements',
    validity: clean(draft.validity, 300) || 'See official issuer policy',
    geography: clean(draft.geography, 120) || 'See official issuer details',
    skills: Array.isArray(draft.skills) ? draft.skills.map(skill => clean(skill, 60)).filter(Boolean).slice(0, 12) : [],
    targetRoles: Array.isArray(draft.targetRoles) ? draft.targetRoles.map(role => clean(role, 80)).filter(Boolean).slice(0, 12) : [],
    lastVerified: now.slice(0, 10), status: 'Active', sourceType: 'Official issuer', createdAt: now, updatedAt: now,
  }, { merge: true });
  await adminDb.collection('certificationSubmissions').doc(submissionId).set({ status: 'Published', publishedAt: now, publishedByUid: user.uid, publishedCertificationId: id }, { merge: true });
  await refreshCatalogMetadata();
  return res.status(200).json({ ok: true, id });
}

async function createReport(user, req, res) {
  const certificationId = clean(req.body?.certificationId, 200);
  const comment = clean(req.body?.comment, 1200);
  if (!certificationId || comment.length < 10) return res.status(400).json({ error: 'Please provide at least a short explanation for the report.' });
  await adminDb.collection('certificationReports').add({ certificationId, comment, status: 'Open', reportedByUid: user.uid, reportedAt: new Date().toISOString() });
  return res.status(201).json({ ok: true });
}

async function listReports(user, res) {
  requireCertificationAdmin(user);
  const snapshot = await adminDb.collection('certificationReports').orderBy('reportedAt', 'desc').limit(100).get();
  return res.status(200).json({ reports: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
}

async function updateReport(user, req, res) {
  requireCertificationAdmin(user);
  const id = clean(req.body?.id, 200);
  const status = clean(req.body?.status, 40);
  if (!id || !['Open', 'Resolved', 'Dismissed'].includes(status)) return res.status(400).json({ error: 'A valid report status is required.' });
  await adminDb.collection('certificationReports').doc(id).set({ status, reviewedAt: new Date().toISOString(), reviewedByUid: user.uid }, { merge: true });
  return res.status(200).json({ ok: true });
}

async function buildPathway(user, req, res) {
  const targetRole = clean(req.body?.targetRole, 100);
  const domain = clean(req.body?.domain, 100);
  const experience = clean(req.body?.experience, 30);
  if (!targetRole || !domain || !['New', 'Some experience', 'Experienced'].includes(experience)) return res.status(400).json({ error: 'Choose a target role, domain, and experience level.' });
  const date = new Date().toISOString().slice(0, 10);
  const usageRef = adminDb.collection('certificationPathUsage').doc(user.uid).collection('days').doc(date);
  const remaining = await adminDb.runTransaction(async transaction => {
    const usage = await transaction.get(usageRef);
    const used = usage.exists ? Number(usage.data().used || 0) : 0;
    if (used >= 2) {
      const error = new Error('You have used both free pathway requests for today. Please return tomorrow.');
      error.statusCode = 429;
      throw error;
    }
    transaction.set(usageRef, { used: used + 1, updatedAt: new Date().toISOString() }, { merge: true });
    return 1 - used;
  });
  const snapshot = await adminDb.collection('certifications').where('status', '==', 'Active').get();
  const target = `${targetRole} ${domain}`.toLowerCase();
  const preferredLevels = experience === 'New' ? ['Beginner', 'Intermediate'] : experience === 'Some experience' ? ['Intermediate', 'Advanced'] : ['Advanced', 'Intermediate'];
  const recommendations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).map(entry => {
    const text = [entry.name, entry.category, entry.authority, ...(entry.skills || []), ...(entry.targetRoles || [])].join(' ').toLowerCase();
    const matches = target.split(/\s+/).filter(word => word.length > 2 && text.includes(word)).length;
    const score = matches * 10 + (preferredLevels.indexOf(entry.level) === 0 ? 5 : preferredLevels.includes(entry.level) ? 2 : 0);
    return { ...entry, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 4);
  return res.status(200).json({ recommendations, remaining, rationale: `Ranked from the verified catalog for ${targetRole} in ${domain}, prioritizing ${experience.toLowerCase()} candidates.` });
}

export default async function handler(req, res) {
  const action = req.query.action || '';
  try {
    if (req.method === 'GET' && !action) return await listCatalog(req, res);
    res.setHeader('Cache-Control', 'no-store');
    const user = await requireUser(req);
    if (req.method === 'GET' && action === 'admin') return res.status(200).json({ isAdmin: isCertificationAdmin(user) });
    if (req.method === 'GET' && action === 'submissions') return await listSubmissions(user, res);
    if (req.method === 'GET' && action === 'reports') return await listReports(user, res);
    if (req.method === 'POST' && action === 'submission') return await createSubmission(user, req, res);
    if (req.method === 'POST' && action === 'publish-submission') return await publishSubmission(user, req, res);
    if (req.method === 'POST' && action === 'report') return await createReport(user, req, res);
    if (req.method === 'POST' && action === 'pathway') return await buildPathway(user, req, res);
    if (req.method === 'PATCH' && action === 'submission') return await updateSubmission(user, req, res);
    if (req.method === 'PATCH' && action === 'report') return await updateReport(user, req, res);
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Unable to process certification request:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process certification request.' });
  }
}
