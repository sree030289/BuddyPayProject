// screens/CurrencyWheelSplashScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const { width, height } = Dimensions.get('window');

const CurrencyWheelSplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { user } = useAuth();
  
  // List of currencies to cycle through
  const currencies = ['₹', '$', '€', '£', '¥', '₩', '₽', '฿'];
  const [currentCurrency, setCurrentCurrency] = useState('₹');
  const currencyIndex = useRef(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Initialization status message
  const [statusMessage, setStatusMessage] = useState('Loading application...');
  const loadingProgress = useRef(new Animated.Value(0)).current;
  
  // For currency wheel markers
  const getMarkerPosition = (index: number, total: number) => {
    const angle = (index * (360 / total)) * (Math.PI / 180);
    const radius = width * 0.18; // Reduced radius to fit within the white circle
    const x = Math.sin(angle) * radius;
    const y = -Math.cos(angle) * radius;
    return { x, y };
  };

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Start wheel rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Start center currency pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Start loading animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingProgress, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true, 
        }),
        Animated.timing(loadingProgress, {
          toValue: 0,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Currency changing interval
    const interval = setInterval(() => {
      currencyIndex.current = (currencyIndex.current + 1) % currencies.length;
      setCurrentCurrency(currencies[currencyIndex.current]);
    }, 1000);
    
    // Show initialization status messages
    setStatusMessage('Checking device capabilities...');
    setTimeout(() => setStatusMessage('Initializing app settings...'), 1000);
    setTimeout(() => setStatusMessage('Preparing your experience...'), 2000);
    setTimeout(() => setStatusMessage('Almost ready...'), 3000);
    
    // Authentication check and navigation
    const timer = setTimeout(async () => {
      try {
        setStatusMessage('Checking account status...');
        
        if (user) {
          navigation.replace('MainDashboard', { screen: 'Friends' });
          return;
        }

        const hasStoredCredentials = await checkStoredCredentials();
        
        if (hasStoredCredentials) {
          navigation.replace('PINEntryScreen');
        } else {
          navigation.replace('RegistrationScreen');
        }
      } catch (error) {
        console.error('Error during authentication check:', error);
        setStatusMessage('Redirecting to registration...');
        navigation.replace('RegistrationScreen');
      }
    }, 4000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim, rotateAnim, navigation, user]);

  // Check if we have stored credentials
  const checkStoredCredentials = async () => {
    try {
      const hasCredentials = await SecureStore.getItemAsync('has_stored_credentials');
      return hasCredentials === 'true';
    } catch (error) {
      console.error('Error checking stored credentials:', error);
      return false;
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient 
        colors={['#9061F9', '#6B46C1']} 
        style={styles.gradient}
      >        
        {/* Currency Wheel */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Wheel background */}
          <View style={styles.wheelBackground} />
          
          {/* Rotating wheel with currency markers */}
          <Animated.View style={[styles.currencyWheel, { transform: [{ rotate: spin }] }]}>
            {currencies.map((currency, index) => {
              const position = getMarkerPosition(index, currencies.length);
              return (
                <View 
                  key={index}
                  style={[
                    styles.currencyMarker,
                    {
                      transform: [
                        { translateX: position.x },
                        { translateY: position.y },
                      ]
                    }
                  ]}
                >
                  <Text style={styles.currencySymbol}>{currency}</Text>
                </View>
              );
            })}
          </Animated.View>
          
          {/* Center currency that pulses */}
          <Animated.View 
            style={[
              styles.centerCurrency,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Text style={styles.centerSymbol}>{currentCurrency}</Text>
          </Animated.View>
        </Animated.View>
        
        {/* App Name and Tagline */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.appTitle}>BuddyPay</Text>
          <Text style={styles.appTagline}>Split expenses with friends</Text>
        </Animated.View>
        
        {/* Loading Status */}
        <View style={styles.loadingContainer}>
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map(i => (
              <Animated.View 
                key={i}
                style={[
                  styles.loadingDot,
                  {
                    opacity: loadingProgress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1, 0.3],
                      extrapolate: 'clamp'
                    }),
                    transform: [
                      { 
                        scale: loadingProgress.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.7, 1, 0.7],
                          extrapolate: 'clamp'
                        }) 
                      }
                    ]
                  }
                ]}
              />
            ))}
          </View>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  // Currency wheel
  logoContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  wheelBackground: {
    position: 'absolute',
    width: '85%',
    height: '85%',
    borderRadius: 1000, // Large value to ensure it's a circle
    backgroundColor: 'white',
  },
  currencyWheel: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(144, 97, 249, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9061F9',
  },
  centerCurrency: {
    position: 'absolute',
    width: '40%',
    height: '40%',
    borderRadius: 1000, // Large value to ensure it's a circle
    backgroundColor: '#9061F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centerSymbol: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  // App title and tagline
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  // Loading container with progress bar
  loadingContainer: {
    position: 'absolute',
    bottom: '10%',
    width: '80%',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 60,
    marginBottom: 16,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  statusMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CurrencyWheelSplashScreen;