// Updated VerifyContactsScreen.tsx with fixed data structure
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  Share
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import { db } from '../services/firebaseConfig';
import { collection, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

type VerifyContactsRouteProp = RouteProp<RootStackParamList, 'VerifyContactsScreen'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface Contact {
  id: string;
  name: string;
  email?: string;
  phoneNumbers?: {number: string}[];
  selected: boolean;
}

const VerifyContactsScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<VerifyContactsRouteProp>();
  const { user } = useAuth();
  
  // Extract parameters with proper type checking
  const selectedContacts = route.params.selectedContacts || [];
  const groupId = route.params.groupId || '';
  const groupName = route.params.groupName || 'Group';
  const userId = route.params.userId || user?.uid;
  
  // State variables
  const [loading, setLoading] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<any>(null);

  // For UI visibility
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Check if this is a group flow or a friend flow
  const isGroupFlow = !!groupId;
  
  useEffect(() => {
    if (isGroupFlow) {
      // Fetch group data for better context
      fetchGroupData();
      // Create a single invite token for the group
      createGroupInviteToken();
    }
  }, []);
  
  const fetchGroupData = async () => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        setGroupData(groupSnap.data());
      } else {
        console.error('Group not found:', groupId);
        Alert.alert('Error', 'Could not find the group');
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    }
  };
  
  const createGroupInviteToken = async () => {
    // In a real implementation, this would call a Cloud Function to generate a token
    // For now, we'll just create a simple token based on the group ID and timestamp
    setInviteToken(`${groupId}-${Date.now()}`);
  };

  const handleAddToGroup = async () => {
    if (!user || !groupId) {
      Alert.alert('Error', 'User or group information missing');
      return;
    }
    
    setLoading(true);
    setSendingInvites(true);
    setCurrentIndex(0);
    
    try {
      const inviteLink = inviteToken ? 
        `buddypay://join-group?token=${inviteToken}` : 
        'Download BuddyPay app to join the group';
      
      // Process contacts for the group
      const formattedMembers = selectedContacts.map((contact: Contact) => {
        // Create properly structured member object with no undefined fields
        const memberObj: any = {
          uid: `temp_${contact.id}_${Date.now()}`, // Temporary ID for non-app users
          name: contact.name || 'Unknown User',
          isAdmin: false,
          balance: 0
        };
        
        // Only add email if it exists
        if (contact.email) {
          memberObj.email = contact.email;
        }
        
        // Only add phone if it exists
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          memberObj.phone = contact.phoneNumbers[0].number;
        }
        
        return memberObj;
      });
      
      // Add members to the group
      const groupRef = doc(db, 'groups', groupId);
      
      // Get current group data to check if members array exists
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        
        if (Array.isArray(groupData.members)) {
          // If members array exists, add each member individually
          for (let i = 0; i < formattedMembers.length; i++) {
            setCurrentIndex(i);
            await updateDoc(groupRef, {
              members: arrayUnion(formattedMembers[i])
            });
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } else {
          // If members array doesn't exist, create it with all new members
          await updateDoc(groupRef, {
            members: formattedMembers
          });
        }
        
        // Simulate sending invites
        // In a real app, you'd call a Cloud Function to send SMS/email invites
        for (let i = 0; i < formattedMembers.length; i++) {
          setCurrentIndex(i);
          const member = formattedMembers[i];
          
          // Simulate sharing invite
          if (i === 0 && (member.phone || member.email)) {
            try {
              const message = `${user.displayName || 'Someone'} has invited you to join "${groupName}" on BuddyPay. Download the app and use this code: ${inviteToken}`;
              
              // In a real app, this would send an SMS or email
              // For now, just open the Share dialog for the first member
              await Share.share({
                message: message,
                title: 'Join BuddyPay Group'
              });
            } catch (error) {
              console.error('Error sharing invite:', error);
            }
          }
          
          // Simulate delay for progress indication
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setAddedCount(formattedMembers.length);
        setLoading(false);
        setShowSuccess(true);
        
        // Success message
        setTimeout(() => {
          Alert.alert(
            'Success',
            `Added ${formattedMembers.length} contacts to the group.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to group dashboard with refresh flag
                  navigation.navigate('GroupDashboardScreen', {
                    groupId,
                    groupName,
                    refresh: true
                  });
                }
              }
            ]
          );
        }, 1000);
      } else {
        throw new Error('Group not found');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error adding members to group:', error);
      Alert.alert(
        'Error',
        'Failed to add members to the group. Please try again.'
      );
    }
  };

  const handleAddToFriends = async () => {
    // Implementation for friends flow
    Alert.alert('Not Implemented', 'This feature is coming soon!');
  };

  const renderContactItem = ({ item, index }: { item: Contact; index: number }) => {
    const contactEmail = item.email || 'No email';
    const contactPhone = item.phoneNumbers && item.phoneNumbers.length > 0
      ? item.phoneNumbers[0].number
      : 'No phone';

    return (
      <View style={styles.contactItem}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactDetail}>{contactPhone}</Text>
          {item.email && <Text style={styles.contactDetail}>{contactEmail}</Text>}
        </View>
        
        {loading && currentIndex === index && (
          <ActivityIndicator size="small" color="#0A6EFF" />
        )}
        
        {showSuccess && (
          <Icon name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isGroupFlow ? 'Add to Group' : 'Add to Friends'}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>
            {loading ? 'Adding contacts...' : 
             showSuccess ? 'Contacts added successfully!' : 
             `Ready to add ${selectedContacts.length} contacts`}
          </Text>
          
          {isGroupFlow && (
            <Text style={styles.summarySubtitle}>
              These contacts will be added to "{groupName}" and invited to join BuddyPay
            </Text>
          )}
          
          {loading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(currentIndex + 1) / selectedContacts.length * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentIndex + 1} of {selectedContacts.length}
              </Text>
            </View>
          )}
        </View>

        {/* Contacts List */}
        <FlatList
          data={selectedContacts}
          renderItem={renderContactItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />

        {/* Action Button */}
        {!loading && !showSuccess && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={isGroupFlow ? handleAddToGroup : handleAddToFriends}
            >
              <Text style={styles.addButtonText}>
                {isGroupFlow ? 'Add to Group' : 'Add to Friends'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  summaryContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#666'
  },
  progressContainer: {
    marginTop: 16
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A6EFF',
    borderRadius: 3
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right'
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  contactDetail: {
    fontSize: 13,
    color: '#666'
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  addButton: {
    backgroundColor: '#0A6EFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default VerifyContactsScreen;