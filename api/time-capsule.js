import { adminDb, requireUser } from './_lib/firebaseAdmin';
import { requireCertificationAdmin } from './_lib/certificationAdmin';
import {
  PREDICTIONS_PER_MEMBER, START_SIZE, canPlaceAt, cellId, currentYear, editableUntil, inBounds, isCanvasYear, isFull, isOpen, isOutlineCell, sizeFor, validatePrediction,
} from '../src/data/timeCapsule';

// The AI Time Capsule (see src/data/timeCapsule.js). Browsers read canvases
// straight from Firestore; every change goes through here so the server can
// enforce one prediction per pixel, three new predictions per member per
// calendar year, the 24-hour edit window, and that closed canvases stay closed.
//
// Firestore layout (one canvas per due year):
//   timeCapsules/{dueYear}                     { year, size, count, outlineCount }
//   timeCapsules/{dueYear}/predictions/{x_y}   one pixel: topic, color, author, dates (public)
//   timeCapsules/{dueYear}/sealed/{x_y}        its text { text, authorUid } (author only until the reveal)
//   timeCapsuleMembers/{uid}                   { counts: { [calendar year]: n } } (owner can read)
//   timeCapsuleReports/{dueYear_x_y_uid}       member reports (server-only)
//   timeCapsuleModeration/{dueYear_x_y}        original text of hidden predictions (server-only)

const REMOVED_TEXT = '[removed by moderator]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const capsuleRef = year => adminDb.collection('timeCapsules').doc(String(year));
const predictionRef = (year, cell) => capsuleRef(year).collection('predictions').doc(cell);
const sealedRef = (year, cell) => capsuleRef(year).collection('sealed').doc(cell);
const memberRef = uid => adminDb.collection('timeCapsuleMembers').doc(uid);

const requireVerified = user => {
  if (user.email_verified !== true) throw httpError(403, 'Please verify your email address before adding predictions.');
};

const requireCell = value => {
  if (typeof value !== 'string' || !/^-?\d{1,3}_-?\d{1,3}$/.test(value)) throw httpError(400, 'A valid pixel is required.');
  return value;
};

const requireYear = value => {
  const year = Number(value);
  if (!isCanvasYear(year)) throw httpError(400, 'Choose a year between 2027 and 2040.');
  return year;
};

async function place(user, body) {
  requireVerified(user);
  const year = requireYear(body.year);
  if (!isOpen(year)) throw httpError(409, `The ${year} canvas is closed to new predictions.`);
  const { value, error } = validatePrediction(body);
  if (error) throw httpError(400, error);
  const x = Number(body.x);
  const y = Number(body.y);
  const profile = (await adminDb.collection('users').doc(user.uid).get()).data() || {};
  if (!profile.username) throw httpError(400, 'Your profile is missing a username. Sign out and back in, then try again.');

  const cell = cellId(x, y);
  const madeIn = currentYear();
  await adminDb.runTransaction(async transaction => {
    const [capsule, taken, member] = await Promise.all([transaction.get(capsuleRef(year)), transaction.get(predictionRef(year, cell)), transaction.get(memberRef(user.uid))]);
    const size = capsule.get('size') || START_SIZE;
    const count = capsule.get('count') || 0;
    const used = member.get(`counts.${madeIn}`) || 0;
    const outlineCount = capsule.get('outlineCount') || 0;
    const onOutline = isOutlineCell(year, cell);
    if (isFull(count)) throw httpError(409, `The ${year} canvas is full.`);
    if (!inBounds(x, y, size)) throw httpError(400, 'That pixel is outside the canvas.');
    if (taken.exists) throw httpError(409, 'Someone just took that pixel. Choose another.');
    if (!canPlaceAt(year, cell, outlineCount)) throw httpError(400, 'Fill in the year first: choose one of the grey pixels.');
    if (used >= PREDICTIONS_PER_MEMBER) throw httpError(409, `You've used all ${PREDICTIONS_PER_MEMBER} of your predictions for ${madeIn}.`);
    const { text, ...shown } = value;
    transaction.set(predictionRef(year, cell), {
      ...shown, x, y, year, madeIn, author: profile.username, authorUid: user.uid, createdAt: new Date().toISOString(),
    });
    transaction.set(sealedRef(year, cell), { year, cell, text, authorUid: user.uid });
    transaction.set(capsuleRef(year), { year, count: count + 1, size: sizeFor(count + 1, size), outlineCount: outlineCount + (onOutline ? 1 : 0) }, { merge: true });
    transaction.set(memberRef(user.uid), { counts: { [madeIn]: used + 1 } }, { merge: true });
  });
  return { cell };
}

// Loads one of the member's own predictions that's still in its edit window.
async function ownEditable(transaction, user, year, cell) {
  const snapshot = await transaction.get(predictionRef(year, cell));
  if (!snapshot.exists) throw httpError(404, 'Prediction not found.');
  const prediction = snapshot.data();
  if (prediction.authorUid !== user.uid) throw httpError(403, 'You can only change your own predictions.');
  if (prediction.hidden) throw httpError(403, 'This prediction was removed by a moderator.');
  if (Date.now() > editableUntil(prediction.createdAt)) throw httpError(403, 'Predictions lock 24 hours after they\'re added.');
  return prediction;
}

async function edit(user, body) {
  requireVerified(user);
  const year = requireYear(body.year);
  const cell = requireCell(body.cell);
  const { value, error } = validatePrediction(body);
  if (error) throw httpError(400, error);
  await adminDb.runTransaction(async transaction => {
    await ownEditable(transaction, user, year, cell);
    const { text, ...shown } = value;
    transaction.update(predictionRef(year, cell), { ...shown, editedAt: new Date().toISOString() });
    transaction.update(sealedRef(year, cell), { text });
  });
}

