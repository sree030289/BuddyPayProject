// Updated LoginScreen.tsx with PIN-only login
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import { Ionicons as Icon } from '@expo/vector-icons';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LoginScreen'>;

type AuthMethod = 'password' | 'pin';

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, loginWithPin, isPinLoginEnabled, isLoading, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);

  // Animation for switching between auth methods
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: authMethod === 'password' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [authMethod, slideAnim]);
  
  // PIN input handling
  const maxPinLength = 4;
  
  // Show auth options after email is entered
  useEffect(() => {
    if (email.includes('@') && email.includes('.')) {
      setShowAuthOptions(true);
      
      // Check if PIN login is enabled for this email
      const checkPinStatus = async () => {
        try {
          const pinEnabled = await isPinLoginEnabled(email);
          console.log("PIN login enabled for this email:", pinEnabled);
          setIsPinEnabled(pinEnabled || true); // Always enable PIN for testing
        } catch (error) {
          console.error("Error checking PIN status:", error);
          // For testing, force PIN to be enabled
          setIsPinEnabled(true);
        }
      };
      
      checkPinStatus();
    } else {
      setShowAuthOptions(false);
    }
  }, [email, isPinLoginEnabled]);
  
  // PIN dots visualization
  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < maxPinLength; i++) {
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

  // If already logged in, redirect to main dashboard
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user) {
        console.log('User is already logged in, redirecting to dashboard');
        setTimeout(() => {
          navigation.replace('MainDashboard', { screen: 'Friends' });
        }, 100);
      }
    };
    
    checkAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      setError('Email is required');
      emailInputRef.current?.focus();
      return false;
    }
    
    if (authMethod === 'password') {
      if (!password.trim()) {
        setError('Password is required');
        passwordInputRef.current?.focus();
        return false;
      }
    } else { // PIN method
      if (pin.length < maxPinLength) {
        setError('Please enter your 4-digit PIN');
        pinInputRef.current?.focus();
        return false;
      }
    }
    
    setError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setProcessing(true);
    
    try {
      if (authMethod === 'password') {
        // Regular password login
        await login(email, password);
        
        // After successful login with password, check if we should set up PIN
        if (pin && pin.length === maxPinLength) {
          console.log("Setting up PIN login after successful password login");
          try {
            const success = await enablePinLogin(email, password, pin);
            if (success) {
              setIsPinEnabled(true);
              Alert.alert(
                'PIN Setup Successful',
                'You can now log in using your PIN in the future.',
                [{ text: 'OK' }]
              );
            }
          } catch (pinError) {
            console.error("Failed to set up PIN:", pinError);
            Alert.alert(
              'PIN Setup Failed',
              'Unable to set up PIN login. You can try again later.',
              [{ text: 'OK' }]
            );
          }
        }
        
        console.log('Login successful with password, navigating to dashboard');
        navigation.replace('MainDashboard', { screen: 'Friends' });
      } else {
        // PIN-only login using stored credentials
        try {
          await loginWithPin(email, pin);
          console.log('Login successful with PIN, navigating to dashboard');
          navigation.replace('MainDashboard', { screen: 'Friends' });
        } catch (pinError) {
          if (pinError instanceof Error && pinError.message.includes('invalid-pin')) {
            // If PIN login fails, suggest logging in with password and setting up PIN
            setError('PIN login failed. Try using password login and setting up PIN again.');
            
            // Auto-switch to password tab
            setAuthMethod('password');
            setTimeout(() => {
              passwordInputRef.current?.focus();
            }, 300);
          } else {
            throw pinError; // Re-throw other errors
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Show appropriate error message
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          setError('No account found with this email');
        } else if (error.message.includes('wrong-password')) {
          setError('Incorrect password');
        } else if (error.message.includes('invalid-pin')) {
          setError('Incorrect PIN code');
        } else if (error.message.includes('email-mismatch')) {
          setError('PIN does not match this email account');
        } else if (error.message.includes('auth-failed')) {
          setError('Authentication failed. Please try again or use password.');
        } else if (error.message.includes('auth/invalid-credential')) {
          setError('Invalid login credentials. Please try again.');
        } else if (error.message.includes('auth/too-many-requests')) {
          setError('Too many failed attempts. Please try again later.');
        } else {
          setError('Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle PIN input
  const handlePinChange = (text: string) => {
    // Only allow numbers and max length of 4
    const numericValue = text.replace(/[^0-9]/g, '');
    if (numericValue.length <= maxPinLength) {
      setPin(numericValue);
    }
  };
  
  // Switch between password and PIN authentication
  const switchAuthMethod = (method: AuthMethod) => {
    // Allow switching to PIN regardless of enabled status (for testing)
    setAuthMethod(method);
    setError('');
    
    // Focus the appropriate input
    setTimeout(() => {
      if (method === 'password') {
        passwordInputRef.current?.focus();
      } else {
        pinInputRef.current?.focus();
      }
    }, 300);
  };

  // Redirect to registration
  const goToRegister = () => {
    navigation.navigate('Register');
  };

  // Go back to welcome screen
  const goBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={{ marginTop: 20, color: '#666' }}>Checking login status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>BuddyPay</Text>
          </View>
          
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to access your account</Text>
          
          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle-outline" size={18} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Icon name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!processing}
                onSubmitEditing={() => {
                  if (authMethod === 'password') {
                    passwordInputRef.current?.focus();
                  } else {
                    pinInputRef.current?.focus();
                  }
                }}
              />
            </View>
            
            {/* Authentication Method Selection */}
            {showAuthOptions && (
              <View style={styles.authMethodContainer}>
                <Text style={styles.authMethodLabel}>Choose authentication method:</Text>
                <View style={styles.authMethodTabsContainer}>
                  <Animated.View 
                    style={[
                      styles.tabSelector, 
                      { 
                        left: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '50%']
                        }) 
                      }
                    ]} 
                  />
                  <TouchableOpacity 
                    style={[
                      styles.tabOption, 
                      authMethod === 'password' ? styles.activeTabOption : null
                    ]}
                    onPress={() => switchAuthMethod('password')}
                  >
                    <Text 
                      style={[
                        styles.tabOptionText, 
                        authMethod === 'password' ? styles.activeTabOptionText : null
                      ]}
                    >
                      Password
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.tabOption, 
                      authMethod === 'pin' ? styles.activeTabOption : null
                    ]}
                    onPress={() => switchAuthMethod('pin')}
                  >
                    <Text 
                      style={[
                        styles.tabOptionText, 
                        authMethod === 'pin' ? styles.activeTabOptionText : null
                      ]}
                    >
                      PIN
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Password Input - visible when authMethod is password */}
            {showAuthOptions && authMethod === 'password' && (
              <View style={styles.inputContainer}>
                <Icon name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!processing}
                  onSubmitEditing={handleLogin}
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
            )}
            
            {/* PIN Input - visible when authMethod is pin */}
            {showAuthOptions && authMethod === 'pin' && (
              <>
                <View style={styles.inputContainer}>
                  <Icon name="keypad-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={pinInputRef}
                    style={styles.input}
                    placeholder="Enter PIN"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    secureTextEntry={true}
                    maxLength={maxPinLength}
                    value={pin}
                    onChangeText={handlePinChange}
                    editable={!processing}
                    onSubmitEditing={handleLogin}
                  />
                </View>
                
                {/* PIN Visualization */}
                <View style={styles.pinDotsContainer}>
                  <View style={styles.pinDotsWrapper}>
                    {renderPinDots()}
                  </View>
                </View>
              </>
            )}
            
            {showAuthOptions && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>
                  Forgot {authMethod === 'password' ? 'Password' : 'PIN'}?
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.loginButton, processing && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>
            
            {/* PIN Setup Button - Only show when on password tab */}
            {showAuthOptions && authMethod === 'password' && (
              <TouchableOpacity 
                style={styles.setupPinButton}
                onPress={async () => {
                  if (!email || !password) {
                    setError('Please enter email and password first');
                    return;
                  }
                  
                  // Show a prompt to set up PIN
                  setError('');
                  // Switch to PIN tab
                  switchAuthMethod('pin');
                  // Show a message
                  Alert.alert(
                    'Set Up PIN Login',
                    'Enter a 4-digit PIN to use for future logins. You\'ll need to log in with your password first.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.setupPinButtonText}>Set Up PIN Login</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerQuestion}>Don't have an account?</Text>
            <TouchableOpacity onPress={goToRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 40
  },
  backButton: {
    padding: 8,
    marginBottom: 20,
    alignSelf: 'flex-start'
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  logo: {
    width: 100,
    height: 100
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A6EFF',
    marginTop: 8
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    marginLeft: 8,
    color: '#FF3B30',
    flex: 1
  },
  form: {
    width: '100%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%'
  },
  passwordToggle: {
    padding: 8
  },
  authMethodContainer: {
    marginBottom: 16
  },
  authMethodLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8
  },
  authMethodTabsContainer: {
    flexDirection: 'row',
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    position: 'relative'
  },
  tabSelector: {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#0A6EFF',
    borderRadius: 20,
    zIndex: 0
  },
  tabOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  activeTabOption: {
    // No specific styles needed as the background is handled by the animated selector
  },
  tabOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666'
  },
  activeTabOptionText: {
    color: '#fff'
  },
  pinDotsContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  pinDotsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0A6EFF',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 8
  },
  pinDotFilled: {
    backgroundColor: '#0A6EFF'
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24
  },
  forgotPasswordText: {
    color: '#0A6EFF',
    fontSize: 14
  },
  loginButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  buttonDisabled: {
    opacity: 0.7
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  setupPinButton: {
    borderWidth: 1,
    borderColor: '#0A6EFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36
  },
  setupPinButtonText: {
    color: '#0A6EFF',
    fontSize: 16,
    fontWeight: '500'
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16
  },
  registerQuestion: {
    color: '#666',
    fontSize: 15
  },
  registerLink: {
    color: '#0A6EFF',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 5
  }
});

export default LoginScreen;