// Updated SetPINScreen.tsx to store plaintext password for PIN auth
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { db, auth } from '../services/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SetPINScreen = ({ navigation, route }: any) => {
  const [pin, setPin] = useState('');
  const { name, email, mobile, password } = route.params || {};

  useEffect(() => {
    if (pin.length === 4) {
      checkAndSubmit();
    }
  }, [pin]);

  const hash = async (val: string) => {
    if (typeof val !== 'string') {
      throw new Error('Invalid input to hash. Expected a string.');
    }
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, val);
  };

  const checkAndSubmit = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('No Internet', 'Please check your internet connection and try again.');
      return;
    }

    if (!password || !pin) {
      Alert.alert('Missing Info', 'Password or PIN is missing.');
      return;
    }

    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Hash the password and PIN
      const hashedPassword = await hash(password);
      const hashedPin = await hash(pin);

      // Store user data in Firestore with the PLAIN PASSWORD for PIN auth
      await setDoc(doc(db, 'users', mobile), {
        name,
        email,
        phone: mobile,
        password: hashedPassword,
        pin: hashedPin,
        userId: userId,
        // Add these fields for PIN authentication
        plainCredentials: password,  // Store plain password for PIN auth
        createdAt: serverTimestamp(),
      });

      // Also store credentials in a separate collection for PIN auth
      await setDoc(doc(db, 'credentials', userId), {
        originalPassword: password,
        email: email
      });

      // Store user data in AsyncStorage for persistence
      const userData = { uid: userId, email, name, phone: mobile };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Navigate to success screen with user data
      navigation.replace('RegistrationSuccess', {
        userId: userId,
        email: email,
        name: name,
        phone: mobile
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDigitPress = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const renderKey = (label: string, onPress: () => void, key?: string) => (
    <TouchableOpacity key={key || label} style={styles.key} onPress={onPress}>
      <Text style={styles.keyText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Set Your 4-Digit PIN</Text>

      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[styles.dot, { backgroundColor: pin.length > i ? '#0A6EFF' : '#ccc' }]}
          />
        ))}
      </View>

      <View style={styles.keypadContainer}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', '←'],
        ].map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keyRow}>
            {row.map((key, colIndex) => {
              if (key === '') return <View style={styles.key} key={`empty-${colIndex}`} />;
              if (key === '←') return renderKey('←', handleBackspace, 'back');
              return renderKey(key, () => handleDigitPress(key));
            })}
          </View>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
};

export default SetPINScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fb',
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0A6EFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginHorizontal: 10,
  },
  keypadContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  key: {
    flex: 1,
    marginHorizontal: 6,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 28,
    color: '#111',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  backText: {
    color: '#0A6EFF',
    fontSize: 16,
  },
});