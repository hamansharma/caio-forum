import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, increment, getDoc, setDoc
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
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

  const signup = async ({ email, password, fullName, username }) => {
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        throw err;
      }
      const uid = credential.user.uid;
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
      setUser({ uid, email: String(email), fullName: String(fullName), username: String(username) });
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

  return (
    <ForumContext.Provider value={{
      user, login, logout, signup, posts, loading, authLoading,
      addPost, votePost, addComment, voteComment, votedPosts, votedComments
    }}>
      {children}
    </ForumContext.Provider>
  );
}

export const useForum = () => useContext(ForumContext);