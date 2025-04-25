import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../components/AuthContext';
import GroupService from '../services/GroupService';
import { RootStackParamList } from '../types';

type JoinGroupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'JoinGroupScreen'>;

const JoinGroupScreen = () => {
  const navigation = useNavigation<JoinGroupScreenNavigationProp>();
  const { user } = useAuth();
  
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    // Check for incoming deep links
    checkDeepLink();
    
    // Set up linking listener
    const linkingListener = Linking.addEventListener('url', handleDeepLink);
    
    return () => {
      linkingListener.remove();
    };
  }, []);
  
  const checkDeepLink = async () => {
    // Check if app was opened with a URL
    const initialURL = await Linking.getInitialURL();
    if (initialURL) {
      handleUrl(initialURL);
    }
  };
  
  const handleDeepLink = (event: { url: string }) => {
    handleUrl(event.url);
  };
  
  const handleUrl = (url: string) => {
    // Parse the URL to extract token
    // Example: buddypay://join-group?token=abc123
    if (url.includes('join-group')) {
      try {
        const token = url.split('token=')[1];
        if (token) {
          setInviteLink(token);
        }
      } catch (error) {
        console.error('Error parsing deep link:', error);
      }
    }
  };
  
  const handleJoinGroup = async () => {
    if (!inviteLink.trim()) {
      Alert.alert('Enter Invite Code', 'Please enter a valid invite code.');
      return;
    }
    
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'You need to be logged in to join a group.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PINEntryScreen')
          }
        ]
      );
      return;
    }
    
    setLoading(true);
    setLoadingText('Joining group...');
    
    try {
      // Format user data for group membership
      const memberData = {
        uid: user.uid,
        name: user.displayName || user.name || 'User',
        email: user.email || undefined,
        phone: user.phone || undefined,
        isAdmin: false,
        balance: 0
      };
      
      // Join the group using the token
      const groupId = await GroupService.joinGroupWithToken(
        inviteLink.trim(),
        memberData
      );
      
      // Success! Navigate to the group dashboard
      setLoading(false);
      
      Alert.alert(
        'Success!',
        'You have joined the group successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back first
              navigation.goBack();
              
              // Then navigate to the GroupDashboardScreen
              navigation.navigate('GroupDashboardScreen', {
                groupId,
                groupName: 'Group', // This will be updated when the screen loads
                refresh: true
              });
            }
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('Error joining group:', error);
      Alert.alert(
        'Error Joining Group',
        error instanceof Error 
          ? error.message 
          : 'Failed to join the group. The invite may be invalid or expired.'
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join a Group</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Icon name="information-circle-outline" size={24} color="#0A6EFF" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Join a group by entering an invite code shared with you.
            </Text>
          </View>
          
          <Text style={styles.inputLabel}>Enter invite code</Text>
          <TextInput
            style={styles.inviteInput}
            placeholder="Paste invite code here"
            value={inviteLink}
            onChangeText={setInviteLink}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity 
            style={[styles.joinButton, !inviteLink.trim() && styles.joinButtonDisabled]}
            onPress={handleJoinGroup}
            disabled={!inviteLink.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="log-in-outline" size={22} color="#fff" />
                <Text style={styles.joinButtonText}>Join Group</Text>
              </>
            )}
          </TouchableOpacity>
          
          {loading && (
            <Text style={styles.loadingText}>{loadingText}</Text>
          )}
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24
  },
  infoCard: {
    backgroundColor: '#E6F0FF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  infoIcon: {
    marginRight: 12
  },
  infoText: {
    flex: 1,
    color: '#333',
    fontSize: 14,
    lineHeight: 20
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8
  },
  inviteInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  joinButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  joinButtonDisabled: {
    backgroundColor: '#0A6EFF80'
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666'
  }
});

export default JoinGroupScreen;