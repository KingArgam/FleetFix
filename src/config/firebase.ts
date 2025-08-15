
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';


const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBkPXq0h5cBzQC0zm2BLJa0Kg59LOT7xkY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "fleetfix-4cd0d.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "fleetfix-4cd0d",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "fleetfix-4cd0d.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "202066480009",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:202066480009:web:5383e43af25d465f5e2f58",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-D2Z5YRMGTE"
};


const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);


let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };


export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.projectId &&
         firebaseConfig.apiKey.startsWith('AIza');
};

export const isFirebaseEnabled = process.env.REACT_APP_USE_FIREBASE === 'true';


export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
};

export type { FirebaseUser };

export default app;
