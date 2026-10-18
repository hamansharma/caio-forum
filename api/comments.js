import { adminDb, requireUser } from './_lib/firebaseAdmin';

// Changes to existing comments go through here, where the server checks who
// wrote each comment. Firestore rules only let browsers append new comments,
// because comments live in an array on the post (see README) and rules can't
// check who wrote each element.

const COMMENT_MAX = 10000; // matches LIMITS.COMMENT_MAX in src/utils/validate.js

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const requireId = (value, name) => {
  if (typeof value !== 'string' || !value || value.length > 200 || value.includes('/')) throw httpError(400, `A valid ${name} is required.`);
  return value;
};

// Applies `change` to one comment inside a transaction, so concurrent edits to
// the same post's comments can't overwrite each other.
async function updateComment(postId, commentId, change) {
  const postRef = adminDb.collection('posts').doc(postId);
  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(postRef);
    if (!snapshot.exists) throw httpError(404, 'Post not found.');
    const comments = snapshot.get('comments') || [];
    const index = comments.findIndex(comment => comment.id === commentId);
    if (index < 0) throw httpError(404, 'Comment not found.');
    const next = [...comments];
    next[index] = change(comments[index]);
    transaction.update(postRef, { comments: next });
  });
}

const requireAuthor = (comment, uid) => {
  if (comment.deleted) throw httpError(400, 'This comment has been deleted.');
  if (comment.authorUid !== uid) throw httpError(403, 'Not authorized.');
};

async function editComment(user, body) {
  const postId = requireId(body.postId, 'post');
  const commentId = requireId(body.commentId, 'comment');
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text || text.length > COMMENT_MAX) throw httpError(400, `Comments must be 1 to ${COMMENT_MAX} characters.`);
  await updateComment(postId, commentId, comment => {
    requireAuthor(comment, user.uid);
    return { ...comment, body: text, editedAt: new Date().toISOString() };
  });
}

async function deleteComment(user, body) {
  const postId = requireId(body.postId, 'post');
  const commentId = requireId(body.commentId, 'comment');
  await updateComment(postId, commentId, comment => {
    requireAuthor(comment, user.uid);
    return { ...comment, body: '[deleted]', author: '[deleted]', deleted: true };
  });
}

// The previous vote comes from the voter's own profile, as it did when the
// browser handled votes.
async function voteComment(user, body) {
  const postId = requireId(body.postId, 'post');
  const commentId = requireId(body.commentId, 'comment');
  const dir = body.dir;
  if (![-1, 0, 1].includes(dir)) throw httpError(400, 'A vote must be -1, 0, or 1.');
  const key = `${postId}-${commentId}`;
  const postRef = adminDb.collection('posts').doc(postId);
  const userRef = adminDb.collection('users').doc(user.uid);
  await adminDb.runTransaction(async transaction => {
    const [postSnapshot, userSnapshot] = await Promise.all([transaction.get(postRef), transaction.get(userRef)]);
    if (!postSnapshot.exists) throw httpError(404, 'Post not found.');
    const previous = userSnapshot.get(`votedComments.${key}`) || 0;
    if (previous === dir) return;
    const comments = postSnapshot.get('comments') || [];
    const index = comments.findIndex(comment => comment.id === commentId);
    if (index < 0) throw httpError(404, 'Comment not found.');
    const next = [...comments];
    next[index] = { ...comments[index], votes: (comments[index].votes || 0) + dir - previous };
    transaction.update(postRef, { comments: next });
    transaction.set(userRef, { votedComments: { [key]: dir } }, { merge: true });
  });
}

// Before an account is deleted: replace the member's posts and comments with
// "[deleted]". Matches by account ID, and by current username for older
// content saved before author IDs were stored.
async function anonymizeAccount(user) {
  const profile = (await adminDb.collection('users').doc(user.uid).get()).data() || {};
  const username = profile.username;
  const isMine = item => item.authorUid === user.uid || Boolean(username && item.author === username);
  const now = new Date().toISOString();
  const snapshot = await adminDb.collection('posts').get();
  const updates = [];
  snapshot.docs.forEach(document => {
    const post = document.data();
    const update = {};
    if (isMine(post) && !post.deleted) Object.assign(update, { author: '[deleted]', title: '[deleted]', body: '[deleted]', deleted: true, deletedAt: now });
    const comments = post.comments || [];
    if (comments.some(comment => isMine(comment) && !comment.deleted)) {
      update.comments = comments.map(comment => (isMine(comment) && !comment.deleted
        ? { ...comment, author: '[deleted]', body: '[deleted]', deleted: true }
        : comment));
    }
    if (Object.keys(update).length) updates.push([document.ref, update]);
  });
  for (let index = 0; index < updates.length; index += 400) {
    const batch = adminDb.batch();
    updates.slice(index, index + 400).forEach(([ref, update]) => batch.update(ref, update));
    await batch.commit();
  }
  return updates.length;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const action = req.query.action || '';
  try {
    const user = await requireUser(req);
    const body = req.body || {};
    if (action === 'edit') await editComment(user, body);
    else if (action === 'delete') await deleteComment(user, body);
    else if (action === 'vote') await voteComment(user, body);
    else if (action === 'anonymize-account') return res.status(200).json({ ok: true, updatedPosts: await anonymizeAccount(user) });
    else return res.status(404).json({ error: 'Unknown comments action.' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error(`Comments ${action} failed:`, error);
    return res.status(500).json({ error: 'Unable to update the comment. Please try again.' });
  }
}
