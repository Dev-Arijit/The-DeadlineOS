import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuration from /firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyA4jg1S7sMTOTmE2xteIJVbOsqGI4kdOfo",
  authDomain: "gen-lang-client-0958642788.firebaseapp.com",
  projectId: "gen-lang-client-0958642788",
  storageBucket: "gen-lang-client-0958642788.firebasestorage.app",
  messagingSenderId: "218487797754",
  appId: "1:218487797754:web:c1a63c5f426338cd765643"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, "ai-studio-595063d8-d636-4fab-b6cc-b9dce603bb37");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail };
