import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';
import { Platform } from 'react-native';
import * as Keychain from 'react-native-keychain';
import * as LocalAuthentication from 'expo-local-authentication';
import DeviceInfo from 'react-native-device-info';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

// Firebase collections
const USERS_COLLECTION = 'users';
const PINS_COLLECTION = 'user_pins';
const SUPPORT_TICKETS_COLLECTION = 'support_tickets';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  MONTHLY: 'pro_monthly',
  ANNUAL: 'pro_annual',
  LIFETIME: 'pro_lifetime'
};

/**
 * Interface types for various data objects
 */
export interface ProfileData {
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface SupportMessageData {
  userId: string;
  subject: string;
  message: string;
  email: string;
  name: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  message?: string;
  error?: any;
}

// Helper function to get the current user
const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Update user profile information
 * @param userId User ID
 * @param profileData Profile data object containing name, email, phoneNumber
 */
export const updateUserProfile = async (userId: string, profileData: ProfileData): Promise<void> => {
  try {
    const { name, email, phoneNumber } = profileData;
    
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Update profile in Firebase Auth
    await updateProfile(user, {
      displayName: name,
      photoURL: profileData.photoURL
    });
    
    // Update email if it has changed
    if (email && email !== user.email) {
      await updateEmail(user, email);
    }
    
    // Update Firestore user document
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      name,
      phoneNumber,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    return;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Reset user's password
 * @param userId User ID
 * @param currentPassword Current password
 * @param newPassword New password
 */
export const resetUserPassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  try {
    const user = getCurrentUser();
    
    if (!user || !user.email) {
      throw new Error('User not authenticated or email not available');
    }
    
    // Re-authenticate the user
    const credential = EmailAuthProvider.credential(
      user.email, 
      currentPassword
    );
    
    await reauthenticateWithCredential(user, credential);
    
    // Update password in Firebase Auth
    await updatePassword(user, newPassword);
    
    // Update password updated timestamp in Firestore
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      passwordUpdatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    return;
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
};

/**
 * Reset user's PIN
 * @param userId User ID
 * @param currentPin Current PIN
 * @param newPin New PIN
 */
export const resetUserPIN = async (
  userId: string,
  currentPin: string,
  newPin: string
): Promise<void> => {
  try {
    // Get the stored PIN for verification
    const pinDoc = await firestore().collection(PINS_COLLECTION).doc(userId).get();
    
    if (!pinDoc.exists) {
      throw new Error('PIN not found');
    }
    
    const storedPinHash = pinDoc.data()?.pinHash;
    
    // Verify current PIN (in a real app, you'd use a secure hash comparison)
    // This is simplified for the example
    if (storedPinHash !== hashPin(currentPin)) {
      const error = new Error('Current PIN is incorrect');
      error.code = 'auth/wrong-pin';
      throw error;
    }
    
    // Hash and store the new PIN
    const newPinHash = hashPin(newPin);
    
    await firestore().collection(PINS_COLLECTION).doc(userId).update({
      pinHash: newPinHash,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    // Store PIN securely in the device keychain for biometric auth
    await Keychain.setGenericPassword('pin_key', newPin, {
      service: 'user_pin',
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
    });
    
    return;
  } catch (error) {
    console.error('Error resetting user PIN:', error);
    throw error;
  }
};

/**
 * Simple PIN hashing function (for example purposes)
 * In a real app, use a secure crypto library
 */
const hashPin = (pin: string): string => {
  // This is a placeholder - use a proper secure hash in production
  return `hashed_${pin}_with_salt`;
};

/**
 * Update Face ID settings
 * @param userId User ID
 * @param enabled Whether Face ID is enabled
 */
export const updateFaceIdSettings = async (
  userId: string,
  enabled: boolean
): Promise<void> => {
  try {
    // Check if device supports Face ID
    const supportedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const faceIdSupported = supportedBiometrics.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    
    if (enabled && !faceIdSupported) {
      throw new Error('Face ID is not supported on this device');
    }
    
    // Update Face ID setting in Firestore
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      faceIdEnabled: enabled,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    return;
  } catch (error) {
    console.error('Error updating Face ID settings:', error);
    throw error;
  }
};

/**
 * Update notification settings
 * @param userId User ID
 * @param enabled Whether notifications are enabled
 */
export const updateNotificationSettings = async (
  userId: string,
  enabled: boolean
): Promise<void> => {
  try {
    // Update notification settings in Firestore
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      notificationsEnabled: enabled,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    // Register or unregister from push notifications
    // Implementation depends on the push notification service used
    
    return;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
};

/**
 * Upload user profile image
 * @param userId User ID
 * @param uri Image URI
 */
export const uploadProfileImage = async (
  userId: string,
  uri: string
): Promise<string> => {
  try {
    const reference = storage().ref(`profile_images/${userId}`);
    
    // Upload the file
    await reference.putFile(uri);
    
    // Get download URL
    const url = await reference.getDownloadURL();
    
    // Update user document with new image URL
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      photoURL: url,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    return url;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Send a support message/ticket
 * @param messageData Support message data
 */
export const sendSupportMessage = async (
  messageData: SupportMessageData
): Promise<void> => {
  try {
    const { userId, subject, message, email, name } = messageData;
    
    // Get device information for troubleshooting
    const deviceModel = await DeviceInfo.getModel();
    const deviceOS = Platform.OS;
    const osVersion = Platform.Version.toString();
    const appVersion = await DeviceInfo.getVersion();
    
    // Create a support ticket in Firestore
    const ticketData = {
      userId,
      subject,
      message,
      email,
      name,
      status: 'new',
      createdAt: firestore.FieldValue.serverTimestamp(),
      deviceInfo: {
        model: deviceModel,
        os: deviceOS,
        osVersion: osVersion,
        appVersion: appVersion
      }
    };
    
    // Add the support ticket to Firestore
    const ticketRef = await firestore()
      .collection(SUPPORT_TICKETS_COLLECTION)
      .add(ticketData);
    
    // Send email notification to support team using Cloud Function
    await functions().httpsCallable('sendSupportNotification')({
      ticketId: ticketRef.id,
      ...ticketData
    });
    
    return;
  } catch (error) {
    console.error('Error sending support message:', error);
    throw error;
  }
};

/**
 * Get support ticket history for a user
 * @param userId User ID
 */
export const getSupportTickets = async (userId: string) => {
  try {
    const tickets = await firestore()
      .collection(SUPPORT_TICKETS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return tickets.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting support tickets:', error);
    throw error;
  }
};

/**
 * Subscribe to a pro plan
 * @param userId User ID
 * @param planId Plan ID (optional, defaults to monthly)
 */
export const subscribeToProPlan = async (
  userId: string,
  planId: string = SUBSCRIPTION_PLANS.MONTHLY
): Promise<SubscriptionResult> => {
  try {
    // Get user details
    const userDoc = await firestore().collection(USERS_COLLECTION).doc(userId).get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    const userData = userDoc.data();
    
    // Check if user already has an active subscription
    const existingSubscription = await firestore()
      .collection(SUBSCRIPTIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get();
    
    if (!existingSubscription.empty) {
      return {
        success: false,
        message: 'You already have an active subscription'
      };
    }
    
    // Create a payment intent using Cloud Function
    const createPaymentIntentResult = await functions().httpsCallable('createSubscriptionPaymentIntent')({
      userId,
      planId,
      email: userData?.email
    });
    
    const { 
      paymentIntentClientSecret, 
      ephemeralKey, 
      customer 
    } = createPaymentIntentResult.data;
    
    if (!paymentIntentClientSecret) {
      return {
        success: false,
        message: 'Failed to create payment intent'
      };
    }
    
    // Initialize the payment sheet
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'BuddyPay',
      customerId: customer,
      customerEphemeralKeySecret: ephemeralKey,
      paymentIntentClientSecret,
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: userData?.name || '',
        email: userData?.email || ''
      }
    });
    
    if (initError) {
      console.error('Error initializing payment sheet:', initError);
      return {
        success: false,
        message: 'Error preparing payment system',
        error: initError
      };
    }
    
    // Present the payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      console.error('Error presenting payment sheet:', presentError);
      
      // Handle user cancellation differently
      if (presentError.code === 'Canceled') {
        return {
          success: false,
          message: 'Payment canceled'
        };
      }
      
      return {
        success: false,
        message: presentError.message || 'Payment failed',
        error: presentError
      };
    }
    
    // Payment was successful, create subscription record
    const subscriptionRef = await firestore().collection(SUBSCRIPTIONS_COLLECTION).add({
      userId,
      planId,
      status: 'active',
      startDate: firestore.FieldValue.serverTimestamp(),
      endDate: calculateEndDate(planId),
      paymentMethod: 'stripe',
      autoRenew: true,
      createdAt: firestore.FieldValue.serverTimestamp()
    });
    
    // Update user document with subscription info
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      isPro: true,
      currentSubscription: subscriptionRef.id,
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      subscriptionId: subscriptionRef.id
    };
  } catch (error) {
    console.error('Error subscribing to pro plan:', error);
    return {
      success: false,
      message: 'An unexpected error occurred',
      error
    };
  }
};

/**
 * Cancel a subscription
 * @param userId User ID
 * @param subscriptionId Subscription ID
 */
export const cancelSubscription = async (
  userId: string,
  subscriptionId: string
): Promise<SubscriptionResult> => {
  try {
    // Get subscription details
    const subscriptionDoc = await firestore()
      .collection(SUBSCRIPTIONS_COLLECTION)
      .doc(subscriptionId)
      .get();
    
    if (!subscriptionDoc.exists) {
      return {
        success: false,
        message: 'Subscription not found'
      };
    }
    
    const subscriptionData = subscriptionDoc.data();
    
    // Verify the subscription belongs to the user
    if (subscriptionData?.userId !== userId) {
      return {
        success: false,
        message: 'Unauthorized operation'
      };
    }
    
    // Call Cloud Function to cancel subscription with payment provider
    await functions().httpsCallable('cancelSubscription')({
      subscriptionId,
      userId
    });
    
    // Update subscription status
    await firestore().collection(SUBSCRIPTIONS_COLLECTION).doc(subscriptionId).update({
      status: 'canceled',
      autoRenew: false,
      canceledAt: firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Subscription cancelled successfully'
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      message: 'Failed to cancel subscription',
      error
    };
  }
};

/**
 * Get subscription details
 * @param userId User ID
 */
export const getSubscriptionDetails = async (userId: string) => {
  try {
    const subscriptions = await firestore()
      .collection(SUBSCRIPTIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (subscriptions.empty) {
      return null;
    }
    
    const subscription = subscriptions.docs[0];
    return {
      id: subscription.id,
      ...subscription.data()
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    throw error;
  }
};

/**
 * Calculate subscription end date based on plan
 * @param planId Plan ID
 */
const calculateEndDate = (planId: string) => {
  const now = new Date();
  
  switch (planId) {
    case SUBSCRIPTION_PLANS.MONTHLY:
      return firestore.Timestamp.fromDate(
        new Date(now.setMonth(now.getMonth() + 1))
      );
    case SUBSCRIPTION_PLANS.ANNUAL:
      return firestore.Timestamp.fromDate(
        new Date(now.setFullYear(now.getFullYear() + 1))
      );
    case SUBSCRIPTION_PLANS.LIFETIME:
      return null; // No end date for lifetime subscriptions
    default:
      return firestore.Timestamp.fromDate(
        new Date(now.setMonth(now.getMonth() + 1))
      );
  }
};