// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyB50KMXLJobRq4SVhkVehK4Dt8jVu0tUzM",
  authDomain: "buddypay-1cc90.firebaseapp.com",
  projectId: "buddypay-1cc90",
  storageBucket: "buddypay-1cc90.firebasestorage.app",
  messagingSenderId: "287426736539",
  appId: "1:287426736539:web:6e00d71e84999f8799f13e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
