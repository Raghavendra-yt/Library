// Firebase App Initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAeXogDjvowEIkDUbPcCIfsf9V14248v3Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "library-1163b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "library-1163b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "library-1163b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "830571452398",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:830571452398:web:960517dfae2013e785a0ff",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KH6918DJNX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in browser environments that support it)
isSupported().then(supported => {
  if (supported) getAnalytics(app);
});

export default app;
