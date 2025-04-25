import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Vibration,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../services/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

type PINEntryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PINEntryScreen'>;

const PINEntryScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PINEntryScreenNavigationProp>();
  const { loginWithPin, loginWithBiometrics, login, enableBiometricLogin, enablePinLogin } = useAuth();
  
  // State
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [pinFailCount, setPinFailCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  
  // Add states for the Pin Setup Modal
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');
  const [pinSetupStep, setPinSetupStep] = useState(1); // 1 = enter PIN, 2 = confirm PIN
  
  // Add states for the Forgot Password Modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
  // Animation
  const [shake] = useState(new Animated.Value(0));
  
  // Refs
  const passwordInputRef = useRef<TextInput>(null);
  const forgotPasswordEmailRef = useRef<TextInput>(null);
  
  // Add these state variables for no credentials modal
  const [showNoCredentialsModal, setShowNoCredentialsModal] = useState(false);
  const [noCredentialsEmail, setNoCredentialsEmail] = useState('');
  const [noCredentialsPassword, setNoCredentialsPassword] = useState('');
  const [noCredentialsError, setNoCredentialsError] = useState('');
  const [showNoCredentialsPassword, setShowNoCredentialsPassword] = useState(false);

  // Add refs for no credentials modal
  const noCredentialsEmailInputRef = useRef<TextInput>(null);
  const noCredentialsPasswordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const checkBio = async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      console.log("Biometrics - Hardware:", hardware, "Enrolled:", enrolled, "Types:", types);
    };
    checkBio();
  }, []);
  
  useEffect(() => {
// Updated loadUserDataAndTriggerBiometrics function with better error handling and delays
const loadUserDataAndTriggerBiometrics = async () => {
  try {
    console.log("Starting to load user data and check biometrics...");
    
    // Load stored credentials
    const storedEmail = await SecureStore.getItemAsync('user_email');
    const storedName = await SecureStore.getItemAsync('user_display_name');
    const failCount = await SecureStore.getItemAsync('pin_fail_count');
    const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
    
    console.log(`Stored email: ${storedEmail ? 'exists' : 'not found'}, Biometrics enabled: ${biometricsEnabled}`);
    
    if (!storedEmail) {
      // Show no credentials modal instead of deregistering
      setShowNoCredentialsModal(true);
      return;
    }
    
    if (storedEmail) {
      setEmail(storedEmail);
      setForgotPasswordEmail(storedEmail); // Pre-fill forgot password email
    }
    
    if (storedName) {
      setUserName(storedName);
    }
    
    if (failCount) {
      setPinFailCount(parseInt(failCount, 10));
    }
    
    // First check if device has biometric capabilities
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) {
      console.log("Device doesn't support biometric authentication");
      return;
    }
    
    // For iOS, ensure Face ID permissions are ready - this helps avoid the "missing_usage_description" error
    if (Platform.OS === 'ios') {
      console.log("iOS device detected, ensuring Face ID permissions are available");
      try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        console.log("Supported authentication types:", types);
        
        // Wait a bit longer on iOS to ensure permissions are fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (permError) {
        console.error("Error checking Face ID permissions:", permError);
        return;
      }
    }
    
    // Check biometric capability and try authentication
    const biometricsCheck = await checkBiometricAvailability();
    console.log("Biometrics check result:", biometricsCheck);
    
    // Only proceed with biometric login if explicitly enabled by the user
    if (biometricsCheck.available && biometricsCheck.enrolled && biometricsEnabled === 'true') {
      setBiometricType(biometricsCheck.biometricType);
      console.log(`Biometric type set to: ${biometricsCheck.biometricType}`);
      
      // Attempt biometric authentication with a longer delay for iOS Face ID
      const biometricDelay = Platform.OS === 'ios' ? 1500 : 800;
      console.log(`Setting up biometric authentication with ${biometricDelay}ms delay`);
      
      setTimeout(() => {
        console.log("Triggering biometric prompt");
        setShowBiometricPrompt(true);
        attemptBiometricLogin(storedEmail);
      }, biometricDelay);
    } else {
      console.log("Biometrics available but not enabled, or not available");
    }
  } catch (error) {
    console.error('Error during initial setup:', error);
  }
};
    
    loadUserDataAndTriggerBiometrics();
  }, []);

  // Handle PIN Setup Modal
  const handleOpenPinSetupModal = () => {
    setNewPin('');
    setConfirmPin('');
    setPinSetupError('');
    setPinSetupStep(1);
    setShowPinSetupModal(true);
  };

  const handlePinSetupNumberPress = (num: number) => {
    if (pinSetupStep === 1) {
      // Step 1: Enter new PIN
      if (newPin.length < 4) {
        setNewPin(prev => {
          const updated = prev + num;
          if (updated.length === 4) {
            // Move to confirm PIN step automatically
            setPinSetupStep(2);
          }
          return updated;
        });
      }
    } else {
      // Step 2: Confirm PIN
      if (confirmPin.length < 4) {
        setConfirmPin(prev => {
          const updated = prev + num;
          if (updated.length === 4) {
            // Check PIN match automatically
            setTimeout(() => validateAndSetPin(updated), 300);
          }
          return updated;
        });
      }
    }
  };
  
  const handlePinSetupDelete = () => {
    if (pinSetupStep === 1) {
      setNewPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };
  
  const validateAndSetPin = async (confirmedPin: string = confirmPin) => {
    if (newPin !== confirmedPin) {
      setPinSetupError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get the stored credentials or use the ones from login
      const userEmail = email || noCredentialsEmail;
      const userPassword = noCredentialsPassword; // Only available from recent login
      
      if (!userEmail || !userPassword) {
        setPinSetupError('Missing credentials. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Enable PIN login for this device
      await enablePinLogin(userEmail, userPassword, newPin);
      
      // Reset states
      setNewPin('');
      setConfirmPin('');
      setPinSetupError('');
      setShowPinSetupModal(false);
      setLoading(false);
      
      // Show success message and wait for user acknowledgment before showing biometric setup
      Alert.alert(
        'PIN Setup Complete',
        'Your new PIN has been successfully set up.',
        [{ 
          text: 'OK',
          onPress: () => {
            // Only show biometric setup after user acknowledges PIN setup
            setTimeout(() => {
              showBiometricSetupPrompt();
            }, 300);
          }
        }]
      );
      
    } catch (error) {
      console.error('Error setting up PIN:', error);
      setPinSetupError('Failed to set up PIN. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle Forgot PIN (opens password modal)
  const handleForgotPin = () => {
    // Clear password field
    setPassword('');
    setError('');
    setShowPasswordModal(true);
  };
  
  // Handle Forgot Password
  const handleForgotPassword = async () => {
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
    
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordError('Please enter a valid email address.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Send password reset email
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      
      setForgotPasswordSuccess(true);
      setLoading(false);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      setForgotPasswordError('Failed to send password reset email. Please try again.');
      setLoading(false);
    }
  };
  
  // Improved method to handle no credentials submission
  const handleNoCredentialsSubmit = async () => {
    if (!noCredentialsEmail || !noCredentialsPassword) {
      setNoCredentialsError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use regular login method instead of loginWithBiometrics
      await login(noCredentialsEmail, noCredentialsPassword);
      
      // Store credentials
      await SecureStore.setItemAsync('user_email', noCredentialsEmail);
      
      // Get user display name from firebase if available
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.displayName) {
        await SecureStore.setItemAsync('user_display_name', currentUser.displayName);
      }
      
      // Reset error and credential fields
      setNoCredentialsError('');
      setEmail(noCredentialsEmail); // Update the email state to use throughout the app
      
      // Close the modal
      setShowNoCredentialsModal(false);
      setLoading(false);
      
      // Show options to reset PIN or use existing
      Alert.alert(
        'Account Setup',
        'Would you like to set up a new PIN or use your existing PIN?',
        [
          {
            text: 'Set New PIN',
            onPress: () => {
              handleOpenPinSetupModal();
            }
          },
          {
            text: 'Use Existing PIN',
            onPress: () => {
              // After login, show biometric setup option
              setTimeout(() => {
                showBiometricSetupPrompt();
              }, 500);
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('No credentials login error:', error);
      setNoCredentialsError('Invalid credentials. Please try again.');
      setLoading(false);
    }
  };
  
  // New method to prompt for biometric setup after login
  const showBiometricSetupPrompt = async () => {
    try {
      const biometricsCheck = await checkBiometricAvailability();
      
      if (biometricsCheck.available) {
        Alert.alert(
          'Enable Biometric Login',
          `Would you like to enable ${biometricsCheck.biometricType} login for faster access?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  const storedEmail = await SecureStore.getItemAsync('user_email');
                  const password = noCredentialsPassword;
                  
                  if (storedEmail && password) {
                    // Enable biometric login using the provided credentials
                    await enableBiometricLogin(storedEmail, password);
                    await SecureStore.setItemAsync('biometrics_enabled', 'true');
                    
                    Alert.alert(
                      'Success',
                      `${biometricsCheck.biometricType} login enabled successfully!`,
                      [{ text: 'OK' }]
                    );
                  }
                } catch (error) {
                  console.error('Error enabling biometrics:', error);
                  Alert.alert(
                    'Error',
                    'Failed to enable biometric login. Please try again later.',
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error in biometric setup prompt:', error);
    }
  };
  
  // Reset PIN fail count on successful login
  const resetPinFailCount = async () => {
    try {
      await SecureStore.setItemAsync('pin_fail_count', '0');
      setPinFailCount(0);
    } catch (error) {
      console.error('Error resetting PIN fail count:', error);
    }
  };
  
  // Increment PIN fail count
  const incrementPinFailCount = async () => {
    try {
      const newCount = pinFailCount + 1;
      await SecureStore.setItemAsync('pin_fail_count', newCount.toString());
      setPinFailCount(newCount);
      
      // If failed 5 times, notify user but don't force password modal
      if (newCount >= 5) {
        Alert.alert(
          'Too Many Attempts',
          'You have made too many incorrect PIN attempts. Consider using your password to log in.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error incrementing PIN fail count:', error);
    }
  };

  // Check biometric authentication availability
  const checkBiometricAvailability = async () => {
    try {
      // Check if device supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        console.log('Biometric authentication hardware not available on this device');
        return { 
          available: false, 
          biometricType: 'none',
          enrolled: false 
        };
      }
  
      // Check for necessary permissions on iOS for Face ID
      if (Platform.OS === 'ios') {
        try {
          // This will throw if permissions aren't configured correctly
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        } catch (permError) {
          console.error('iOS Face ID permission error:', permError);
          return { 
            available: false, 
            biometricType: 'none',
            enrolled: false,
            error: 'missing_permissions'
          };
        }
      }
  
      // Check if biometrics is enrolled on the device
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        console.log('No biometrics enrolled on this device');
        return { 
          available: false, 
          biometricType: 'none',
          enrolled: false 
        };
      }
      
      // Determine biometric type
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricType = 'Biometrics';
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      }
  
      // Check if biometrics is enabled in app settings
      const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
      console.log('Biometrics enabled status:', biometricsEnabled);
      
      return { 
        available: true, 
        biometricType,
        enrolled: biometricsEnabled === 'true'
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { 
        available: false, 
        biometricType: 'none',
        enrolled: false 
      };
    }
  };
  

  // Attempt biometric login
 // Modified attemptBiometricLogin function to improve iOS Face ID handling
// Fix for the attemptBiometricLogin function to better handle iOS Face ID

const attemptBiometricLogin = async (userEmail: string) => {
  try {
    setBiometricLoading(true);
    setError('');
    
    // Get the appropriate biometric type
    const biometryInfo = await checkBiometricAvailability();
    console.log(`Starting biometric login process for ${userEmail} with type: ${biometryInfo.biometricType}`);
    
    if (!biometryInfo.available) {
      console.log('Biometrics not available on this device');
      Alert.alert(
        'Biometric Login Unavailable',
        'Biometric authentication is not available on this device. Please use your PIN instead.',
        [{ text: 'OK' }]
      );
      setBiometricLoading(false);
      setShowBiometricPrompt(false);
      return;
    }
    
    // Special handling for first-time setup
    if (!biometryInfo.enrolled) {
      console.log('Biometrics not enrolled in the app yet');
      
      // If the user has just logged in with password, offer to set up biometrics
      if (noCredentialsPassword) {
        const setupBiometrics = await Alert.alert(
          'Set Up Biometric Login',
          `Would you like to enable ${biometryInfo.biometricType} login for faster access next time?`,
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: () => {
                setBiometricLoading(false);
                setShowBiometricPrompt(false);
              }
            },
            {
              text: 'Enable',
              onPress: async () => {
                try {
                  // Enable biometric login using the provided credentials
                  await enableBiometricLogin(userEmail, noCredentialsPassword);
                  await SecureStore.setItemAsync('biometrics_enabled', 'true');
                  
                  // Let the user know biometrics were enabled successfully
                  Alert.alert(
                    'Success',
                    `${biometryInfo.biometricType} login enabled successfully!`,
                    [{ text: 'OK' }]
                  );
                  
                  // Continue with PIN entry
                  setBiometricLoading(false);
                  setShowBiometricPrompt(false);
                } catch (error) {
                  console.error('Error enabling biometrics during login:', error);
                  Alert.alert(
                    'Error',
                    'Failed to enable biometric login. Please try again later.',
                    [{ text: 'OK' }]
                  );
                  setBiometricLoading(false);
                  setShowBiometricPrompt(false);
                }
              }
            }
          ]
        );
        return;
      } else {
        // Just notify the user that biometric login hasn't been set up yet
        Alert.alert(
          'Biometric Login Not Set Up',
          'Biometric authentication has not been enabled for your account. Please use your PIN.',
          [{ text: 'OK' }]
        );
        setBiometricLoading(false);
        setShowBiometricPrompt(false);
        return;
      }
    }
    
    // Platform-specific authentication options
    const authOptions = {
      promptMessage: `Login with ${biometryInfo.biometricType}`,
      cancelLabel: 'Use PIN Instead',
      disableDeviceFallback: true,
      requireConfirmation: false, // Reduce friction
      fallbackLabel: '', // Prevent automatic fallback to passcode on iOS
    };
    
    // Wait a moment on iOS before showing Face ID prompt to ensure UI is ready
    if (Platform.OS === 'ios' && biometryInfo.biometricType === 'Face ID') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Calling authenticateAsync with options:', JSON.stringify(authOptions));
    const result = await LocalAuthentication.authenticateAsync(authOptions);
    console.log('Authentication result:', JSON.stringify(result));
    
    if (result.success) {
      console.log('Biometric authentication successful, performing login...');
      try {
        // Perform biometric login with stored credentials
        await loginWithBiometrics(userEmail);
        console.log('Biometric login process complete');
        
        // Reset PIN fail count on successful login
        await resetPinFailCount();
        
        // Navigate to dashboard
        navigation.replace('MainDashboard', { screen: 'Friends' });
      } catch (error) {
        console.error('Error during biometric login process:', error);
        setError('Biometric login failed. Please use your PIN.');
        Vibration.vibrate(400);
      }
    } else {
      console.log('Biometric authentication unsuccessful:', result.error);
      
      // Don't show error for iOS Face ID missing permissions - this is a system issue
      if (result.error === 'missing_usage_description') {
        console.error('Face ID permission missing in Info.plist. This should not happen with proper configuration.');
        setError('Face ID is not available. Please use your PIN.');
      } 
      // Only show an alert for user cancellation, not for system cancellations
      else if (result.error === 'user_cancel') {
        Alert.alert(
          'Authentication Cancelled',
          'Biometric login was cancelled. Please use your PIN.',
          [{ text: 'OK' }]
        );
      }
      // For lockouts, provide appropriate messaging
      else if (result.error === 'lockout') {
        Alert.alert(
          'Biometric Login Locked',
          'Too many failed attempts. Please use your PIN instead.',
          [{ text: 'OK' }]
        );
      }
      // For app cancellations (Face ID disappearing quickly), just fall back to PIN silently
    }
  } catch (error) {
    console.error('Unexpected error in biometric authentication:', error);
    setError('Authentication error. Please use your PIN.');
  } finally {
    // Always clean up the biometric prompt state
    setBiometricLoading(false);
    setShowBiometricPrompt(false);
  }
};

  

  // Handle shake animation for incorrect PIN
  const shakeAnimation = () => {
    Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  // Handle number press
  const handleNumberPress = (num: number) => {
    if (pin.length < 4 && !loading && !biometricLoading) {
      setPin(prevPin => {
        const newPin = prevPin + num;
        // If this completes the PIN (length = 4), trigger submission
        if (newPin.length === 4) {
          setTimeout(() => handlePinSubmit(newPin), 300);
        }
        return newPin;
      });
    }
  };

  // Handle delete press
  const handleDelete = () => {
    if (!loading && !biometricLoading) {
      setPin(prevPin => prevPin.slice(0, -1));
    }
  };

  // Handle clear press
  const handleClear = () => {
    if (!loading && !biometricLoading) {
      setPin('');
    }
  };

  // Handle PIN submission
  const handlePinSubmit = async (pinToSubmit: string = pin) => {
    if (loading || biometricLoading) return;
    
    setLoading(true);
    setError('');
    
    try {
      if (!email) {
        throw new Error('No email found. Please log in with password.');
      }
      
      // Attempt PIN login
      await loginWithPin(email, pinToSubmit);
      
      // Reset PIN fail count on successful login
      await resetPinFailCount();
      
      // Success - navigate to dashboard
      navigation.replace('MainDashboard', { screen: 'Friends' });
    } catch (error) {
      console.error('PIN login error:', error);
      
      // Handle error
      setPin('');
      shakeAnimation();
      
      // Increment fail counter
      await incrementPinFailCount();
      
      if (error instanceof Error) {
        if (error.message.includes('invalid-pin')) {
          setError('Incorrect PIN. Please try again.');
        } else {
          setError('Something went wrong. Please try again or use password.');
        }
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle password login
  const handlePasswordLogin = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Use loginWithBiometrics which can accept both token-based and password-based auth
      await loginWithBiometrics(email, password);
      
      // Reset PIN fail count on successful login
      await resetPinFailCount();
      
      setShowPasswordModal(false);
      navigation.replace('MainDashboard', { screen: 'Friends' });
    } catch (error) {
      console.error('Password login error:', error);
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password')) {
          setError('Incorrect password. Please try again.');
        } else {
          setError('Login failed. Please check your credentials.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle deregister account
  const handleDeregister = () => {
    Alert.alert(
      'Deregister Account',
      'Are you sure you want to deregister this device? You will need to log in again with your email and password.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Deregister',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear stored credentials
              await SecureStore.deleteItemAsync('has_stored_credentials');
              await SecureStore.deleteItemAsync('user_email');
              await SecureStore.deleteItemAsync('user_display_name');
              await SecureStore.deleteItemAsync('biometrics_enabled');
              await SecureStore.deleteItemAsync('pin_enabled');
              await SecureStore.deleteItemAsync('pin_fail_count');
              
              // Show no credentials modal
              setShowNoCredentialsModal(true);
            } catch (error) {
              console.error('Error deregistering device:', error);
              Alert.alert('Error', 'Failed to deregister device. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Render PIN dots
  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pin.length ? styles.pinDotFilled : {}
          ]}
        />
      );
    }
    return dots;
  };
  
  // Render PIN setup dots
  const renderPinSetupDots = () => {
    const currentPin = pinSetupStep === 1 ? newPin : confirmPin;
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinSetupDot,
            i < currentPin.length ? styles.pinSetupDotFilled : {}
          ]}
        />
      );
    }
    return dots;
  };

  // Show biometric login dialog
  const showBiometricLogin = async () => {
    if (!email) return;
    
    // First check if biometrics is available before attempting
    const biometricsCheck = await checkBiometricAvailability();
    
    if (!biometricsCheck.available || !biometricsCheck.enrolled) {
      Alert.alert(
        'Biometric Login Unavailable',
        'Biometric authentication is not available or not set up on this device. Please use your PIN instead.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowBiometricPrompt(true);
    setBiometricLoading(true);
    attemptBiometricLogin(email);
  };

  // Render number pad button with letters
  const renderNumberButton = (num: number, letters: string = '') => {
    return (
      <TouchableOpacity
        style={styles.numberButton}
        onPress={() => handleNumberPress(num)}
        disabled={loading || biometricLoading}
      >
        <Text style={styles.numberButtonText}>{num}</Text>
        {letters && <Text style={styles.letterText}>{letters}</Text>}
      </TouchableOpacity>
    );
  };
  
  // Render PIN setup number button
  const renderPinSetupNumberButton = (num: number) => {
    return (
      <TouchableOpacity
      style={[styles.numberButton, styles.pinSetupNumberButton]}
        onPress={() => handlePinSetupNumberPress(num)}
        disabled={loading}
      >
        <Text style={styles.numberButtonText}>{num}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A2E64', '#0055A4', '#0A78DD']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentContainer}>
            {/* User Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Icon name="person" size={50} color="#fff" />
              </View>
            </View>
            
            <Text style={styles.headerText}>Enter Your PIN</Text>
            
            <Animated.View 
              style={[
                styles.pinContainer,
                { transform: [{ translateX: shake }] }
              ]}
            >
              <View style={styles.pinDotsContainer}>
                {renderPinDots()}
              </View>
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </Animated.View>
            
            {/* Password Login Option - Always Visible */}
            <TouchableOpacity 
              style={styles.passwordLoginButton}
              onPress={() => setShowPasswordModal(true)}
              disabled={loading || biometricLoading}
            >
              <Text style={styles.passwordLoginText}>Login with Password</Text>
            </TouchableOpacity>
            
            {/* Biometric Prompt Overlay */}
            {showBiometricPrompt && (
              <View style={styles.biometricOverlay}>
                <View style={styles.biometricPrompt}>
                  <View style={styles.biometricIconContainer}>
                    <Icon 
                      name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} 
                      size={50} 
                      color="#0A6EFF" 
                      style={{opacity: 0.8}}
                    />
                  </View>
                  <Text style={styles.biometricText}>{biometricType}</Text>
                </View>
              </View>
            )}
            
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            ) : (
              <View style={styles.numberPadWrapper}>
                <View style={styles.numberPad}>
                  <View style={styles.numberRow}>
                    {renderNumberButton(1)}
                    {renderNumberButton(2, 'ABC')}
                    {renderNumberButton(3, 'DEF')}
                  </View>
                  <View style={styles.numberRow}>
                    {renderNumberButton(4, 'GHI')}
                    {renderNumberButton(5, 'JKL')}
                    {renderNumberButton(6, 'MNO')}
                  </View>
                  <View style={styles.numberRow}>
                    {renderNumberButton(7, 'PQRS')}
                    {renderNumberButton(8, 'TUV')}
                    {renderNumberButton(9, 'WXYZ')}
                  </View>
                  <View style={styles.numberRow}>
                    <TouchableOpacity
                      style={[styles.numberButton, styles.actionButton]}
                      onPress={showBiometricLogin}
                      disabled={loading || biometricLoading}
                    >
                      <Icon 
                        name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} 
                        size={28} 
                        color="#FFFFFF" 
                      />
                    </TouchableOpacity>
                    {renderNumberButton(0)}
                    <TouchableOpacity
                      style={[styles.numberButton, styles.actionButton]}
                      onPress={handleDelete}
                      disabled={loading || biometricLoading || pin.length === 0}
                    >
                      <Icon name="backspace-outline" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Footer Buttons - Moved up for better spacing */}
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.footerButton}
                    onPress={handleForgotPin}
                  >
                    <Text style={styles.footerButtonText}>Forgot PIN</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.footerButton}
                    onPress={handleDeregister}
                  >
                    <Text style={styles.footerButtonText}>Deregister</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          {/* No Credentials Modal */}
          <Modal
            visible={showNoCredentialsModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowNoCredentialsModal(false);
              navigation.navigate('RegistrationScreen');
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Welcome Back</Text>
                <Text style={styles.modalSubtitle}>Please verify your account to continue</Text>
                
                {/* Email input field - ensuring it's visible */}
                <View style={styles.inputContainer}>
                  <Icon name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={noCredentialsEmailInputRef}
                    style={styles.textInput}
                    placeholder="Email"
                    value={noCredentialsEmail}
                    onChangeText={setNoCredentialsEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => noCredentialsPasswordInputRef.current?.focus()}
                  />
                </View>
                
                {/* Password input with visibility toggle */}
                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={noCredentialsPasswordInputRef}
                    style={styles.textInput}
                    placeholder="Password"
                    value={noCredentialsPassword}
                    onChangeText={setNoCredentialsPassword}
                    secureTextEntry={!showNoCredentialsPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleNoCredentialsSubmit}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowNoCredentialsPassword(!showNoCredentialsPassword)}
                  >
                    <Icon 
                      name={showNoCredentialsPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                
                {noCredentialsError ? (
                  <Text style={styles.errorText}>{noCredentialsError}</Text>
                ) : null}
                
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={[styles.submitButton, loading && styles.buttonDisabled]}
                    onPress={handleNoCredentialsSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Log In</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowNoCredentialsModal(false);
                      navigation.navigate('RegistrationScreen');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Create New Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Password Modal */}
          <Modal
            visible={showPasswordModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPasswordModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Enter Password</Text>
                  <TouchableOpacity
                    onPress={() => setShowPasswordModal(false)}
                    style={styles.closeButton}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalEmailText}>{email}</Text>
                
                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                    onSubmitEditing={handlePasswordLogin}
                    autoFocus={true}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                </View>
                
                {error ? (
                  <View style={styles.modalErrorContainer}>
                    <Icon name="alert-circle-outline" size={16} color="#FF3B30" />
                    <Text style={styles.modalErrorText}>{error}</Text>
                  </View>
                ) : null}
                
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={loading || !password}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Log In</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => {
                    // Switch to forgot password modal instead of navigating
                    setShowPasswordModal(false);
                    setShowForgotPasswordModal(true);
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>
          
          {/* PIN Setup Modal */}
          <Modal
            visible={showPinSetupModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              if (!loading) setShowPinSetupModal(false);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {pinSetupStep === 1 ? 'Set New PIN' : 'Confirm PIN'}
                  </Text>
                  {!loading && (
                    <TouchableOpacity
                      onPress={() => setShowPinSetupModal(false)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.modalSubtitle}>
                  {pinSetupStep === 1 
                    ? 'Please enter a 4-digit PIN' 
                    : 'Please re-enter your PIN to confirm'}
                </Text>
                
                <View style={styles.pinDotsContainer}>
                  {renderPinSetupDots()}
                </View>
                
                {pinSetupError ? (
                  <Text style={styles.errorText}>{pinSetupError}</Text>
                ) : null}
                
                {loading ? (
                  <ActivityIndicator size="large" color="#0A6EFF" style={{marginVertical: 20}} />
                ) : (
                  <View style={styles.pinSetupNumberPad}>
                    <View style={styles.numberRow}>
                      {renderPinSetupNumberButton(1)}
                      {renderPinSetupNumberButton(2)}
                      {renderPinSetupNumberButton(3)}
                    </View>
                    <View style={styles.numberRow}>
                      {renderPinSetupNumberButton(4)}
                      {renderPinSetupNumberButton(5)}
                      {renderPinSetupNumberButton(6)}
                    </View>
                    <View style={styles.numberRow}>
                      {renderPinSetupNumberButton(7)}
                      {renderPinSetupNumberButton(8)}
                      {renderPinSetupNumberButton(9)}
                    </View>
                    <View style={styles.numberRow}>
                      <View style={[styles.numberButton, {backgroundColor: 'transparent'}]} />
                      {renderPinSetupNumberButton(0)}
                      <TouchableOpacity
                        style={[styles.numberButton, {backgroundColor: 'transparent'}]}
                        onPress={handlePinSetupDelete}
                        disabled={pinSetupStep === 1 ? newPin.length === 0 : confirmPin.length === 0}
                      >
                        <Icon name="backspace-outline" size={28} color="#333" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {pinSetupStep === 1 && newPin.length === 4 && (
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => setPinSetupStep(2)}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
          
          {/* Forgot Password Modal */}
          <Modal
            visible={showForgotPasswordModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              if (!loading) setShowForgotPasswordModal(false);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContainer}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  {!loading && (
                    <TouchableOpacity
                      onPress={() => setShowForgotPasswordModal(false)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {forgotPasswordSuccess ? (
                  <View style={styles.successContainer}>
                    <Icon name="checkmark-circle" size={60} color="#4CD964" />
                    <Text style={styles.successTitle}>Email Sent</Text>
                    <Text style={styles.successText}>
                      A password reset link has been sent to your email address.
                      Please check your inbox and follow the instructions.
                    </Text>
                    <TouchableOpacity
                      style={styles.successButton}
                      onPress={() => {
                        setForgotPasswordSuccess(false);
                        setShowForgotPasswordModal(false);
                      }}
                    >
                      <Text style={styles.successButtonText}>OK</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={styles.modalSubtitle}>
                      Enter your email address to receive a password reset link
                    </Text>
                    
                    <View style={styles.inputContainer}>
                      <Icon name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                      <TextInput
                        ref={forgotPasswordEmailRef}
                        style={styles.textInput}
                        placeholder="Email"
                        value={forgotPasswordEmail}
                        onChangeText={setForgotPasswordEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                        returnKeyType="done"
                        onSubmitEditing={handleForgotPassword}
                        autoFocus={true}
                      />
                    </View>
                    
                    {forgotPasswordError ? (
                      <Text style={styles.errorText}>{forgotPasswordError}</Text>
                    ) : null}
                    
                    <TouchableOpacity
                      style={[styles.loginButton, loading && styles.buttonDisabled]}
                      onPress={handleForgotPassword}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.loginButtonText}>Send Reset Link</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0A2E64', // Background color outside gradient
    },
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 50,
      paddingBottom: 20,
    },
    avatarContainer: {
      marginBottom: 25,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 25,
    },
    pinContainer: {
      alignItems: 'center',
    },
    pinDotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 20,
    },
    pinDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FFFFFF',
      backgroundColor: 'transparent',
      marginHorizontal: 10,
    },
    pinDotFilled: {
      backgroundColor: '#FFFFFF',
    },
    errorContainer: {
      alignItems: 'center',
      marginTop: 16,
    },
    errorText: {
      color: '#FF9500',
      textAlign: 'center',
      marginVertical: 10,
    },
    passwordLoginButton: {
      marginTop: 15,
      marginBottom: 20,
      padding: 10,
    },
    passwordLoginText: {
      color: '#FFFFFF',
      fontSize: 16,
      textDecorationLine: 'underline',
    },
    biometricOverlay: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(10, 60, 120, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    biometricPrompt: {
      width: 160,
      height: 160,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    biometricIconContainer: {
      marginBottom: 12,
    },
    biometricText: {
      fontSize: 18,
      color: '#333',
      fontWeight: '600',
    },
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 12,
      color: '#FFFFFF',
    },
    numberPadWrapper: {
      flex: 1,
      justifyContent: 'space-between',
      width: '100%',
      maxHeight: 450, // Limit max height to prevent overflow
    },
    numberPad: {
      width: '80%',
      maxWidth: 360,
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: 10,
    },
    numberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
    },
    numberButton: {
      width: 75,
      height: 75,
      borderRadius: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      backgroundColor: 'transparent',
    },
    numberButtonText: {
      fontSize: 32,
      fontWeight: '400',
      color: '#FFFFFF',
    },
    letterText: {
      fontSize: 10,
      color: '#FFFFFF',
      marginTop: 2,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 30,
      width: '100%',
      marginTop: 30, // Add more space before footer buttons
      marginBottom: 10,
    },
    footerButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      minWidth: 120, // Ensure buttons have consistent width
      alignItems: 'center',
    },
    footerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    modalContent: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 10,
    },
    closeButton: {
      padding: 4,
    },
    modalEmailText: {
      fontSize: 16,
      color: '#666',
      marginBottom: 20,
      alignSelf: 'flex-start',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      height: 56,
      width: '100%',
    },
    inputIcon: {
      marginRight: 12,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
      height: '100%',
    },
    passwordInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 16,
      height: 56,
      width: '100%',
    },
    passwordInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
      height: '100%',
    },
    passwordToggle: {
      padding: 8,
    },
    modalErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      width: '100%',
    },
    modalErrorText: {
      marginLeft: 8,
      color: '#FF3B30',
      flex: 1,
    },
    loginButton: {
      backgroundColor: '#0A6EFF',
      borderRadius: 12,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      marginBottom: 16,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    forgotPasswordButton: {
      padding: 8,
    },
    forgotPasswordText: {
      color: '#0A6EFF',
      fontSize: 14,
    },
    modalSubtitle: {
      fontSize: 16,
      color: '#666',
      marginBottom: 20,
      textAlign: 'center',
    },
    buttonContainer: {
      flexDirection: 'column',
      width: '100%',
      marginTop: 10,
    },
    submitButton: {
      backgroundColor: '#0A6EFF',
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
      height: 56,
    },
    submitButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#0A6EFF',
    },
    cancelButtonText: {
      color: '#0A6EFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    // Styles for PIN Setup Modal
    pinSetupNumberPad: {
      width: '100%',
      alignItems: 'center',
      marginVertical: 20,
    },
    continueButton: {
      backgroundColor: '#0A6EFF',
      borderRadius: 12,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      marginTop: 10,
    },
    continueButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    // Styles for success message in Forgot Password
    successContainer: {
      alignItems: 'center',
      padding: 20,
    },
    successTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#333',
      marginVertical: 16,
    },
    successText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginBottom: 20,
    },
    successButton: {
      backgroundColor: '#0A6EFF',
      borderRadius: 12,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    successButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    pinSetupNumberButton: {
      backgroundColor: 'rgba(10, 110, 255, 0.2)', // Light blue background to match theme
      borderWidth: 1,
      borderColor: 'rgba(10, 110, 255, 0.3)',
    },
    pinSetupNumberText: {
      color: '#FFFFFF', // White text for contrast on blue background
      fontSize: 32,
      fontWeight: '400',
    },
    pinSetupDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#0A6EFF', // Blue border for visibility
      backgroundColor: 'transparent', // Explicitly transparent background
      marginHorizontal: 10,
    },
    pinSetupDotFilled: {
      backgroundColor: '#0A6EFF', // Blue fill to match the theme
      borderColor: '#0A6EFF',
    },
  });
  
  export default PINEntryScreen;