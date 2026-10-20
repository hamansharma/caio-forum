import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, increment, getDoc, setDoc,
  getDocs, deleteDoc, runTransaction, where, limit, arrayUnion
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';

import { db, auth } from '../firebase';
import { generateUsername } from '../utils/usernameGenerator';
import { slugify, looksLikePostId, postPath } from '../utils/postUrl';

const ForumContext = createContext();

// Resolves a URL key (new-style slug or old-style document ID) to a post ID.
async function findPostId(key) {
  const byId = async () => ((await getDoc(doc(db, 'posts', key))).exists() ? key : null);
  if (looksLikePostId(key)) {
    const id = await byId();
    if (id) return id;
  }
  const bySlug = await getDocs(query(collection(db, 'posts'), where('slug', '==', key), limit(1)));
  if (!bySlug.empty) return bySlug.docs[0].id;
  return looksLikePostId(key) ? null : byId();
}

// Live updates for a single post, without loading the whole posts collection.
// Calls onChange(post), or onChange(null) when it doesn't exist. Returns an unsubscribe function.
function watchPost(key, onChange) {
  let active = true;
  let unsubscribe = () => {};
  findPostId(key)
    .then(id => {
      if (!active) return;
      if (!id) { onChange(null); return; }
      unsubscribe = onSnapshot(doc(db, 'posts', id),
        snap => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
        () => onChange(null));
    })
    .catch(() => { if (active) onChange(null); });
  return () => { active = false; unsubscribe(); };
}

