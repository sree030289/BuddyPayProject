// Updated AuthContext.tsx with improved user validation
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  User,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { auth, db } from '../services/firebaseConfig';
import { checkUserExists } from '../services/registerUser';
import { CommonActions } from '@react-navigation/native';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, pin?: string) => Promise<void>;
  loginWithPin: (email: string, pin: string) => Promise<void>;
  loginWithBiometrics: (email: string, password?: string) => Promise<void>;
  enablePinLogin: (email: string, password: string, pin: string) => Promise<boolean>;
  enableBiometricLogin: (email: string, password: string) => Promise<boolean>;
  isPinLoginEnabled: (email: string) => Promise<boolean>;
  isBiometricLoginEnabled: (email: string) => Promise<boolean>;
  checkBiometricAvailability: () => Promise<{
    available: boolean;
    biometricType: string;
    enrolled: boolean;
  }>;
  register: (email: string, password: string, displayName: string, pin: string, phoneNumber?: string) => Promise<void>;
  logout: (navigation?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to hash strings
  const hash = async (val: string) => {
    if (typeof val !== 'string') {
      throw new Error('Invalid input to hash. Expected a string.');
    }
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, val);
  };

  // Helper function to create valid SecureStore keys
  const createSecureStoreKey = (prefix: string, value: string): string => {
    // Replace any non-allowed characters with underscores
    const sanitized = value.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    return `${prefix}_${sanitized}`;
  };

  // Check biometric authentication availability
  const checkBiometricAvailability = async () => {
    try {
      // Check if device has biometric hardware
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        console.log('Biometric authentication not available on this device');
        return { available: false, biometricType: 'none', enrolled: false };
      }

      // Check if biometrics are enrolled on the device
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        console.log('No biometrics enrolled on this device');
        return { available: false, biometricType: 'none', enrolled: false };
      }
      
      // Determine the type of biometrics available
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricType = 'Biometrics';
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      }
      
      // Check if biometrics is enabled in app settings
      const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
      const isEnabled = biometricsEnabled === 'true';
      
      return { 
        available: true, 
        biometricType,
        enrolled: isEnabled && enrolled 
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { available: false, biometricType: 'none', enrolled: false };
    }
  };
  
  // Check if biometric login is enabled for an email
  const isBiometricLoginEnabled = async (email: string) => {
    try {
      // First check if biometrics is available on the device
      const { available, enrolled } = await checkBiometricAvailability();
      if (!available || !enrolled) {
        return false;
      }
      
      // Then check if it's enabled in the app settings
      const enabledKey = createSecureStoreKey('biometrics_enabled', email.toLowerCase());
      const value = await SecureStore.getItemAsync(enabledKey);
      return value === 'true';
    } catch (error) {
      console.error('Error checking biometric login status:', error);
      return false;
    }
  };

  // Enable biometric login by storing credentials securely
  const enableBiometricLogin = async (email: string, password: string) => {
    try {
      // Check if biometrics is available
      const { available, enrolled } = await checkBiometricAvailability();
      if (!available) {
        console.log('Biometrics not available');
        return false;
      }
      
      // Store the credentials securely
      const credentialsKey = createSecureStoreKey('biometric_credentials', email.toLowerCase());
      
      // Store the credentials securely
      await SecureStore.setItemAsync(
        credentialsKey,
        JSON.stringify({ email, password })
      );
      
      // Store the fact that biometric login is enabled both globally and for this specific user
      await SecureStore.setItemAsync('biometrics_enabled', 'true');
      const enabledKey = createSecureStoreKey('biometrics_enabled', email.toLowerCase());
      await SecureStore.setItemAsync(enabledKey, 'true');
      
      console.log('Biometric login successfully enabled', email);
      return true;
    } catch (error) {
      console.error('Failed to enable biometric login:', error);
      throw new Error('failed-to-enable-biometrics');
    }
  };

  // Enable PIN login by storing credentials securely
  const enablePinLogin = async (email: string, password: string, pin: string) => {
    try {
      // Hash the PIN for secure storage
      const hashedPin = await hash(pin);
      
      // Create secure keys
      const credentialsKey = createSecureStoreKey('pin_credentials', hashedPin);
      const enabledKey = createSecureStoreKey('pin_enabled', email.toLowerCase());
      
      // Store the credentials securely associated with this PIN
      await SecureStore.setItemAsync(
        credentialsKey,
        JSON.stringify({ email, password })
      );
      
      // Store the fact that PIN login is enabled both globally and for this specific user
      await SecureStore.setItemAsync('pin_enabled', 'true');
      await SecureStore.setItemAsync(enabledKey, 'true');
      
      // Reset PIN fail count
      await SecureStore.setItemAsync('pin_fail_count', '0');
      
      console.log("PIN login enabled for", email);
      return true;
    } catch (error) {
      console.error("Failed to enable PIN login:", error);
      throw new Error('failed-to-enable-pin');
    }
  };
  
  // Check if PIN login is enabled for an email
  const isPinLoginEnabled = async (email: string) => {
    try {
      const enabledKey = createSecureStoreKey('pin_enabled', email.toLowerCase());
      const value = await SecureStore.getItemAsync(enabledKey);
      return value === 'true';
    } catch (error) {
      console.error("Error checking PIN login status:", error);
      return false;
    }
  };

  // Login with biometrics - improved to handle new device authentication
  const loginWithBiometrics = async (email: string, password?: string) => {
    try {
      // If password is provided, do a direct login
      if (password) {
        console.log("Password provided, doing direct login");
        await signInWithEmailAndPassword(auth, email, password);
        
        // After successful login with password on a new device,
        // store the credentials for future biometric use if biometrics is available
        const { available } = await checkBiometricAvailability();
        if (available) {
          const credentialsKey = createSecureStoreKey('biometric_credentials', email.toLowerCase());
          await SecureStore.setItemAsync(
            credentialsKey,
            JSON.stringify({ email, password })
          );
        }
        
        return;
      }
      
      console.log("Attempting biometric login for", email);
      
      // Retrieve the credentials associated with this email
      const credentialsKey = createSecureStoreKey('biometric_credentials', email.toLowerCase());
      const credentialsJson = await SecureStore.getItemAsync(credentialsKey);
      
      if (!credentialsJson) {
        console.log("No credentials found for this email");
        throw new Error('credentials-not-found');
      }
      
      // Parse credentials
      const credentials = JSON.parse(credentialsJson);
      
      // Verify the email matches what we expect (additional security check)
      if (credentials.email.toLowerCase() !== email.toLowerCase()) {
        console.log("Email mismatch in stored credentials");
        throw new Error('email-mismatch');
      }
      
      console.log("Credentials retrieved, logging in with Firebase");
      
      // Use the stored credentials to authenticate with Firebase
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      
      console.log("Biometric login successful");
    } catch (error) {
      console.error("Biometric login failed:", error);
      throw error;
    }
  };

  // Login with PIN only
  const loginWithPin = async (email: string, pin: string) => {
    try {
      console.log("Attempting PIN-only login for", email);
      
      // Hash the PIN to find associated credentials
      const hashedPin = await hash(pin);
      
      // Create secure key
      const credentialsKey = createSecureStoreKey('pin_credentials', hashedPin);
      
      // Retrieve the credentials associated with this PIN
      const credentialsJson = await SecureStore.getItemAsync(credentialsKey);
      
      if (!credentialsJson) {
        console.log("No credentials found for this PIN");
        throw new Error('invalid-pin');
      }
      
      // Parse credentials
      const credentials = JSON.parse(credentialsJson);
      
      // Verify the email matches what we expect (additional security check)
      if (credentials.email.toLowerCase() !== email.toLowerCase()) {
        console.log("Email mismatch in stored credentials");
        throw new Error('email-mismatch');
      }
      
      console.log("Credentials retrieved, logging in with Firebase");
      
      // Use the stored credentials to authenticate with Firebase
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      
      console.log("Login successful");
    } catch (error) {
      console.error("PIN login failed:", error);
      
      // Handle different error types
      if (error instanceof Error) {
        if (error.message.includes('invalid-pin') || error.message.includes('email-mismatch')) {
          throw error;
        } else {
          console.error("Firebase auth error during PIN login:", error);
          throw new Error('auth-failed');
        }
      }
      
      throw error;
    }
  };

  // Standard login (with optional PIN setup) - enhanced for new device handling
  const login = async (email: string, password: string, pin?: string) => {
    try {
      // Regular Firebase authentication
      await signInWithEmailAndPassword(auth, email, password);
      
      // If PIN is provided, enable PIN login for future
      if (pin && pin.length === 4) {
        await enablePinLogin(email, password, pin);
      }
      
      // Store user credentials for easier access
      await SecureStore.setItemAsync('has_stored_credentials', 'true');
      await SecureStore.setItemAsync('user_email', email);
      
      // Check if we have user's display name in Firestore and store it
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (userDoc.exists() && userDoc.data().displayName) {
        await SecureStore.setItemAsync('user_display_name', userDoc.data().displayName);
      }
      
      // Check if biometrics is available on this device for future setup
      const { available } = await checkBiometricAvailability();
      if (available) {
        // Store this for potential later setup, but don't enable automatically 
        // This will help with the prompt after login with password
        const bioCheckKey = createSecureStoreKey('bio_available', email.toLowerCase());
        await SecureStore.setItemAsync(bioCheckKey, 'true');
      }
      
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string, pin: string, phoneNumber?: string) => {
    try {
      // First check if a user with this email or phone already exists
      if (phoneNumber) {
        const { exists, field } = await checkUserExists(email, phoneNumber);
        if (exists) {
          throw new Error(`A user with this ${field} already exists. Please use a different ${field}.`);
        }
      }
      
      // Create the user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Hash the PIN for secure storage
      const hashedPin = await hash(pin);
      
      // Store user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        phone: phoneNumber, // Store phone number
        pin: hashedPin,
        createdAt: new Date()
      });
      
      // Enable PIN login for the future
      await enablePinLogin(email, password, pin);
      
      // Store basic user info in SecureStore for quick access
      await SecureStore.setItemAsync('has_stored_credentials', 'true');
      await SecureStore.setItemAsync('user_email', email);
      await SecureStore.setItemAsync('user_display_name', displayName);
      if (phoneNumber) {
        await SecureStore.setItemAsync('user_phone', phoneNumber);
      }
      
      // Check if biometrics is available and user has opted in
      const { available } = await checkBiometricAvailability();
      if (available) {
        // Don't automatically enable biometrics, but mark as available
        const bioCheckKey = createSecureStoreKey('bio_available', email.toLowerCase());
        await SecureStore.setItemAsync(bioCheckKey, 'true');
        
        // Prompt will be shown separately for biometric setup
      }
      
      return;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async (navigation?: any) => {
    try {
      await signOut(auth);
      
      // Don't clear stored credentials on logout, just redirect to PIN entry screen
      // This allows users to easily log back in with PIN/biometrics
      
      // If navigation is provided, navigate to PIN entry screen
      if (navigation) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'PINEntryScreen' }],
          })
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        loginWithPin,
        loginWithBiometrics,
        enablePinLogin,
        enableBiometricLogin,
        isPinLoginEnabled,
        isBiometricLoginEnabled,
        checkBiometricAvailability,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};