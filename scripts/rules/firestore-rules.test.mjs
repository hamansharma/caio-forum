// Tests for firestore.rules against the local Firestore emulator.
// Run with `npm run test:rules` (starts and stops the emulator; needs Java).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env;
const existingComment = { id: 'c1', postId: 'p1', parentId: null, author: 'bob', authorUid: 'bob', body: 'First!', votes: 1, createdAt: '2026-10-01T00:00:00.000Z' };
const newComment = (uid, id = 'c2') => ({ id, postId: 'p1', parentId: null, author: uid, authorUid: uid, body: 'Nice post', votes: 1, createdAt: '2026-10-02T00:00:00.000Z' });

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-caio-forum',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), { email: 'alice@example.com', username: 'alice', votedComments: {} });
    await setDoc(doc(db, 'users/bob'), { email: 'bob@example.com', username: 'bob' });
    await setDoc(doc(db, 'posts/p1'), { title: 'Post', body: 'Body', category: 'strategy', author: 'alice', authorUid: 'alice', votes: 1, comments: [existingComment] });
    await setDoc(doc(db, 'posts/p2'), { title: 'Older post', body: 'Body', category: 'concepts', author: 'alice', authorUid: 'alice', votes: 1 });
    await setDoc(doc(db, 'posts/p3'), { title: 'New post', body: 'Body', category: 'ethics', author: 'alice', authorUid: 'alice', votes: 1, comments: [] });
    await setDoc(doc(db, 'chatUsage/alice'), { day: '2026-10-18', dayCount: 5 });
  });
});

const as = uid => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

// ── Users ──
test('members can read their own profile', () => assertSucceeds(getDoc(doc(as('alice'), 'users/alice'))));
test('members cannot read other profiles', () => assertFails(getDoc(doc(as('alice'), 'users/bob'))));
test('visitors cannot read profiles', () => assertFails(getDoc(doc(as(null), 'users/alice'))));

// ── Comments ──
test('a member can append their own comment', () =>
  assertSucceeds(updateDoc(doc(as('carol'), 'posts/p1'), { comments: arrayUnion(newComment('carol')) })));
test('a first comment can be added to a new post (empty comments list)', () =>
  assertSucceeds(updateDoc(doc(as('carol'), 'posts/p3'), { comments: arrayUnion(newComment('carol')) })));
test('a first comment can be added to a post with no comments field', () =>
  assertSucceeds(updateDoc(doc(as('carol'), 'posts/p2'), { comments: arrayUnion(newComment('carol')) })));
test('a comment cannot be appended in someone else\'s name', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { comments: arrayUnion(newComment('bob')) })));
test('appending cannot also rewrite an existing comment', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { comments: [{ ...existingComment, body: 'defaced' }, newComment('carol')] })));
test('existing comments cannot be edited from the browser, even by their author', () =>
  assertFails(updateDoc(doc(as('bob'), 'posts/p1'), { comments: [{ ...existingComment, body: 'edited' }] })));
test('existing comments cannot be deleted from the browser', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { comments: [{ ...existingComment, body: '[deleted]', deleted: true }] })));
test('comments cannot be removed from the list', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { comments: [] })));

// ── Posts ──
test('anyone can read posts', () => assertSucceeds(getDoc(doc(as(null), 'posts/p1'))));
test('members can vote on posts (up to ±2 per update)', () =>
  assertSucceeds(updateDoc(doc(as('carol'), 'posts/p1'), { votes: 3, 'userVotes.carol': 1 })));
test('a single update cannot move votes by more than 2', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { votes: 10 })));
test('the author can edit their post', () =>
  assertSucceeds(updateDoc(doc(as('alice'), 'posts/p1'), { title: 'New title', editedAt: '2026-10-18T00:00:00.000Z' })));
test('others cannot edit the post', () =>
  assertFails(updateDoc(doc(as('carol'), 'posts/p1'), { title: 'Hijacked' })));
test('the author can soft-delete their post', () =>
  assertSucceeds(updateDoc(doc(as('alice'), 'posts/p1'), { deleted: true, deletedAt: '2026-10-18T00:00:00.000Z', title: '[deleted]', body: '[deleted]' })));

// ── Server-only collections ──
test('chat usage counts are server-only', async () => {
  await assertFails(getDoc(doc(as('alice'), 'chatUsage/alice')));
  await assertFails(setDoc(doc(as('alice'), 'chatUsage/alice'), { day: '2026-10-18', dayCount: 0 }));
});
