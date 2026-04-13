import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBftYloLX06tWEnDBch9ZP3lpoFcVQ9-Zs",
  authDomain: "caio-forum.firebaseapp.com",
  projectId: "caio-forum",
  storageBucket: "caio-forum.firebasestorage.app",
  messagingSenderId: "938534074428",
  appId: "1:938534074428:web:d1ae6a0beab829e5de2b39",
  measurementId: "G-166FH9J9BC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);