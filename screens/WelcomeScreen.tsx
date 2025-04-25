import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const WelcomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to BuddyPay</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Register')}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('LoginScreen')}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
    fontWeight: '600',
    color: '#0A6EFF',
  },
  button: {
    width: '80%',
    padding: 15,
    backgroundColor: '#0A6EFF',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#7EA9F9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
