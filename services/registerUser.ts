// services/registerUser.ts
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

export async function registerUser(name: string, email: string, phone: string, password: string) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  await setDoc(doc(db, 'users', uid), {
    name,
    email,
    phone,
    createdAt: serverTimestamp(),
  });

  return uid;
}
