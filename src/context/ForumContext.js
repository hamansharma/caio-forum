import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, increment, getDoc, setDoc,
  getDocs, writeBatch, deleteDoc
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';

import { db, auth } from '../firebase';

const ForumContext = createContext();

export function ForumProvider({ children }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Real-time posts listener
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(loaded);
      setLoading(false);
    });
    return unsub;
  }, []);

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
    await setDoc(doc(db, 'usernames', normalized), { uid });
  };

  const signup = async ({ email, password, fullName, username }) => {
    // Check username availability before creating auth account
    const available = await checkUsernameAvailable(username);
    if (!available) {
      throw new Error('USERNAME_TAKEN');
    }

    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw err;
    }

    const uid = credential.user.uid;

    try {
      // Claim the username in the index
      await claimUsername(uid, username);

      // Save user profile
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

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setVotedPosts({});
    setVotedComments({});
  };

  const addPost = async (postData) => {
    const ref = await addDoc(collection(db, 'posts'), {
      ...postData,
      author: user?.username || 'anonymous',
      authorFullName: user?.fullName || '',
      createdAt: serverTimestamp(),
      votes: 1,
      comments: [],
    });
    return ref.id;
  };

  const votePost = async (postId, dir) => {
    const prev = votedPosts[postId] || 0;
    if (prev === dir) return;
    const newVoted = { ...votedPosts, [postId]: dir };
    setVotedPosts(newVoted);
    await updateDoc(doc(db, 'posts', postId), { votes: increment(dir - prev) });
    if (user) await saveUserData(user.uid, { votedPosts: newVoted });
  };

  const addComment = async (postId, body, parentId = null) => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    const existing = postSnap.data().comments || [];
    const newComment = {
      id: Date.now().toString(),
      postId,
      parentId,
      author: user?.username || 'anonymous',
      body,
      votes: 1,
      createdAt: new Date().toISOString(),
    };
    await updateDoc(postRef, { comments: [...existing, newComment] });
  };

  const voteComment = async (postId, commentId, dir) => {
    const key = `${postId}-${commentId}`;
    const prev = votedComments[key] || 0;
    if (prev === dir) return;
    const newVoted = { ...votedComments, [key]: dir };
    setVotedComments(newVoted);
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    const comments = postSnap.data().comments.map(c =>
      c.id === commentId ? { ...c, votes: c.votes + dir - prev } : c
    );
    await updateDoc(postRef, { comments });
    if (user) await saveUserData(user.uid, { votedComments: newVoted });
  };

  const editPost = async (postId, newTitle, newBody) => {
    await updateDoc(doc(db, 'posts', postId), {
      title: newTitle,
      body: newBody,
      editedAt: new Date().toISOString(),
    });
  };

  const deletePost = async (postId) => {
    await updateDoc(doc(db, 'posts', postId), {
      deleted: true,
      deletedAt: new Date().toISOString(),
      body: '[deleted]',
      title: '[deleted]',
    });
  };

  const editComment = async (postId, commentId, newBody) => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    const comments = postSnap.data().comments.map(c =>
      c.id === commentId
        ? { ...c, body: newBody, editedAt: new Date().toISOString() }
        : c
    );
    await updateDoc(postRef, { comments });
  };

  const deleteComment = async (postId, commentId) => {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    const comments = postSnap.data().comments.map(c =>
      c.id === commentId
        ? { ...c, body: '[deleted]', author: '[deleted]', deleted: true }
        : c
    );
    await updateDoc(postRef, { comments });
  };

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

  const updatePassword = async (currentPassword, newPassword) => {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  };

  const deleteAccount = async () => {
    const uid = user.uid;
    const username = user.username;

    const allPosts = await getDocs(collection(db, 'posts'));
    const batch = writeBatch(db);

    allPosts.docs.forEach(postDoc => {
      const data = postDoc.data();
      let changed = false;

      if (data.author === username) {
        batch.update(postDoc.ref, {
          author: '[deleted]', body: '[deleted]',
          title: '[deleted]', deleted: true,
        });
        changed = true;
      }

      const updatedComments = (data.comments || []).map(c => {
        if (c.author === username) {
          changed = true;
          return { ...c, author: '[deleted]', body: '[deleted]', deleted: true };
        }
        return c;
      });

      if (changed && data.author !== username) {
        batch.update(postDoc.ref, { comments: updatedComments });
      }
    });

    await batch.commit();
    await deleteDoc(doc(db, 'users', uid));
    await deleteUser(auth.currentUser);
    setUser(null);
  };


  return (
    <ForumContext.Provider value={{
      user, login, logout, signup, posts, loading, authLoading,
      addPost, votePost, addComment, voteComment, votedPosts, votedComments,
      editPost, deletePost, editComment, deleteComment,
      updateAlias, updatePassword, deleteAccount
    }}>
      {children}
    </ForumContext.Provider>
  );
}

export const useForum = () => useContext(ForumContext);