import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegistrationSuccess = ({ navigation, route }: any) => {
  // Extract user data passed from SetPINScreen
  const { userId, email, name, phone } = route.params || {};

  useEffect(() => {
    // Store user data in AsyncStorage as a backup
    const storeUserData = async () => {
      if (userId && email) {
        try {
          await AsyncStorage.setItem('user', JSON.stringify({ uid: userId, email, name, phone }));
          console.log('User data stored in AsyncStorage');
        } catch (error) {
          console.error('Failed to store user data:', error);
        }
      }
    };
    
    storeUserData();
  }, [userId, email, name, phone]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Registration Successful!</Text>
      <Text style={styles.subtitle}>You're all set to start splitting smarter.</Text>

      {/* Navigate to MainDashboard with Friends screen */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log('Navigating to MainDashboard with:', { userId, email });
          // Navigate to MainDashboard with proper params structure for the Friends screen
          navigation.reset({
            index: 0,
            routes: [{ 
              name: 'MainDashboard', 
              params: {
                screen: 'Friends',
                params: {  // Nested params for the FriendsScreen
                  userId: userId,
                  email: email,
                  toastStatus: 'Account created successfully!',
                  refreshTrigger: 1,
                  hideTabBar: true // Key parameter to hide default tab bar
                },
                hideTabBar: true // Also include at the top level
              }
            }],
          });
        }}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RegistrationSuccess;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,

  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0A6EFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0A6EFF',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});