// FriendSettingsScreen.tsx - Simplified Version
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { getAuth } from 'firebase/auth';

// Define the props for this screen
type FriendSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'FriendSettingsScreen'>;

function FriendSettingsScreen({ route, navigation }: FriendSettingsScreenProps) {
  // Extract friend details directly from route params
  const { 
    friendId = '',
    friendName = 'Friend', 
    email = '' 
  } = route.params;
  
  console.log("FriendSettingsScreen opened with params:", {
    friendId, 
    friendName,
    email
  });
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  // Mock shared groups data for UI preview
  const [sharedGroups] = useState([
    { id: '1', name: 'Goa Trip' },
    { id: '2', name: 'Roommates' }
  ]);
  
  const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
  const [showReportAbuseModal, setShowReportAbuseModal] = useState(false);
  const [showSharedGroupsModal, setShowSharedGroupsModal] = useState(false);
  
  // Helper function for avatar color
  const getAvatarColor = (name: string) => {
    const bgColors = ['#F44336', '#9C27B0', '#FF9800', '#3F51B5', '#4CAF50', '#009688'];
    return bgColors[name.charCodeAt(0) % bgColors.length];
  };
  
  // Mock handlers
  const handleRemoveFromFriendsList = () => {
    if (sharedGroups.length > 0) {
      setShowSharedGroupsModal(true);
      return;
    }
    
    Alert.alert('Success', 'Friend removed successfully');
    navigation.navigate('MainDashboard', {
      screen: 'Friends',
      refresh: true
    });
  };
  
  const handleBlockUser = () => {
    setShowBlockConfirmModal(true);
  };
  
  const confirmBlockUser = () => {
    Alert.alert('Success', `${friendName} has been blocked`);
    setShowBlockConfirmModal(false);
    navigation.navigate('MainDashboard', {
      screen: 'Friends',
      refresh: true
    });
  };
  
  const handleReportAbuse = () => {
    setShowReportAbuseModal(true);
  };
  
  const confirmReportAbuse = () => {
    Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    setShowReportAbuseModal(false);
  };
  
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
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>
      
      {/* Actions */}
      <View style={styles.actionList}>
        <TouchableOpacity style={styles.action}>
          <Text style={styles.actionText}>Manage relationship</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.action} onPress={handleRemoveFromFriendsList}>
          <Text style={styles.actionText}>Remove from friends list</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.action} onPress={handleBlockUser}>
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
          <Text style={styles.sectionTitle}>Shared</Text>
          
          {sharedGroups.map((group) => (
            <TouchableOpacity 
              key={group.id} 
              style={styles.groupItem}
              onPress={() => {
                // Navigate to group details/settings
                navigation.navigate('GroupDashboardScreen', { groupId: group.id });
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
              >
                <Text style={styles.buttonTextBlock}>Block</Text>
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
              This feature reports abuse or unwanted communication from {email}.
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
    backgroundColor: '#b71c1c',
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