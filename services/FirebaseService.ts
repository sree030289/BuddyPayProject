import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

class FirebaseService {
  private static instance: FirebaseService;
  private _initialized: boolean = false;

  private constructor() {
    this.initializeFirebase();
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initializeFirebase() {
    try {
      if (!firebase.apps.length) {
        // Attempt to initialize Firebase if not already initialized
        // In a real app, you might need to provide configuration here
        // firebase.initializeApp({...config});
        console.log('Firebase initialization attempted');
      } else {
        console.log('Firebase already initialized');
      }
      this._initialized = true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      this._initialized = false;
    }
  }

  get initialized(): boolean {
    return this._initialized && firebase.apps.length > 0;
  }

  get firestore() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return firestore;
  }

  get auth() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return auth;
  }

  get storage() {
    if (!this.initialized) {
      throw new Error('Firebase not initialized');
    }
    return storage;
  }

  // Method to check if Firebase is initialized in a component
  ensureInitialized(): boolean {
    if (!this.initialized) {
      console.error('Firebase is not initialized properly');
      return false;
    }
    return true;
  }
}

export default FirebaseService.getInstance();
