// Improved RegistrationScreen.tsx with better keyboard handling and form navigation
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Switch,
  Modal,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

type RegistrationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegistrationScreen'>;

// Form field validation types
interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  pin?: string;
}

// Country code data
interface CountryCode {
  name: string;
  code: string;
  dial_code: string;
}

// Popular country codes for quick selection
const popularCountryCodes: CountryCode[] = [
  { name: 'Australia', code: 'AU', dial_code: '+61' },
  { name: 'United States', code: 'US', dial_code: '+1' },
  { name: 'India', code: 'IN', dial_code: '+91' },
  { name: 'United Kingdom', code: 'GB', dial_code: '+44' },
  { name: 'Canada', code: 'CA', dial_code: '+1' },
  { name: 'Singapore', code: 'SG', dial_code: '+65' },
  { name: 'New Zealand', code: 'NZ', dial_code: '+64' },
];

const RegistrationScreen = () => {
  const navigation = useNavigation<RegistrationScreenNavigationProp>();
  const { register } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Country code selector
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(popularCountryCodes[0]); // Default to Australia
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  
  // Biometric authentication state
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [biometricTested, setBiometricTested] = useState(false);
  
  // Refs for form navigation
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const pinInputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null)
  ];
  
  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Check for biometric capability on component mount
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          console.log('Biometric authentication not supported on this device');
          setIsBiometricsAvailable(false);
          return;
        }
        
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          console.log('No biometrics enrolled on this device');
          setIsBiometricsAvailable(false);
          return;
        }
        
        setIsBiometricsAvailable(true);
        
        // Determine the type of biometrics available
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else {
          setBiometricType('Biometrics');
        }
      } catch (error) {
        console.error('Error checking biometric availability:', error);
        setIsBiometricsAvailable(false);
      }
    };
    
    checkBiometricAvailability();
  }, []);
  
  // Validate the form
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email address is invalid';
    }
    
    // Validate phone
    if (!phoneNumber.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{7,12}$/.test(phoneNumber.replace(/[^0-9]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    // Validate PIN
    const fullPin = pin.join('');
    if (!fullPin || fullPin.length !== 4) {
      newErrors.pin = 'Please enter a 4-digit PIN';
    }
    
    setErrors(newErrors);
    
    // If there are errors, scroll to the first error
    if (Object.keys(newErrors).length > 0) {
      let scrollPosition = 0;
      
      if (newErrors.name) scrollPosition = 0;
      else if (newErrors.email) scrollPosition = 100;
      else if (newErrors.phone) scrollPosition = 200;
      else if (newErrors.password) scrollPosition = 300;
      else if (newErrors.pin) scrollPosition = 400;
      
      // Scroll to the error with a slight delay to ensure the keyboard is visible
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: true });
      }, 100);
    }
    
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle PIN input
  const handlePinChange = (text: string, index: number) => {
    if (text.length <= 1) {
      const newPin = [...pin];
      newPin[index] = text.replace(/[^0-9]/g, '');
      setPin(newPin);
      
      // Auto-advance to next input if this one is filled
      if (text && index < 3) {
        pinInputRefs[index + 1].current?.focus();
      }
    }
  };
  
  // Handle PIN input keypress
  const handlePinKeyPress = (event: any, index: number) => {
    // If backspace and empty, go to previous field
    if (event.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };
  
  // Test biometric authentication
  const testBiometricAuth = async () => {
    try {
      if (!isBiometricsAvailable) {
        Alert.alert(
          'Biometrics Not Available',
          'Your device does not support biometric authentication or it is not set up.',
          [{ text: 'OK' }]
        );
        setBiometricsEnabled(false);
        return;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Verify your ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        setBiometricTested(true);
        Alert.alert(
          'Success',
          `${biometricType} verification successful! You'll be able to use ${biometricType} to log in.`,
          [{ text: 'OK' }]
        );
      } else {
        // User cancelled or failed
        setBiometricsEnabled(false);
        Alert.alert(
          'Verification Cancelled',
          `${biometricType} verification was not completed. Biometric login has been disabled.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error during biometric authentication test:', error);
      setBiometricsEnabled(false);
      Alert.alert(
        'Error',
        `Failed to verify ${biometricType}. Biometric login has been disabled.`,
        [{ text: 'OK' }]
      );
    }
  };
  
  // Toggle biometrics
  const toggleBiometrics = (value: boolean) => {
    setBiometricsEnabled(value);
    
    if (value) {
      // If enabled, test biometrics
      testBiometricAuth();
    } else {
      // If disabled, reset tested state
      setBiometricTested(false);
    }
  };
  
  // Get full phone number with country code
  const getFullPhoneNumber = () => {
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    return `${selectedCountry.dial_code}${cleanNumber}`;
  };
  
  // Handle registration
  const handleRegister = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    
    if (!validateForm()) {
      return;
    }
    
    // Check if biometrics is enabled but not tested
    if (biometricsEnabled && !biometricTested) {
      Alert.alert(
        'Biometric Verification Required',
        `Please verify your ${biometricType} before continuing.`,
        [
          { 
            text: 'Verify',
            onPress: testBiometricAuth
          },
          {
            text: 'Disable Biometrics',
            onPress: () => {
              setBiometricsEnabled(false);
              setBiometricTested(false);
            }
          }
        ]
      );
      return;
    }
    
    setProcessing(true);
    
    try {
      // Combine PIN digits
      const pinCode = pin.join('');
      
      // Get full phone number with country code
      const formattedPhone = getFullPhoneNumber();
      
      // Register the user with Firebase Authentication and Firestore
      await register(email, password, name, pinCode, formattedPhone);
      
      // Show success message
      Alert.alert(
        'Account Created!',
        'Your BuddyPay account has been created successfully.',
        [
          {
            text: 'Get Started',
            onPress: () => {
              // Navigate to dashboard
              navigation.replace('MainDashboard', { screen: 'Friends' });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Registration error:', error);
      
      // Show appropriate error message
      if (error instanceof Error) {
        if (error.message.includes('A user with this email already exists')) {
          setErrors({
            ...errors,
            email: 'This email is already registered',
          });
          emailInputRef.current?.focus();
          // Scroll to email field
          scrollViewRef.current?.scrollTo({ y: 100, animated: true });
        } 
        else if (error.message.includes('A user with this phone already exists')) {
          setErrors({
            ...errors,
            phone: 'This phone number is already registered',
          });
          phoneInputRef.current?.focus();
          // Scroll to phone field
          scrollViewRef.current?.scrollTo({ y: 200, animated: true });
        }
        else if (error.message.includes('auth/email-already-in-use')) {
          setErrors({
            ...errors,
            email: 'This email is already registered',
          });
          emailInputRef.current?.focus();
          // Scroll to email field
          scrollViewRef.current?.scrollTo({ y: 100, animated: true });
        } else if (error.message.includes('auth/invalid-email')) {
          setErrors({
            ...errors,
            email: 'Invalid email address',
          });
          emailInputRef.current?.focus();
          // Scroll to email field
          scrollViewRef.current?.scrollTo({ y: 100, animated: true });
        } else if (error.message.includes('auth/weak-password')) {
          setErrors({
            ...errors,
            password: 'Password is too weak',
          });
          passwordInputRef.current?.focus();
          // Scroll to password field
          scrollViewRef.current?.scrollTo({ y: 300, animated: true });
        } else {
          Alert.alert(
            'Registration Failed',
            'An error occurred during registration. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Registration Failed',
          'An unexpected error occurred. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setProcessing(false);
    }
  };
  
  // Go back to login
  const goToLogin = () => {
    navigation.navigate('PINEntryScreen');
  };
  
  // Handle return key on inputs - move to next field
  const handleSubmitEditing = (nextField: React.RefObject<TextInput>) => {
    nextField.current?.focus();
  };
  
  // Function to dismiss keyboard when tapping outside of inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Icon name="cash-outline" size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>Join BuddyPay</Text>
              <Text style={styles.logoSubtext}>Enter your details to create an account</Text>
            </View>
            
            {/* Registration Form */}
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={[styles.inputContainer, errors.name ? styles.inputError : null]}>
                  <Icon name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={nameInputRef}
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!processing}
                    onSubmitEditing={() => handleSubmitEditing(emailInputRef)}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>
              
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
                  <Icon name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    placeholder="Your email address"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!processing}
                    onSubmitEditing={() => handleSubmitEditing(phoneInputRef)}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
              
              {/* Phone Number Input with Country Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.inputContainer, errors.phone ? styles.inputError : null]}>
                  <TouchableOpacity 
                    style={styles.countryCodeButton}
                    onPress={() => {
                      dismissKeyboard();
                      setShowCountrySelector(true);
                    }}
                    disabled={processing}
                  >
                    <Text style={styles.countryCodeText}>{selectedCountry.dial_code}</Text>
                    <Icon name="chevron-down" size={16} color="#999" />
                  </TouchableOpacity>
                  
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={!processing}
                    onSubmitEditing={() => handleSubmitEditing(passwordInputRef)}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>
              
              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
                  <Icon name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder="Create a password (min 8 characters)"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!processing}
                    onSubmitEditing={() => handleSubmitEditing(pinInputRefs[0])}
                    returnKeyType="next"
                    blurOnSubmit={false}
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
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>
              
              {/* PIN Section */}
              <View style={styles.pinSection}>
                <View style={styles.pinHeader}>
                  <Text style={styles.pinTitle}>Create Security PIN</Text>
                  <Text style={styles.pinSubtitle}>This 4-digit PIN will be used for quick login</Text>
                </View>
                
                <View style={styles.pinInputsContainer}>
                  {pin.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={pinInputRefs[index]}
                      style={styles.pinInput}
                      keyboardType="numeric"
                      maxLength={1}
                      secureTextEntry={true}
                      value={digit}
                      onChangeText={(text) => handlePinChange(text, index)}
                      onKeyPress={(e) => handlePinKeyPress(e, index)}
                      editable={!processing}
                      returnKeyType={index === 3 ? "done" : "next"}
                      blurOnSubmit={index === 3}
                      onSubmitEditing={() => {
                        if (index < 3) {
                          pinInputRefs[index + 1].current?.focus();
                        } else {
                          // Last PIN digit - hide keyboard
                          Keyboard.dismiss();
                        }
                      }}
                    />
                  ))}
                </View>
                
                {errors.pin && (
                  <Text style={[styles.errorText, { textAlign: 'center' }]}>{errors.pin}</Text>
                )}
              </View>
              
              {/* Biometric Option */}
              {isBiometricsAvailable && (
                <View style={styles.biometricSection}>
                  <View style={styles.biometricIcon}>
                    <Icon 
                      name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'} 
                      size={24} 
                      color="#0A6EFF" 
                    />
                  </View>
                  <View style={styles.biometricTextContainer}>
                    <Text style={styles.biometricTitle}>Enable {biometricType} Login</Text>
                    <Text style={styles.biometricSubtitle}>
                      Use your device's {biometricType.toLowerCase()} for quick and secure login
                    </Text>
                  </View>
                  <Switch
                    value={biometricsEnabled}
                    onValueChange={toggleBiometrics}
                    trackColor={{ false: '#e0e0e0', true: '#b0d0ff' }}
                    thumbColor={biometricsEnabled ? '#0A6EFF' : '#f4f3f4'}
                    disabled={!isBiometricsAvailable || processing}
                  />
                </View>
              )}
              
              {/* Add space at the bottom for keyboard */}
              <View style={{ height: keyboardVisible ? 120 : 0 }}></View>
            </View>
          </ScrollView>
          
          {/* Footer with Create Account Button - Always visible */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.createAccountButton, processing && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createAccountButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginQuestion}>Already have an account?</Text>
              <TouchableOpacity onPress={goToLogin}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Country Code Selector Modal */}
          <Modal
            visible={showCountrySelector}
            transparent
            animationType="slide"
            onRequestClose={() => setShowCountrySelector(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowCountrySelector(false)}
            >
              <View style={styles.countryModalContainer}>
                <View style={styles.countryModalHeader}>
                  <Text style={styles.countryModalTitle}>Select Country Code</Text>
                  <TouchableOpacity onPress={() => setShowCountrySelector(false)}>
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.countryList}>
                  {popularCountryCodes.map((country) => (
                    <TouchableOpacity 
                      key={country.code}
                      style={styles.countryItem}
                      onPress={() => {
                        setSelectedCountry(country);
                        setShowCountrySelector(false);
                      }}
                    >
                      <Text style={styles.countryName}>{country.name}</Text>
                      <Text style={styles.countryDialCode}>{country.dial_code}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100  // Add padding to ensure content doesn't get hidden behind the footer
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#0A6EFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
  },
  pinSection: {
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  pinHeader: {
    marginBottom: 16,
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A6EFF',
    marginBottom: 4,
  },
  pinSubtitle: {
    fontSize: 13,
    color: '#0A6EFF',
    opacity: 0.8,
  },
  pinInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pinInput: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#0A6EFF',
    borderRadius: 12,
    backgroundColor: 'white',
    marginHorizontal: 6,
    textAlign: 'center',
    fontSize: 18,
    color: '#333',
  },
  biometricSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  biometricIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#e0f0ff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  createAccountButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginQuestion: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#0A6EFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
  // Country code selector modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  countryModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, // Extra bottom padding for iOS
  },
  countryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countryModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  countryList: {
    maxHeight: 400,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryName: {
    fontSize: 16,
    color: '#333',
  },
  countryDialCode: {
    fontSize: 14,
    color: '#666',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  }
});

export default RegistrationScreen;