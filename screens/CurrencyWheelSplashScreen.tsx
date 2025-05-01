// screens/CurrencyWheelSplashScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Svg, Circle, Path, Line, Rect } from 'react-native-svg';
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
  
  // Loading animation
  const dot1Anim = useRef(new Animated.Value(0.4)).current;
  const dot2Anim = useRef(new Animated.Value(0.4)).current;
  const dot3Anim = useRef(new Animated.Value(0.4)).current;
  
  // Initialization status message
  const [statusMessage, setStatusMessage] = useState('Loading application...');
  
  // For currency wheel markers
  const getMarkerPosition = (index: number, total: number) => {
    const angle = (index * (360 / total)) * (Math.PI / 180);
    const radius = width * 0.25; // Adjust based on screen size
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
    
    // Start loading dots animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient 
        colors={['#9061F9', '#6B46C1']} 
        style={styles.gradient}
      >
        {/* Decorative elements */}
        <View style={[styles.decorativeElement, styles.decoration1]} />
        <View style={[styles.decorativeElement, styles.decoration2]} />
        <View style={[styles.decorativeElement, styles.decoration3]} />
        <View style={[styles.decorativeElement, styles.decoration4]} />
        
        {/* Corner icons */}
        <View style={[styles.iconContainer, styles.topLeft]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.icon}>
            <Circle cx="35" cy="35" r="15" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="65" cy="35" r="15" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Path d="M15,50 C15,80 85,80 85,50 L85,80 L15,80 Z" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
          </Svg>
        </View>
        
        <View style={[styles.iconContainer, styles.topRight]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.icon}>
            <Rect x="15" y="15" width="70" height="70" rx="10" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Line x1="15" y1="35" x2="85" y2="35" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
            <Line x1="35" y1="15" x2="35" y2="35" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
            <Line x1="65" y1="15" x2="65" y2="35" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" />
            <Path d="M25,55 L45,75 L65,55 L75,65 L75,75 L25,75 Z" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="60" cy="50" r="8" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
          </Svg>
        </View>
        
        <View style={[styles.iconContainer, styles.bottomLeft]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.icon}>
            <Path d="M20,20 L80,80 A60,60 0 0,0 20,20 Z" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Path d="M80,20 L20,80 A60,60 0 0,1 80,20 Z" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="50" cy="35" r="5" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="65" cy="50" r="5" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="35" cy="50" r="5" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="50" cy="65" r="5" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
          </Svg>
        </View>
        
        <View style={[styles.iconContainer, styles.bottomRight]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" style={styles.icon}>
            <Path d="M15,50 Q15,40 25,40 L75,40 Q85,40 85,50 L85,60 L15,60 Z" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Rect x="25" y="25" width="50" height="25" rx="12" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="30" cy="60" r="10" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
            <Circle cx="70" cy="60" r="10" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none" />
          </Svg>
        </View>
        
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
        
        {/* Loading Dots and Status Message */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.loadingDot, { opacity: dot1Anim }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot2Anim }]} />
            <Animated.View style={[styles.loadingDot, { opacity: dot3Anim }]} />
          </View>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Decorative elements
  decorativeElement: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 10,
  },
  decoration1: {
    top: '20%',
    left: '10%',
  },
  decoration2: {
    top: '15%',
    right: '15%',
  },
  decoration3: {
    bottom: '25%',
    left: '12%',
  },
  decoration4: {
    bottom: '20%',
    right: '10%',
  },
  // Icon containers
  iconContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  topLeft: {
    top: '15%',
    left: '15%',
  },
  topRight: {
    top: '15%',
    right: '15%',
  },
  bottomLeft: {
    bottom: '15%',
    left: '15%',
  },
  bottomRight: {
    bottom: '15%',
    right: '15%',
  },
  // Currency wheel
  logoContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  wheelBackground: {
    position: 'absolute',
    width: '75%',
    height: '75%',
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
    width: 50,
    height: 50,
    borderRadius: 25,
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
  // Loading container, dots and status message
  loadingContainer: {
    position: 'absolute',
    bottom: '10%',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    marginHorizontal: 8,
  },
  statusMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default CurrencyWheelSplashScreen;