import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';

const AccountScreen = ({ route }: any) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading, logout } = useAuth(); // Use the auth context with logout method
  
  // Get the user's name with fallbacks for different properties
  const getUserName = () => {
    // First priority: user.name
    if (user?.name) return user.name;
    
    // Second priority: user.displayName
    if (user?.displayName) return user.displayName;
    
    // Third priority: use first part of email if available
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    // Final fallback
    return 'User';
  };
  
  const userName = getUserName();
  
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              // Use the logout method from AuthContext instead of directly calling Firebase
              await logout(navigation);
              // Navigate to welcome screen after logout
              // navigation.replace('WelcomeScreen');
            } catch (error) {
              Alert.alert('Logout Error', 'An error occurred during logout');
            }
          }
        }
      ]
    );
  };

  const optionItems = [
    { icon: 'person-outline', title: 'Edit Profile', onPress: () => {} },
    { icon: 'notifications-outline', title: 'Notifications', onPress: () => {} },
    { icon: 'settings-outline', title: 'Settings', onPress: () => {} },
    { icon: 'help-circle-outline', title: 'Help & Support', onPress: () => {} },
    { icon: 'log-out-outline', title: 'Logout', onPress: handleLogout }
  ];

  // Show loading state while auth data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.screenContainer}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Account</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email available'}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {optionItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.optionItem} onPress={item.onPress}>
              <Icon name={item.icon as any} size={24} color="#0A6EFF" />
              <Text style={styles.optionTitle}>{item.title}</Text>
              <Icon name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>BuddyPay v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A6EFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5
  },
  userEmail: {
    fontSize: 14,
    color: '#666'
  },
  optionsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden'
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  optionTitle: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16
  },
  versionText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#999',
    fontSize: 12
  }
});
export default AccountScreen;