async function remove(user, body) {
  const year = requireYear(body.year);
  const cell = requireCell(body.cell);
  await adminDb.runTransaction(async transaction => {
    const prediction = await ownEditable(transaction, user, year, cell);
    const [capsule, member] = await Promise.all([transaction.get(capsuleRef(year)), transaction.get(memberRef(user.uid))]);
    transaction.delete(predictionRef(year, cell));
    transaction.delete(sealedRef(year, cell));
    // The canvas never shrinks, so pixels never move. Deleting gives the member their prediction back.
    const outlineCount = capsule.get('outlineCount') || 0;
    transaction.set(capsuleRef(year), {
      count: Math.max(0, (capsule.get('count') || 1) - 1),
      outlineCount: isOutlineCell(year, cell) ? Math.max(0, outlineCount - 1) : outlineCount,
    }, { merge: true });
    const used = member.get(`counts.${prediction.madeIn}`) || 1;
    transaction.set(memberRef(user.uid), { counts: { [prediction.madeIn]: Math.max(0, used - 1) } }, { merge: true });
  });
}

async function report(user, body) {
  const year = requireYear(body.year);
  const cell = requireCell(body.cell);
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  const prediction = await predictionRef(year, cell).get();
  if (!prediction.exists) throw httpError(404, 'Prediction not found.');
  // One report per member per prediction; reporting again updates it.
  await adminDb.collection('timeCapsuleReports').doc(`${year}_${cell}_${user.uid}`).set({
    year, cell, reason, reporterUid: user.uid, reportedAt: new Date().toISOString(), status: 'Open',
  });
}

// ── Admin ──
async function adminList(user) {
  requireCertificationAdmin(user);
  const [predictions, sealed, reports, originals] = await Promise.all([
    adminDb.collectionGroup('predictions').get(),
    adminDb.collectionGroup('sealed').get(),
    adminDb.collection('timeCapsuleReports').where('status', '==', 'Open').get(),
    adminDb.collection('timeCapsuleModeration').get(),
  ]);
  const key = (year, cell) => `${year}_${cell}`;
  const reportsByKey = {};
  reports.docs.forEach(document => {
    const item = document.data();
    (reportsByKey[key(item.year, item.cell)] = reportsByKey[key(item.year, item.cell)] || []).push(item.reason);
  });
  const originalText = Object.fromEntries(originals.docs.map(document => [document.id, document.get('text')]));
  const sealedText = Object.fromEntries(sealed.docs.map(document => [key(document.get('year'), document.id), document.get('text')]));
  const entries = predictions.docs.map(document => {
    const item = document.data();
    const id = key(item.year, document.id);
    return {
      year: item.year, cell: document.id, author: item.author, text: item.hidden ? originalText[id] || '' : sealedText[id] || '',
      topic: item.topic, madeIn: item.madeIn, createdAt: item.createdAt, hidden: Boolean(item.hidden), reports: reportsByKey[id] || [],
    };
  });
  // Reported first, then newest.
  entries.sort((a, b) => b.reports.length - a.reports.length || String(b.createdAt).localeCompare(String(a.createdAt)));
  return { entries };
}

async function moderate(user, body) {
  requireCertificationAdmin(user);
  const year = requireYear(body.year);
  const cell = requireCell(body.cell);
  if (!['hide', 'restore'].includes(body.action)) throw httpError(400, 'Choose hide or restore.');
  const originalRef = adminDb.collection('timeCapsuleModeration').doc(`${year}_${cell}`);
  const now = new Date().toISOString();
  await adminDb.runTransaction(async transaction => {
    const [snapshot, sealed, original] = await Promise.all([transaction.get(predictionRef(year, cell)), transaction.get(sealedRef(year, cell)), transaction.get(originalRef)]);
    if (!snapshot.exists) throw httpError(404, 'Prediction not found.');
    const prediction = snapshot.data();
    if (body.action === 'hide') {
      if (prediction.hidden) return;
      // The pixel stays taken; its text moves somewhere only the server can read.
      transaction.set(originalRef, { year, cell, text: sealed.get('text') || '', hiddenAt: now, hiddenByUid: user.uid });
      transaction.update(predictionRef(year, cell), { hidden: true });
      transaction.update(sealedRef(year, cell), { text: REMOVED_TEXT });
    } else {
      if (!prediction.hidden || !original.exists) throw httpError(400, 'Only hidden predictions can be restored.');
      transaction.update(predictionRef(year, cell), { hidden: false });
      transaction.update(sealedRef(year, cell), { text: original.get('text') });
      transaction.delete(originalRef);
    }
  });
  // Handling a prediction closes its open reports.
  const reports = await adminDb.collection('timeCapsuleReports').where('year', '==', year).where('cell', '==', cell).get();
  const batch = adminDb.batch();
  reports.docs.forEach(document => batch.update(document.ref, { status: 'Handled', handledAt: now }));
  await batch.commit();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const action = req.query.action || '';
  try {
    const user = await requireUser(req);
    const body = req.body || {};
    if (req.method === 'GET' && action === 'admin') return res.status(200).json(await adminList(user));
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (action === 'place') return res.status(201).json(await place(user, body));
    if (action === 'edit') await edit(user, body);
    else if (action === 'delete') await remove(user, body);
    else if (action === 'report') await report(user, body);
    else if (action === 'moderate') await moderate(user, body);
    else return res.status(404).json({ error: 'Unknown time capsule action.' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error(`Time capsule ${action} failed:`, error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
