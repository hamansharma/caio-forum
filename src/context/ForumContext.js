import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, orderBy, serverTimestamp, increment, getDoc, setDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';

const ForumContext = createContext();

export function ForumProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votedPosts, setVotedPosts] = useState({});
  const [votedComments, setVotedComments] = useState({});

  // Firebase anonymous auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthUser(firebaseUser);
        // Load their saved username + votes from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUser({ username: data.username });
          setVotedPosts(data.votedPosts || {});
          setVotedComments(data.votedComments || {});
        }
      } else {
        await signInAnonymously(auth);
      }
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

  const login = async (username) => {
    const userData = { username, votedPosts, votedComments };
    setUser({ username });
    if (authUser) await saveUserData(authUser.uid, userData);
  };

  const logout = () => setUser(null);

  const addPost = async (postData) => {
    const ref = await addDoc(collection(db, 'posts'), {
      ...postData,
      author: user?.username || 'anonymous',
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
    if (authUser) await saveUserData(authUser.uid, { votedPosts: newVoted });
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
    if (authUser) await saveUserData(authUser.uid, { votedComments: newVoted });
  };

  return (
    <ForumContext.Provider value={{ user, login, logout, posts, loading, addPost, votePost, addComment, voteComment, votedPosts, votedComments }}>
      {children}
    </ForumContext.Provider>
  );
}

export const useForum = () => useContext(ForumContext);