// Edits, deletes and votes on existing comments go through api/comments.js,
// which checks authorship; Firestore rules only let browsers append comments.
async function commentsApi(action, payload = {}) {
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`/api/comments?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed. Please try again.');
  return data;
}

// Slugs never take the shape of a Firestore ID, so the two URL styles can't collide.
async function uniquePostSlug(title) {
  const base = slugify(title) || 'discussion';
  for (let n = 1; n <= 20; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (looksLikePostId(candidate)) continue;
    const taken = await getDocs(query(collection(db, 'posts'), where('slug', '==', candidate), limit(1)));
    if (taken.empty) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function ForumProvider({ children }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsRequested, setPostsRequested] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [votedPosts, setVotedPosts] = useState({});
  const [votedComments, setVotedComments] = useState({});

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            fullName: data.fullName,
            username: data.username,
          });
          setVotedPosts(data.votedPosts || {});
          setVotedComments(data.votedComments || {});
        }
      } else {
        setUser(null);
        setVotedPosts({});
        setVotedComments({});
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Real-time listener for the full posts list. Started on demand (see usePosts)
  // so pages that don't list posts don't download the whole collection.
  const requestPosts = useCallback(() => setPostsRequested(true), []);

  useEffect(() => {
    if (!postsRequested) return undefined;
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(loaded);
      setLoading(false);
    });
    return unsub;
  }, [postsRequested]);

  const saveUserData = async (uid, data) => {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  };

  const checkUsernameAvailable = async (username) => {
    const normalized = username.toLowerCase().trim();
    try {
      const snap = await getDoc(doc(db, 'usernames', normalized));
      return !snap.exists();
    } catch {
      return false;
    }
  };

  const claimUsername = async (uid, username) => {
    const normalized = username.toLowerCase().trim();
    const usernameRef = doc(db, 'usernames', normalized);
    await runTransaction(db, async transaction => {
      if ((await transaction.get(usernameRef)).exists()) throw new Error('USERNAME_TAKEN');
      transaction.set(usernameRef, { uid });
    });
  };

  const signup = async ({ email, password, fullName, username }) => {
    // Firestore rules deliberately prohibit username-index reads before sign-in.
    // Create the Auth account first, then claim the name atomically as that user.
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    try {
      await claimUsername(uid, username);
    } catch (usernameError) {
      // Do not leave an unusable Auth account behind when another member won the
      // username race between form entry and account creation.
      await deleteUser(credential.user).catch(() => {});
      throw usernameError;
    }

    try {
      await setDoc(doc(db, 'users', uid), {
        email: String(email),
        fullName: String(fullName),
        username: String(username),
        votedPosts: {},
        votedComments: {},
        createdAt: new Date().toISOString(),
      });
    } catch (firestoreErr) {
      console.error('Firestore write failed:', firestoreErr);
      throw new Error('Account created but profile save failed. Please try signing in.');
    }

    setUser({
      uid,
      email: String(email),
      fullName: String(fullName),
      username: String(username),
    });
  };

  const login = async ({ email, password }) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setUser({
        uid: String(credential.user.uid),
        email: String(credential.user.email),
        fullName: String(data.fullName || ''),
        username: String(data.username || ''),
      });
      setVotedPosts(data.votedPosts || {});
      setVotedComments(data.votedComments || {});
    } else {
      throw new Error('User profile not found. Please sign up first.');
    }
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const firebaseUser = credential.user;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const existingProfile = await getDoc(userRef);

    if (existingProfile.exists()) {
      const data = existingProfile.data();
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: data.fullName || firebaseUser.displayName || '',
        username: data.username || '',
      });
      setVotedPosts(data.votedPosts || {});
      setVotedComments(data.votedComments || {});
      return;
    }

    let username = '';
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = generateUsername();
      if (await checkUsernameAvailable(candidate)) {
        username = candidate;
        break;
      }
    }
    if (!username) throw new Error('Unable to create an available forum username. Please try Google sign-in again.');

    await claimUsername(firebaseUser.uid, username);
    const fullName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'CAIO member';
    const profile = {
      email: String(firebaseUser.email || ''),
      fullName: String(fullName),
      username,
      votedPosts: {},
      votedComments: {},
      createdAt: new Date().toISOString(),
      authProvider: 'google.com',
    };
    await setDoc(userRef, profile);
    setUser({ uid: firebaseUser.uid, email: profile.email, fullName: profile.fullName, username });
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setVotedPosts({});
    setVotedComments({});
  };

  const addPost = async (postData) => {
    const slug = await uniquePostSlug(postData.title);
    await addDoc(collection(db, 'posts'), {
      ...postData,
      slug,
      author: user?.username || 'anonymous',
      authorUid: user?.uid || null,
      authorFullName: user?.fullName || '',
      createdAt: serverTimestamp(),
      votes: 1,
      comments: [],
    });
    return postPath({ slug });
  };

  const votePost = async (postId, dir) => {
    if (!user) return;
    const prev = votedPosts[postId] || 0;
    if (prev === dir) return;
    const delta = dir - prev;
    if (delta < -2 || delta > 2) return; // sanity check
    const newVoted = { ...votedPosts, [postId]: dir };
    setVotedPosts(newVoted);
    await updateDoc(doc(db, 'posts', postId), {
      votes: increment(delta),
      [`userVotes.${user.uid}`]: dir === 0 ? null : dir,
    });
    if (user) await saveUserData(user.uid, { votedPosts: newVoted });
  };

  const addComment = async (postId, body, parentId = null) => {
    const newComment = {
      id: Date.now().toString(),
      postId,
      parentId,
      author: user?.username || 'anonymous',
      authorUid: user?.uid || null,
      body,
      votes: 1,
      createdAt: new Date().toISOString(),
    };
    // arrayUnion appends atomically, so simultaneous comments don't overwrite each other.
    await updateDoc(doc(db, 'posts', postId), { comments: arrayUnion(newComment) });
  };

  const voteComment = async (postId, commentId, dir) => {
    const key = `${postId}-${commentId}`;
    const prev = votedComments[key] || 0;
    if (prev === dir) return;
    setVotedComments(current => ({ ...current, [key]: dir }));
    try {
      await commentsApi('vote', { postId, commentId, dir });
    } catch (error) {
      setVotedComments(current => ({ ...current, [key]: prev })); // undo the optimistic vote
      console.error('Comment vote failed:', error.message);
    }
  };

  const editPost = async (postId, newTitle, newBody) => {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (postSnap.data().authorUid !== user?.uid) throw new Error('Not authorized.');
    await updateDoc(doc(db, 'posts', postId), {
      title: newTitle,
      body: newBody,
      editedAt: new Date().toISOString(),
    });
  };

  const deletePost = async (postId) => {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (postSnap.data().authorUid !== user?.uid) throw new Error('Not authorized.');
    await updateDoc(doc(db, 'posts', postId), {
      deleted: true,
      deletedAt: new Date().toISOString(),
      body: '[deleted]',
      title: '[deleted]',
    });
  };

  const editComment = (postId, commentId, newBody) => commentsApi('edit', { postId, commentId, body: newBody });

  const deleteComment = (postId, commentId) => commentsApi('delete', { postId, commentId });

const updateAlias = async (newAlias, useAlias) => {
    // Check new alias isn't taken by someone else
    const normalized = newAlias.toLowerCase().trim();
    const snap = await getDoc(doc(db, 'usernames', normalized));
    if (snap.exists() && snap.data().uid !== user.uid) {
      throw new Error('USERNAME_TAKEN');
    }

    // Claim new username in index (if not already claimed by this user)
    if (!snap.exists()) {
      await setDoc(doc(db, 'usernames', normalized), { uid: user.uid });
    }

    await saveUserData(user.uid, { username: newAlias, useAlias });
    setUser(prev => ({ ...prev, username: newAlias, useAlias }));
  };

  // Firebase emails a reset link (its standard hosted page); the link returns
  // the user to this site afterwards.
  const sendPasswordReset = email =>
    sendPasswordResetEmail(auth, email, { url: `${window.location.origin}/` });

  const updatePassword = async (currentPassword, newPassword) => {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const deleteAccount = async () => {
    const uid = user.uid;
    // The server replaces this member's posts and comments with "[deleted]".
    await commentsApi('anonymize-account');
    await deleteDoc(doc(db, 'users', uid));
    await deleteUser(auth.currentUser);
    setUser(null);
  };


  return (
    <ForumContext.Provider value={{
      user, login, logout, signup, googleSignIn, posts, loading, authLoading,
      requestPosts, watchPost,
      addPost, votePost, addComment, voteComment, votedPosts, votedComments,
      editPost, deletePost, editComment, deleteComment,
      updateAlias, updatePassword, sendPasswordReset, deleteAccount
    }}>
      {children}
    </ForumContext.Provider>
  );
}

export const useForum = () => useContext(ForumContext);

// For pages that list posts: starts the shared posts listener on first use.
export function usePosts() {
  const { posts, loading, requestPosts } = useContext(ForumContext);
  useEffect(() => { requestPosts(); }, [requestPosts]);
  return { posts, loading };
}
