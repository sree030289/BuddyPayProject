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
  TouchableWithoutFeedback,
  Image,
  Dimensions,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';

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

const { width, height } = Dimensions.get('window');

const RegistrationScreen = () => {
  const navigation = useNavigation<RegistrationScreenNavigationProp>();
  const { register } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [currentStep, setCurrentStep] = useState(1);
  
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
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(popularCountryCodes[0]);
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
  
  // Run entry animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    // Validate phone number (optional)
    if (phoneNumber && phoneNumber.length < 6) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Validate PIN
    const fullPin = pin.join('');
    if (fullPin.length !== 4) {
      newErrors.pin = 'Please enter a 4-digit PIN';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle PIN input
  const handlePinChange = (value: string, index: number) => {
    if (value.length <= 1) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      
      // Auto-focus next input
      if (value !== '' && index < 3) {
        pinInputRefs[index + 1].current?.focus();
      }
    }
  };
  
  // Handle PIN key press for backspace navigation
  const handlePinKeyPress = (event: any, index: number) => {
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
        'An error occurred during biometric verification.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Navigate to login screen
  const goToLogin = () => {
    navigation.navigate('LoginScreen');
  };
  
  // Handle registration
  const handleRegister = async () => {
    if (!validateForm()) {
      // Scroll to first error
      if (errors.name) {
        nameInputRef.current?.focus();
      } else if (errors.email) {
        emailInputRef.current?.focus();
      } else if (errors.phone) {
        phoneInputRef.current?.focus();
      } else if (errors.password) {
        passwordInputRef.current?.focus();
      } else if (errors.pin) {
        pinInputRefs[0].current?.focus();
      }
      return;
    }
    
    setProcessing(true);
    
    try {
      // Combine country code and phone number
      const fullPhoneNumber = phoneNumber ? `${selectedCountry.dial_code}${phoneNumber}` : undefined;
      const fullPin = pin.join('');
      
      await register(email, password, name, fullPin, fullPhoneNumber);
      
      if (biometricsEnabled && !biometricTested) {
        // If biometrics is enabled but not tested, show prompt
        testBiometricAuth();
      }
      
      // Registration successful
      navigation.replace('MainDashboard', { screen: 'Friends' });
    } catch (error: any) {
      let errorMessage = 'Failed to register. Please try again.';
      
      if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = error.message.toString();
      }
      
      Alert.alert('Registration Error', errorMessage);
    } finally {
      setProcessing(false);
    }
  };
  
  // Go to next step
  const nextStep = () => {
    if (currentStep === 1) {
      // Validate first step fields
      const stepErrors: FormErrors = {};
      
      if (!name.trim()) {
        stepErrors.name = 'Name is required';
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) {
        stepErrors.email = 'Email is required';
      } else if (!emailRegex.test(email)) {
        stepErrors.email = 'Please enter a valid email';
      }
      
      if (phoneNumber && phoneNumber.length < 6) {
        stepErrors.phone = 'Please enter a valid phone number';
      }
      
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length === 0) {
        setCurrentStep(2);
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }
    }
  };
  
  // Go back to previous step
  const prevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };
  
  // Render country selector modal
  const renderCountrySelector = () => {
    return (
      <Modal
        visible={showCountrySelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountrySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryModalContainer}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Select Country</Text>
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
        </View>
      </Modal>
    );
  };
  
  // Render step 1 (personal info)
  const renderStepOne = () => {
    return (
      <Animated.View 
        style={[
          styles.formContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <Text style={styles.stepTitle}>Personal Information</Text>
        
        {/* Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={[styles.inputContainer, errors.name ? styles.inputError : null]}>
            <Icon name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={nameInputRef}
              style={styles.input}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>
        
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
            <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>
        
        {/* Phone Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
          <View style={[styles.phoneContainer, errors.phone ? styles.inputError : null]}>
            <TouchableOpacity 
              style={styles.countryCodeButton}
              onPress={() => setShowCountrySelector(true)}
            >
              <Text style={styles.countryCodeText}>{selectedCountry.dial_code}</Text>
              <Icon name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
            
            <TextInput
              ref={phoneInputRef}
              style={styles.phoneInput}
              placeholder="Enter phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={nextStep}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>
      </Animated.View>
    );
  };
  
  // Render step 2 (security info)
  const renderStepTwo = () => {
    return (
      <Animated.View 
        style={[
          styles.formContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <Text style={styles.stepTitle}>Security Details</Text>
        
        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
            <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <TouchableOpacity 
              style={styles.visibilityToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Icon name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          <Text style={styles.passwordTip}>Password must be at least 6 characters</Text>
        </View>
        
        {/* PIN Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>4-Digit PIN</Text>
          <View style={styles.pinInputContainer}>
            {pin.map((digit, index) => (
              <View 
                key={index} 
                style={[styles.pinDigitContainer, errors.pin ? styles.inputError : null]}
              >
                <TextInput
                  ref={pinInputRefs[index]}
                  style={styles.pinDigit}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index)}
                  onKeyPress={(e) => handlePinKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                />
              </View>
            ))}
          </View>
          {errors.pin && <Text style={styles.errorText}>{errors.pin}</Text>}
          <Text style={styles.passwordTip}>You'll use this PIN to log in to the app</Text>
        </View>
        
        {/* Biometric Authentication */}
        {isBiometricsAvailable && (
          <View style={styles.biometricSection}>
            <View style={styles.biometricIcon}>
              <Icon 
                name={biometricType === 'Face ID' ? "scan-outline" : "finger-print-outline"} 
                size={24} 
                color="#0055A4" 
              />
            </View>
            <View style={styles.biometricTextContainer}>
              <Text style={styles.biometricTitle}>Enable {biometricType}</Text>
              <Text style={styles.biometricSubtitle}>
                Use {biometricType} to log in quickly and securely
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={(value) => {
                setBiometricsEnabled(value);
                if (value && !biometricTested) {
                  // Test biometrics when enabled
                  testBiometricAuth();
                }
              }}
              trackColor={{ false: '#e0e0e0', true: '#bfd7ff' }}
              thumbColor={biometricsEnabled ? '#0055A4' : '#f4f3f4'}
            />
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={currentStep === 1 ? goToLogin : prevStep}
              >
                <Icon name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#0A2E64', '#0055A4', '#0A78DD']}
                  style={styles.logoBackground}
                >
                  <Text style={styles.logoText}>BP</Text>
                </LinearGradient>
                <Text style={styles.appName}>BuddyPay</Text>
              </View>
              
              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressDot, { backgroundColor: '#0055A4' }]} />
                <View style={[styles.progressLine, { backgroundColor: currentStep >= 2 ? '#0055A4' : '#e0e0e0' }]} />
                <View style={[styles.progressDot, { backgroundColor: currentStep >= 2 ? '#0055A4' : '#e0e0e0' }]} />
              </View>
              
              <Text style={styles.screenTitle}>Create Account</Text>
              <Text style={styles.screenSubtitle}>
                Join BuddyPay to split expenses with friends
              </Text>
            </View>
            
            {/* Form Steps */}
            {currentStep === 1 ? renderStepOne() : renderStepTwo()}
            
            {/* Spacer for keyboard */}
            <View style={{ height: keyboardVisible ? 120 : 0 }}></View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      
      {/* Footer with Create Account Button - Always visible */}
      <View style={styles.footer}>
        {currentStep === 1 ? (
          <TouchableOpacity
            style={styles.button}
            onPress={nextStep}
            disabled={processing}
          >
            <LinearGradient
              colors={['#0A2E64', '#0055A4', '#0A78DD']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={processing}
          >
            <LinearGradient
              colors={['#0A2E64', '#0055A4', '#0A78DD']}
              style={styles.buttonGradient}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Icon name="checkmark" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
        
        <View style={styles.footerText}>
          <Text style={styles.footerQuestion}>Already have an account?</Text>
          <TouchableOpacity onPress={goToLogin}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Country Selector Modal */}
      {renderCountrySelector()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  logoBackground: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#0055A4',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 4,
  },
  visibilityToggle: {
    padding: 6,
  },
  passwordTip: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingLeft: 12,
    height: 54,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 12,
  },
  pinInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pinDigitContainer: {
    width: width * 0.15,
    height: 54,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinDigit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    width: '100%',
  },
  biometricSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
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
    width: '100%',
  },
  button: {
    marginBottom: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  footerText: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerQuestion: {
    color: '#666',
    fontSize: 14,
  },
  footerLink: {
    color: '#0055A4',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  countryModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
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