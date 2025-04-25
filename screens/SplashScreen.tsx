// Updated SplashScreen.tsx with direct navigation to registration
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { user } = useAuth();
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  
  // Loading bar animation
  const [loadingAnim] = useState(new Animated.Value(0));
  
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
    
    // Start loading bar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Check authentication after animation completes
    const checkAuthenticationStatus = async () => {
      try {
        // Wait for animation to complete
        setTimeout(async () => {
          // Check if user is already authenticated
          if (user) {
            console.log('User already logged in, navigating to dashboard');
            navigation.replace('MainDashboard', { screen: 'Friends' });
            return;
          }

          // Check if we have login credentials in secure storage
          const hasStoredCredentials = await checkStoredCredentials();
          
          if (hasStoredCredentials) {
            // User has registered before, go to PIN entry
            console.log('Credentials found, going to PIN entry screen');
            navigation.replace('PINEntryScreen');
          } else {
            // No stored credentials, go directly to registration
            console.log('No stored credentials, navigating to registration screen');
            navigation.replace('RegistrationScreen');
          }
        }, 2200); // Wait for 2.2 seconds to show splash screen
      } catch (error) {
        console.error('Error during authentication check:', error);
        // If any error occurs, go to registration
        navigation.replace('RegistrationScreen');
      }
    };

    checkAuthenticationStatus();
  }, [fadeAnim, scaleAnim, loadingAnim, navigation, user]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={['#0A2E64', '#0055A4', '#0A78DD']}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoBox}>
            <Icon name="cash-outline" size={60} color="#0A6EFF" />
          </View>
          <Text style={styles.appName}>BuddyPay</Text>
          <Text style={styles.tagline}>Split expenses with friends</Text>
        </Animated.View>
        
        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  transform: [
                    {
                      translateX: loadingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100]
                      })
                    }
                  ]
                }
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Checking account status...</Text>
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
  logoContainer: {
    alignItems: 'center',
  },
  logoBox: {
    width: 96,
    height: 96,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 24,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingBar: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    width: 50,
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});

export default SplashScreen;