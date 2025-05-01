// Updated PINEntryScreen with elegant purple theme
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
  Dimensions
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

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');

// Purple theme colors - updated per user preferences
const COLORS = {
  primaryPurple: '#8860FF',   // Lighter purple as the main accent (was lightPurple)
  deepPurple: '#6A3DE8',      // Original purple moved to deepPurple
  lightPurple: '#9E7DFF',     // Even lighter purple for subtle accents
  paleGrey: '#F4F2F9',        // Very light purple/grey background
  white: '#FFFFFF',
  black: '#000000',
  errorOrange: '#FF7D3B',
  textDark: '#2D2B4E',        // Dark text color with purple undertone
  textMedium: '#6E6B93',      // Medium text color
  transparent: 'transparent',
};

const PINEntryScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PINEntryScreenNavigationProp>();
  const { loginWithPin, loginWithBiometrics, login, enableBiometricLogin, enablePinLogin } = useAuth();
  
  // PIN state
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [pinFailCount, setPinFailCount] = useState(0);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  
  // Password modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // No credentials modal
  const [showNoCredentialsModal, setShowNoCredentialsModal] = useState(false);
  const [noCredentialsEmail, setNoCredentialsEmail] = useState('');
  const [noCredentialsPassword, setNoCredentialsPassword] = useState('');
  const [noCredentialsError, setNoCredentialsError] = useState('');
  const [showNoCredentialsPassword, setShowNoCredentialsPassword] = useState(false);
  
  // Animation
  const [shake] = useState(new Animated.Value(0));
  
  // Load user data and check for biometrics
  useEffect(() => {
    const loadUserDataAndTriggerBiometrics = async () => {
      try {
        // Load stored credentials
        const storedEmail = await SecureStore.getItemAsync('user_email');
        const storedName = await SecureStore.getItemAsync('user_display_name');
        const failCount = await SecureStore.getItemAsync('pin_fail_count');
        const biometricsEnabled = await SecureStore.getItemAsync('biometrics_enabled');
        
        if (!storedEmail) {
          setShowNoCredentialsModal(true);
          return;
        }
        
        setEmail(storedEmail);
        
        if (storedName) {
          setUserName(storedName);
        }
        
        if (failCount) {
          setPinFailCount(parseInt(failCount, 10));
        }
        
        // Check biometric capability
        const biometricsCheck = await checkBiometricAvailability();
        
        if (biometricsCheck.available && biometricsCheck.enrolled && biometricsEnabled === 'true') {
          setBiometricType(biometricsCheck.biometricType);
          
          // Attempt biometric authentication with a delay
          const biometricDelay = Platform.OS === 'ios' ? 1500 : 800;
          
          setTimeout(() => {
            setShowBiometricPrompt(true);
            attemptBiometricLogin(storedEmail);
          }, biometricDelay);
        }
      } catch (error) {
        console.error('Error during initial setup:', error);
      }
    };
    
    loadUserDataAndTriggerBiometrics();
  }, []);

  // Check biometric authentication availability
  const checkBiometricAvailability = async () => {
    try {
      // Check if device supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { 
          available: false, 
          biometricType: 'none',
          enrolled: false 
        };
      }
  
      // Check if biometrics is enrolled on the device
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
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
  const attemptBiometricLogin = async (userEmail: string) => {
    try {
      setBiometricLoading(true);
      setError('');
      
      const biometryInfo = await checkBiometricAvailability();
      
      if (!biometryInfo.available || !biometryInfo.enrolled) {
        Alert.alert(
          'Biometric Login Unavailable',
          'Please use your PIN instead.',
          [{ text: 'OK' }]
        );
        setBiometricLoading(false);
        setShowBiometricPrompt(false);
        return;
      }
      
      // Authentication options
      const authOptions = {
        promptMessage: `Login with ${biometryInfo.biometricType}`,
        cancelLabel: 'Use PIN Instead',
        disableDeviceFallback: true,
        requireConfirmation: false
      };
      
      const result = await LocalAuthentication.authenticateAsync(authOptions);
      
      if (result.success) {
        try {
          await loginWithBiometrics(userEmail);
          await resetPinFailCount();
          navigation.replace('MainDashboard', { screen: 'Friends' });
        } catch (error) {
          console.error('Error during biometric login:', error);
          setError('Biometric login failed. Please use your PIN.');
          Vibration.vibrate(400);
        }
      } else if (result.error === 'user_cancel') {
        // User cancelled - no need for alert
      } else if (result.error === 'lockout') {
        Alert.alert(
          'Biometric Login Locked',
          'Too many failed attempts. Please use your PIN instead.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Unexpected error in biometric authentication:', error);
      setError('Authentication error. Please use your PIN.');
    } finally {
      setBiometricLoading(false);
      setShowBiometricPrompt(false);
    }
  };

  // Reset PIN fail count
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
      // Add visual feedback with animation
      highlightNumber(num);
      
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
  
  // Highlight animation for number buttons
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);
  
  const highlightNumber = (num: number) => {
    setHighlightedNumber(num);
    setTimeout(() => {
      setHighlightedNumber(null);
    }, 500);
  };

  // Handle delete press
  const handleDelete = () => {
    if (!loading && !biometricLoading) {
      setPin(prevPin => prevPin.slice(0, -1));
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
      await loginWithBiometrics(email, password);
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

  // Handle forgot PIN
  const handleForgotPin = () => {
    setPassword('');
    setError('');
    setShowPasswordModal(true);
  };

  // Handle deregister
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

  // No credentials login
  const handleNoCredentialsSubmit = async () => {
    if (!noCredentialsEmail || !noCredentialsPassword) {
      setNoCredentialsError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    
    try {
      await login(noCredentialsEmail, noCredentialsPassword);
      
      // Store credentials
      await SecureStore.setItemAsync('user_email', noCredentialsEmail);
      
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.displayName) {
        await SecureStore.setItemAsync('user_display_name', currentUser.displayName);
      }
      
      setEmail(noCredentialsEmail);
      setShowNoCredentialsModal(false);
      setLoading(false);
      
      navigation.replace('MainDashboard', { screen: 'Friends' });
    } catch (error) {
      console.error('Login error:', error);
      setNoCredentialsError('Invalid credentials. Please try again.');
      setLoading(false);
    }
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

  // Render number pad button
  const renderNumberButton = (num: number, letters: string = '') => {
    const isHighlighted = highlightedNumber === num;
    
    return (
      <TouchableOpacity
        style={[
          styles.numberButton,
          isHighlighted && styles.highlightedButton
        ]}
        onPress={() => handleNumberPress(num)}
        disabled={loading || biometricLoading}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.numberButtonText,
          isHighlighted && styles.highlightedText
        ]}>{num}</Text>
        {letters && <Text style={[
          styles.letterText,
          isHighlighted && styles.highlightedLetterText
        ]}>{letters}</Text>}
      </TouchableOpacity>
    );
  };

  // Biometric login button
  const showBiometricLogin = async () => {
    if (!email) return;
    
    const biometricsCheck = await checkBiometricAvailability();
    
    if (!biometricsCheck.available || !biometricsCheck.enrolled) {
      Alert.alert(
        'Biometric Login Unavailable',
        'Please use your PIN instead.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowBiometricPrompt(true);
    setBiometricLoading(true);
    attemptBiometricLogin(email);
  };

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        {/* Top curved purple background */}
        <View style={styles.topCurve} />
        
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentContainer}>
            {/* Welcome Text removed */}
            
            <Text style={styles.headerText}>Enter Your PIN</Text>
            
            {/* Pin container with fixed height to prevent layout shift */}
            <View style={styles.pinAndErrorContainer}>
              <Animated.View 
                style={[
                  styles.pinContainer,
                  { transform: [{ translateX: shake }] }
                ]}
              >
                <View style={styles.pinDotsContainer}>
                  {renderPinDots()}
                </View>
              </Animated.View>
              
              {/* Error container with fixed height */}
              <View style={styles.errorWrapper}>
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            
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
                      color={COLORS.primaryPurple} 
                      style={{opacity: 0.8}}
                    />
                  </View>
                  <Text style={styles.biometricText}>{biometricType}</Text>
                </View>
              </View>
            )}
            
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.primaryPurple} />
                <Text style={styles.loadingText}>Verifying...</Text>
              </View>
            ) : (
              <View style={styles.numberPadContainer}>
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
                      style={styles.actionButton}
                      onPress={showBiometricLogin}
                      disabled={loading || biometricLoading}
                      activeOpacity={0.7}
                    >
                      <Icon 
                        name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} 
                        size={28} 
                        color={COLORS.black} 
                      />
                    </TouchableOpacity>
                    {renderNumberButton(0)}
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handleDelete}
                      disabled={loading || biometricLoading || pin.length === 0}
                      activeOpacity={0.7}
                    >
                      <Icon name="backspace-outline" size={28} color={COLORS.black} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Footer Buttons as text links */}
                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={styles.footerLink}
                    onPress={handleForgotPin}
                  >
                    <Text style={styles.footerLinkText}>Forgot PIN</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.footerLink}
                    onPress={handleDeregister}
                  >
                    <Text style={styles.footerLinkText}>Deregister</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          {/* Password Modal */}
          <Modal
            visible={showPasswordModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPasswordModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Enter Password</Text>
                  <TouchableOpacity
                    onPress={() => setShowPasswordModal(false)}
                    style={styles.closeButton}
                  >
                    <Icon name="close" size={24} color={COLORS.textMedium} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalEmailText}>{email}</Text>
                
                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color={COLORS.textMedium} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textMedium}
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
                      color={COLORS.textMedium} 
                    />
                  </TouchableOpacity>
                </View>
                
                {error ? (
                  <View style={styles.modalErrorContainer}>
                    <Icon name="alert-circle-outline" size={16} color={COLORS.errorOrange} />
                    <Text style={styles.modalErrorText}>{error}</Text>
                  </View>
                ) : null}
                
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={loading || !password}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.loginButtonText}>Log In</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>

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
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Welcome Back</Text>
                <Text style={styles.modalSubtitle}>Please verify your account to continue</Text>
                
                <View style={styles.inputContainer}>
                  <Icon name="mail-outline" size={20} color={COLORS.textMedium} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email"
                    value={noCredentialsEmail}
                    onChangeText={setNoCredentialsEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color={COLORS.textMedium} style={styles.inputIcon} />
                  <TextInput
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
                      color={COLORS.textMedium} 
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
                      <ActivityIndicator size="small" color={COLORS.white} />
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
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white, // Changed to white for consistent background
  },
  background: {
    flex: 1,
    position: 'relative',
  },
  topCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0, // Make it extend to the bottom of the screen
    backgroundColor: COLORS.white, // Consistent white background
    // Removed border radius and shadow to eliminate card effect
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  welcomeContainer: {
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.primaryPurple, // Changed to lighter purple
    marginBottom: 30,
    marginTop: 10,
  },
  // Container to hold both PIN dots and error message with fixed height
  pinAndErrorContainer: {
    height: 80, // Fixed height to prevent layout shift
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryPurple, // Changed to lighter purple
    backgroundColor: 'transparent',
    marginHorizontal: 10,
  },
  pinDotFilled: {
    backgroundColor: COLORS.primaryPurple, // Changed to lighter purple
  },
  // Fixed height error container
  errorWrapper: {
    height: 30, // Fixed height for error text
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.errorOrange,
    textAlign: 'center',
    fontWeight: '500',
  },
  passwordLoginButton: {
    marginTop: 10,
    padding: 10,
  },
  passwordLoginText: {
    color: COLORS.primaryPurple, // Changed to lighter purple
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  biometricOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(106, 61, 232, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  biometricPrompt: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  biometricIconContainer: {
    marginBottom: 12,
  },
  biometricText: {
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  numberPadContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    // Use a flexbox to organize the elements
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  numberPad: {
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
    alignSelf: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  numberButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    width: 75,
    height: 75,
    borderRadius: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightedButton: {
    backgroundColor: COLORS.primaryPurple,
  },
  highlightedText: {
    color: COLORS.white,
  },
  highlightedLetterText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  numberButtonText: {
    fontSize: 32,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  letterText: {
    fontSize: 11,
    color: COLORS.textMedium,
    marginTop: 2,
  },
  // Footer styles updated to text links
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    width: '100%',
    marginBottom: 30,
    // Ensure it stays at bottom
    marginTop: 'auto',
  },
  footerLink: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  footerLinkText: {
    color: COLORS.primaryPurple,
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalEmailText: {
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.paleGrey,
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
    color: COLORS.textDark,
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
    color: COLORS.errorOrange,
    flex: 1,
  },
  loginButton: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: COLORS.primaryPurple,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryPurple,
  },
  cancelButtonText: {
    color: COLORS.primaryPurple,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PINEntryScreen;