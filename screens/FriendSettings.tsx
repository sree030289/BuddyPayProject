import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import FriendService from '../services/FriendService';

// Define the props for this screen
type FriendSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'FriendSettingsScreen'>;

function FriendSettingsScreen({ route, navigation }: FriendSettingsScreenProps) {
  // Extract friend details directly from route params
  const { 
    friendId = '',
    friendName = 'Friend', 
    email: userEmail = '' 
  } = route.params;
  
  const [friendEmail, setFriendEmail] = useState('');
  const [friendPhone, setFriendPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sharedGroups, setSharedGroups] = useState<any[]>([]);
  
  console.log("FriendSettingsScreen opened with params:", {
    friendId, 
    friendName,
    userEmail
  });
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  // Fetch friend's contact information and shared groups
  useEffect(() => {
    const fetchFriendInfo = async () => {
      try {
        setLoading(true);
        // Try to find friend by ID
        if (friendId) {
          const userQuery = query(collection(db, 'users'), where('uid', '==', friendId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setFriendEmail(userData.email || '');
            setFriendPhone(userData.phone || '');
          }
        }
        
        // If we couldn't find by ID, try with the current user's friends collection
        if (currentUser && currentUser.email) {
          const userQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userPhone = userData.phone;
            
            if (userPhone) {
              // Get friend data from user's friends collection
              const friendsRef = collection(db, 'users', userPhone, 'friends');
              const friendsQuery = query(friendsRef, where('name', '==', friendName));
              const friendsSnapshot = await getDocs(friendsQuery);
              
              if (!friendsSnapshot.empty) {
                const friendDoc = friendsSnapshot.docs[0];
                const friendData = friendDoc.data();
                
                setFriendEmail(friendData.email || '');
                setFriendPhone(friendData.phone || '');
                
                // Get shared groups
                if (friendData.groups && Array.isArray(friendData.groups)) {
                  setSharedGroups(friendData.groups);
                }
              }
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching friend info:", error);
        setLoading(false);
      }
    };
    
    fetchFriendInfo();
  }, [friendId, friendName, currentUser]);
  
  // Helper function to navigate to the Friends screen
  const navigateToFriendsScreen = (toastMessage: string) => {
    // Use CommonActions.reset which is more reliable for nested navigation
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainDashboard',
            state: {
              routes: [
                { 
                  name: 'Friends', 
                  params: { 
                    refresh: true, 
                    refreshTrigger: Date.now(),
                    toastStatus: toastMessage 
                  } 
                }
              ],
              index: 0
            }
          }
        ]
      })
    );
  };
  
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [showReportAbuseModal, setShowReportAbuseModal] = useState(false);
  const [showSharedGroupsModal, setShowSharedGroupsModal] = useState(false);
  
  // Helper function for avatar color
  const getAvatarColor = (name: string) => {
    const bgColors = ['#F44336', '#9C27B0', '#FF9800', '#3F51B5', '#4CAF50', '#009688'];
    return bgColors[name.charCodeAt(0) % bgColors.length];
  };
  
  // Handle removing friend
  const handleRemoveFromFriendsList = async () => {
    if (sharedGroups.length > 0) {
      setShowSharedGroupsModal(true);
      return;
    }
    
    try {
      setActionLoading(true);
      
      // Get current user's phone number
      const userQuery = query(collection(db, 'users'), where('email', '==', currentUser?.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('Your user account not found');
      }
      
      const userData = userSnapshot.docs[0].data();
      const userPhone = userData.phone;
      
      if (!userPhone) {
        throw new Error('Your phone number not found');
      }
      
      // Call FriendService to remove friend
      await FriendService.removeFriend(userPhone, friendId);
      
      setActionLoading(false);
      Alert.alert('Success', 'Friend removed successfully');
      navigateToFriendsScreen('Friend removed successfully');
    } catch (error) {
      setActionLoading(false);
      console.error('Error removing friend:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to remove friend');
    }
  };
  
  const handleBlockUser = () => {
    setShowBlockConfirmModal(true);
  };
  
  const confirmBlockUser = async () => {
    try {
      setActionLoading(true);
      
      // Get current user's phone number
      const userQuery = query(collection(db, 'users'), where('email', '==', currentUser?.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('Your user account not found');
      }
      
      const userData = userSnapshot.docs[0].data();
      const userPhone = userData.phone;
      
      if (!userPhone) {
        throw new Error('Your phone number not found');
      }
      
      // Call FriendService to block friend
      await FriendService.blockFriend(userPhone, friendId);
      
      setActionLoading(false);
      setShowBlockConfirmModal(false);
      Alert.alert('Success', `${friendName} has been blocked`);
      navigateToFriendsScreen('Friend blocked successfully');
    } catch (error) {
      setActionLoading(false);
      console.error('Error blocking friend:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to block friend');
      setShowBlockConfirmModal(false);
    }
  };
  
  const handleReportAbuse = () => {
    setShowReportAbuseModal(true);
  };
  
  const confirmReportAbuse = () => {
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    setShowReportAbuseModal(false);
  };
  
  // Determine what contact info to display
  const contactInfo = friendEmail || friendPhone || 'No contact info';
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading friend information...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend settings</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Friend Info */}
      <View style={styles.profileSection}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor(friendName) }]}>
          <Text style={styles.avatarText}>{friendName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{friendName}</Text>
          <Text style={styles.email}>{contactInfo}</Text>
        </View>
      </View>
      
      {/* Actions */}
      <View style={styles.actionList}>
        <TouchableOpacity style={styles.action}>
          <Text style={styles.actionText}>Manage relationship</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.action} 
          onPress={handleRemoveFromFriendsList}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#0A6EFF" />
          ) : (
            <Text style={styles.actionText}>Remove from friends list</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.action} 
          onPress={handleBlockUser}
          disabled={actionLoading}
        >
          <Text style={styles.actionText}>Block {friendName}</Text>
          <Text style={styles.actionSubtext}>
            Remove from friends list, hide any groups you share, and suppress future expenses/notifications.
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.action} onPress={handleReportAbuse}>
          <Text style={styles.actionText}>Report {friendName}</Text>
          <Text style={styles.actionSubtext}>Flag an abusive account</Text>
        </TouchableOpacity>
      </View>
      
      {/* Shared Groups */}
      {sharedGroups.length > 0 && (
        <View style={styles.sharedSection}>
          <Text style={styles.sectionTitle}>Shared Groups</Text>
          
          {sharedGroups.map((group) => (
            <TouchableOpacity 
              key={group.id} 
              style={styles.groupItem}
              onPress={() => {
                // Navigate to group details/settings
                navigation.navigate('GroupDashboardScreen', { 
                  groupId: group.id,
                  groupName: group.name
                });
              }}
            >
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={24} color="white" />
              </View>
              <Text style={styles.groupName}>{group.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Shared Groups Modal */}
      <Modal
        visible={showSharedGroupsModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>You have shared groups</Text>
            <Text style={styles.modalText}>
              If you wish to remove this person from your friends list, you will need to delete
              them (or yourself) from your groups, or remove the groups entirely.
            </Text>
            <Text style={styles.modalText}>
              You can access these settings by tapping on a group on this screen.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSharedGroupsModal(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Block User Confirmation Modal */}
      <Modal
        visible={showBlockConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Block {friendName}?</Text>
            <Text style={styles.modalText}>
              This will remove this user from your friends list, hide any groups you share,
              and suppress future expenses/notifications from them.
            </Text>
            <Text style={styles.modalText}>
              This user will NOT be notified about the block.
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonCancel]}
                onPress={() => setShowBlockConfirmModal(false)}
              >
                <Text style={styles.buttonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.buttonConfirm]}
                onPress={confirmBlockUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonTextBlock}>Block</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Report Abuse Modal */}
      <Modal
        visible={showReportAbuseModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              This feature reports abuse or unwanted communication from {contactInfo}.
              Would you like to report abuse from this user?
            </Text>
            <TouchableOpacity
              style={[styles.modalFullButton, styles.buttonReport]}
              onPress={confirmReportAbuse}
            >
              <Text style={styles.buttonTextReport}>Report abuse by {friendName}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalFullButton}
            >
              <Text style={styles.modalButtonText}>Other customer support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalFullButton}
              onPress={() => setShowReportAbuseModal(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff7043',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  actionList: {
    marginTop: 16,
  },
  action: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  actionText: {
    fontSize: 16,
  },
  actionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sharedSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0A6EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groupName: {
    flex: 1,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  modalButton: {
    padding: 16,
    alignItems: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  buttonCancel: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e0e0e0',
  },
  buttonConfirm: {
    flex: 1,
  },
  buttonTextCancel: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonTextBlock: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonTextReport: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalFullButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  buttonReport: {
    borderTopWidth: 0,
  },
});

export default FriendSettingsScreen;