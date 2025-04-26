// services/registerUser.ts
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

/**
 * Checks if a user with the given email or phone already exists in the database
 * @param email Email to check
 * @param phone Phone number to check
 * @returns Promise with the result of the check
 */
export async function checkUserExists(email: string, phone: string): Promise<{exists: boolean, field: string}> {
  try {
    // Check if email exists
    if (email) {
      const emailQuery = query(collection(db, 'users'), where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return { exists: true, field: 'email' };
      }
    }
    
    // Check if phone exists
    if (phone) {
      const phoneQuery = query(collection(db, 'users'), where('phone', '==', phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        return { exists: true, field: 'phone' };
      }
    }
    
    // No duplicates found
    return { exists: false, field: '' };
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw error;
  }
}

/**
 * Registers a new user with Firebase Authentication and Firestore
 * @param name User's full name
 * @param email User's email address
 * @param phone User's phone number with country code
 * @param password User's password
 * @returns Promise with the new user's UID
 */
export async function registerUser(name: string, email: string, phone: string, password: string) {
  // First check if user already exists
  const { exists, field } = await checkUserExists(email, phone);
  
  if (exists) {
    // Throw an error with a specific message
    throw new Error(`A user with this ${field} already exists. Please use a different ${field}.`);
  }
  
  // Continue with registration if no duplicates found
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCred.user.uid;

  // Store user in Firestore using UID as document ID
  await setDoc(doc(db, 'users', uid), {
    name,
    displayName: name, // Add displayName for consistency
    email,
    phone,
    createdAt: serverTimestamp(),
  });

  return uid;
}