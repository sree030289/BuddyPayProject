// Updated GroupSettingsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../components/AuthContext';
import GroupService from '../services/GroupService';

interface GroupSettingsScreenProps {
  navigation: any;
  route: any;
}

interface GroupMember {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
  balance?: number;
}

const GroupSettingsScreen = ({ navigation, route }: GroupSettingsScreenProps) => {
  const { groupId, groupName, groupType } = route.params;
  const { user } = useAuth(); // Get user from AuthContext
  
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [simplifyDebts, setSimplifyDebts] = useState(false);
  const [defaultSplit, setDefaultSplit] = useState('equal');
  const [error, setError] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberActions, setShowMemberActions] = useState(false);
  
  // Animation value for QR code
  const qrScaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    fetchGroupData();
  }, []);
  
  // QR code pulse animation
  useEffect(() => {
    if (showQRModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(qrScaleAnim, {
            toValue: 1.05,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(qrScaleAnim, {
            toValue: 0.95,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      qrScaleAnim.setValue(1);
    }
    
    return () => {
      qrScaleAnim.stopAnimation();
    };
  }, [showQRModal]);

  const fetchGroupData = async () => {
    setLoading(true);
    try {
      const groupData = await GroupService.getGroup(groupId);
      
      if (groupData) {
        // Set members
        if (groupData.members && Array.isArray(groupData.members)) {
          setMembers(groupData.members);
          
          // Check if current user is admin
          if (user) {
            const isAdmin = groupData.members.some((member: GroupMember) => 
              member.uid === user.uid && member.isAdmin
            );
            setCurrentUserIsAdmin(isAdmin);
          }
        }
        
        // Set group settings
        setSimplifyDebts(groupData.simplifyDebts || false);
        setDefaultSplit(groupData.defaultSplit || 'equal');
        
        setLoading(false);
      } else {
        setError('Group not found');
        setLoading(false);
      }
    } catch (e) {
      console.error('Error fetching group data:', e);
      setError('Failed to load group details');
      setLoading(false);
    }
  };

  const handleToggleSimplifyDebts = async () => {
    const newValue = !simplifyDebts;
    setSimplifyDebts(newValue);
    
    try {
      await GroupService.updateGroupSettings(groupId, {
        simplifyDebts: newValue
      });
    } catch (error) {
      console.error('Error updating group setting:', error);
      Alert.alert('Error', 'Failed to update group setting');
      setSimplifyDebts(!newValue); // Revert UI if update fails
    }
  };

  const handleAddMembers = () => {
    navigation.navigate('AddGroupMembersScreen', {
      groupId,
      groupName
    });
  };

  const handleCreateInviteLink = async () => {
    if (!user) {
      Alert.alert('Authentication Error', 'You must be logged in to create an invite link');
      return;
    }
    
    try {
      setLoading(true);
      const token = await GroupService.createGroupInviteLink(groupId, user.uid);
      setInviteToken(token);
      setLoading(false);
      setShowQRModal(true);
    } catch (error) {
      setLoading(false);
      console.error('Error creating invite link:', error);
      Alert.alert('Error', 'Failed to create invite link');
    }
  };
  
  const handleCopyInviteLink = async () => {
    if (!inviteToken) return;
    
    const inviteLink = `buddypay://join-group?token=${inviteToken}`;
    
    try {
      await Clipboard.setStringAsync(inviteLink);
      setInviteLinkCopied(true);
      
      // Reset the copied state after 3 seconds
      setTimeout(() => {
        setInviteLinkCopied(false);
      }, 3000);
    } catch (error) {
      console.error('Error copying link:', error);
      Alert.alert('Error', 'Failed to copy invite link');
    }
  };
  
  const handleShareLink = async () => {
    if (!inviteToken) {
      await handleCreateInviteLink();
    }
    
    if (inviteToken) {
      try {
        const inviteLink = `Join my BuddyPay group "${groupName}" with this link: buddypay://join-group?token=${inviteToken}`;
        
        await Share.share({
          message: inviteLink
        });
      } catch (error) {
        console.error('Error sharing link:', error);
        Alert.alert('Error', 'Failed to share invite link');
      }
    }
  };
  
  const handleMemberLongPress = (member: GroupMember) => {
    // Only admins can manage other members
    if (!currentUserIsAdmin) return;
    
    // Don't allow actions on yourself
    if (member.uid === user?.uid) return;
    
    setSelectedMember(member);
    setShowMemberActions(true);
  };
  
  const toggleMemberAdminStatus = async () => {
    if (!selectedMember || !currentUserIsAdmin) return;
    
    try {
      const newAdminStatus = !selectedMember.isAdmin;
      await GroupService.makeUserAdmin(groupId, selectedMember.uid, newAdminStatus);
      
      // Update the local state
      setMembers(members.map(member => {
        if (member.uid === selectedMember.uid) {
          return { ...member, isAdmin: newAdminStatus };
        }
        return member;
      }));
      
      setShowMemberActions(false);
      
      Alert.alert(
        'Success', 
        `${selectedMember.name} is ${newAdminStatus ? 'now' : 'no longer'} an admin`
      );
    } catch (error) {
      console.error('Error updating admin status:', error);
      Alert.alert('Error', 'Failed to update admin status');
    }
  };
  
  const removeMemberFromGroup = async () => {
    if (!selectedMember || !currentUserIsAdmin) return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${selectedMember.name} from the group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if member has outstanding balances
              const hasBalances = await GroupService.hasOutstandingBalances(
                groupId, 
                selectedMember.uid
              );
              
              if (hasBalances) {
                Alert.alert(
                  'Cannot Remove Member',
                  'This member has outstanding balances. They need to settle up before they can be removed.'
                );
                return;
              }
              
              await GroupService.removeMemberFromGroup(groupId, selectedMember.uid);
              
              // Update the local state
              setMembers(members.filter(member => member.uid !== selectedMember.uid));
              
              setShowMemberActions(false);
              
              Alert.alert(
                'Success', 
                `${selectedMember.name} has been removed from the group`
              );
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert(
                'Error', 
                error instanceof Error ? error.message : 'Failed to remove member'
              );
            }
          }
        }
      ]
    );
  };

  const handleLeaveGroup = () => {
    // Verify user is authenticated
    if (!user) {
      Alert.alert('Authentication Error', 'You must be logged in to leave the group');
      return;
    }
    
    // First check if the user has outstanding balances
    GroupService.hasOutstandingBalances(groupId, user.uid)
      .then(hasBalances => {
        if (hasBalances) {
          Alert.alert(
            'Cannot Leave Group',
            'You have outstanding balances in this group. Please settle up before leaving.'
          );
          return;
        }
        
        // If user is admin, check if they are the only admin
        if (currentUserIsAdmin) {
          const otherAdmins = members.filter(m => m.isAdmin && m.uid !== user.uid);
          
          if (otherAdmins.length === 0 && members.length > 1) {
            // User is the only admin and there are other members
            Alert.alert(
              'Admin Required',
              'You are the only admin. Before leaving, you must make another member an admin.',
              [
                {
                  text: 'OK',
                  style: 'default'
                }
              ]
            );
            return;
          }
        }
        
        // Proceed with leaving the group
        Alert.alert(
          'Leave Group',
          `Are you sure you want to leave the "${groupName}" group?`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Leave',
              style: 'destructive',
              onPress: async () => {
                try {
                  await GroupService.removeMemberFromGroup(groupId, user.uid);
                  
                  Alert.alert(
                    'Success',
                    'You have left the group successfully',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Navigate back to groups screen
                          navigation.navigate('MainDashboard', { screen: 'Groups' });
                        }
                      }
                    ]
                  );
                } catch (error) {
                  console.error('Error leaving group:', error);
                  Alert.alert('Error', 'Failed to leave the group');
                }
              }
            }
          ]
        );
      })
      .catch(error => {
        console.error('Error checking balances:', error);
        Alert.alert('Error', 'Failed to check your balances');
      });
  };

  const handleDeleteGroup = () => {
    // Verify user is authenticated
    if (!user) {
      Alert.alert('Authentication Error', 'You must be logged in to delete the group');
      return;
    }
    
    Alert.alert(
      'Delete Group',
      `Are you sure you want to permanently delete the "${groupName}" group? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if user is admin
              if (!currentUserIsAdmin) {
                Alert.alert('Error', 'Only group administrators can delete the group');
                return;
              }
              
              setLoading(true);
                  await GroupService.deleteGroup(groupId);
              setLoading(false);
              
              Alert.alert(
                'Group Deleted',
                'The group has been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to groups screen
                      navigation.navigate('MainDashboard', { screen: 'Groups' });
                    }
                  }
                ]
              );
            } catch (error) {
              setLoading(false);
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete the group');
            }
          }
        }
      ]
    );
  };

  const getColorFromName = (name: string) => {
    const colors = [
      '#4A90E2', '#50C878', '#FF6B81', '#9D65C9', 
      '#FF9642', '#8A2BE2', '#607D8B', '#E91E63'
    ];
    
    const hash = name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group settings</Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading group settings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={60} color="#F44336" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchGroupData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[{ id: 'dummy' }]} // Use a dummy item to make TypeScript happy
            keyExtractor={(item) => item.id}
            renderItem={() => null} // Required prop that doesn't actually render anything
            ListHeaderComponent={
              <>
                {/* Group Members Section */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Group members</Text>
                </View>

                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleAddMembers}
                >
                  <View style={styles.optionIconContainer}>
                    <Icon name="person-add" size={20} color="#333" />
                  </View>
                  <Text style={styles.optionText}>Add people to group</Text>
                  <Icon name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleCreateInviteLink}
                >
                  <View style={styles.optionIconContainer}>
                    <Icon name="qr-code" size={20} color="#333" />
                  </View>
                  <Text style={styles.optionText}>Invite via QR code</Text>
                  <Icon name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleShareLink}
                >
                  <View style={styles.optionIconContainer}>
                    <Icon name="share-social" size={20} color="#333" />
                  </View>
                  <Text style={styles.optionText}>Share invite link</Text>
                  <Icon name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                {/* Member List */}
                <View style={styles.memberListHeader}>
                  <Text style={styles.memberListTitle}>Members ({members.length})</Text>
                  {currentUserIsAdmin && (
                    <Text style={styles.memberManageTip}>Tap and hold to manage members</Text>
                  )}
                </View>
                
                {members.map((member, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.memberItem}
                    onLongPress={() => handleMemberLongPress(member)}
                    delayLongPress={500}
                  >
                    <View style={styles.memberAvatarContainer}>
                      <View 
                        style={[
                          styles.memberAvatarPlaceholder,
                          { backgroundColor: getColorFromName(member.name) }
                        ]}
                      >
                        <Text style={styles.memberInitial}>{member.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.name}
                        {member.isAdmin && <Text style={styles.adminTag}> (Admin)</Text>}
                        {member.uid === user?.uid && <Text style={styles.youTag}> (You)</Text>}
                      </Text>
                      <Text style={styles.memberDetail}>
                        {member.email || member.phone || 'No contact info'}
                      </Text>
                    </View>
                    {member.balance !== undefined && Math.abs(member.balance) > 0 ? (
                      <View style={styles.memberBalanceContainer}>
                        <Text style={[
                          styles.memberBalance,
                          {color: member.balance > 0 ? '#4CAF50' : '#F44336'}
                        ]}>
                          ₹{Math.abs(member.balance)}
                        </Text>
                        <Text style={styles.balanceStatus}>
                          {member.balance > 0 ? 'gets back' : 'owes'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.settledStatus}>settled up</Text>
                    )}
                  </TouchableOpacity>
                ))}

                {/* Advanced Settings Section */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <Text style={styles.sectionTitle}>Advanced settings</Text>
                </View>

                <View style={styles.optionItemWithToggle}>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>Simplify group debts</Text>
                    <Text style={styles.optionDescription}>
                      Automatically combines debts to reduce the total number of repayments between group members
                    </Text>
                  </View>
                  <Switch
                    value={simplifyDebts}
                    onValueChange={handleToggleSimplifyDebts}
                    trackColor={{ false: '#ddd', true: '#0A6EFF80' }}
                    thumbColor={simplifyDebts ? '#0A6EFF' : '#f4f3f4'}
                  />
                </View>

                <TouchableOpacity style={styles.optionItem}>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>Default split</Text>
                    <Text style={styles.optionDescription}>
                      Paid by you and split equally
                    </Text>
                  </View>
                  <View style={styles.proTag}>
                    <Text style={styles.proTagText}>PRO</Text>
                  </View>
                </TouchableOpacity>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                  <TouchableOpacity 
                    style={styles.dangerButton}
                    onPress={handleLeaveGroup}
                  >
                    <Icon name="exit-outline" size={20} color="#F44336" style={styles.dangerIcon} />
                    <Text style={styles.dangerText}>Leave group</Text>
                  </TouchableOpacity>

                  {currentUserIsAdmin && (
                    <TouchableOpacity 
                      style={[styles.dangerButton, { marginTop: 12 }]}
                      onPress={handleDeleteGroup}
                    >
                      <Icon name="trash-outline" size={20} color="#F44336" style={styles.dangerIcon} />
                      <Text style={styles.dangerText}>Delete group</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            }
            ListEmptyComponent={null}
          />
        )}
        
        {/* QR Code Modal */}
        <Modal
          visible={showQRModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.qrModalContainer}>
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowQRModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
              
              <Text style={styles.qrModalTitle}>Group Invite</Text>
              <Text style={styles.qrModalSubtitle}>Scan this QR code to join the group</Text>
              
              {inviteToken ? (
                <Animated.View 
                  style={[
                    styles.qrCodeContainer,
                    { transform: [{ scale: qrScaleAnim }] }
                  ]}
                >
                  <QRCode
                    value={`buddypay://join-group?token=${inviteToken}`}
                    size={200}
                    color="#000"
                    backgroundColor="#fff"
                  />
                </Animated.View>
              ) : (
                <View style={styles.qrCodeContainer}>
                  <ActivityIndicator size="large" color="#0A6EFF" />
                </View>
              )}
              
              <Text style={styles.inviteCodeLabel}>Invite Code</Text>
              <Text style={styles.inviteCodeText}>{inviteToken || 'Generating...'}</Text>
              
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={handleCopyInviteLink}
                disabled={!inviteToken}
              >
                <Icon 
                  name={inviteLinkCopied ? "checkmark" : "copy-outline"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.copyButtonText}>
                  {inviteLinkCopied ? "Copied!" : "Copy Invite Link"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.shareButton}
                onPress={handleShareLink}
                disabled={!inviteToken}
              >
                <Icon name="share-social-outline" size={20} color="#0A6EFF" />
                <Text style={styles.shareButtonText}>Share Invite</Text>
              </TouchableOpacity>
              
              <Text style={styles.expiresText}>This invite expires in 7 days</Text>
            </View>
          </View>
        </Modal>
        
        {/* Member Actions Modal */}
        <Modal
          visible={showMemberActions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMemberActions(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMemberActions(false)}
          >
            <View style={styles.actionSheet}>
              <View style={styles.actionSheetHandle} />
              
              {selectedMember && (
                <>
                  <View style={styles.selectedMemberHeader}>
                    <View 
                      style={[
                        styles.memberAvatarPlaceholder,
                        styles.actionSheetAvatar,
                        { backgroundColor: getColorFromName(selectedMember.name) }
                      ]}
                    >
                      <Text style={styles.memberInitial}>
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.actionSheetTitle}>{selectedMember.name}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={toggleMemberAdminStatus}
                  >
                    <Icon 
                      name={selectedMember.isAdmin ? "shield-outline" : "shield"} 
                      size={24} 
                      color="#0A6EFF" 
                    />
                    <Text style={styles.actionText}>
                      {selectedMember.isAdmin ? "Remove admin role" : "Make admin"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionItem}
                    onPress={removeMemberFromGroup}
                  >
                    <Icon name="person-remove-outline" size={24} color="#F44336" />
                    <Text style={[styles.actionText, styles.removeText]}>
                      Remove from group
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity 
                style={styles.cancelActionButton}
                onPress={() => setShowMemberActions(false)}
              >
                <Text style={styles.cancelActionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  closeButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333'
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase'
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  optionItemWithToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  optionContent: {
    flex: 1,
    paddingRight: 12
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  memberListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  memberListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  memberManageTip: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  memberAvatarContainer: {
    marginRight: 12
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  adminTag: {
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: '#666'
  },
  youTag: {
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: '#0A6EFF'
  },
  memberDetail: {
    fontSize: 13,
    color: '#666'
  },
  settledStatus: {
    fontSize: 13,
    color: '#999'
  },
  memberBalanceContainer: {
    alignItems: 'flex-end'
  },
  memberBalance: {
    fontSize: 14,
    fontWeight: '600'
  },
  balanceStatus: {
    fontSize: 12,
    color: '#666'
  },
  proTag: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  proTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  dangerSection: {
    padding: 16,
    marginTop: 20,
    marginBottom: 40
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 12
  },
  dangerIcon: {
    marginRight: 8
  },
  dangerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F44336'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336'
  },
  errorMessage: {
    marginTop: 5,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#0A6EFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  qrModalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center'
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center'
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  inviteCodeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  copyButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%'
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  shareButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%'
  },
  shareButtonText: {
    color: '#0A6EFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  },
  expiresText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic'
  },
  // Action sheet styles
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  actionSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 12,
    alignSelf: 'center'
  },
  selectedMemberHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  actionSheetAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16
  },
  removeText: {
    color: '#F44336'
  },
  cancelActionButton: {
    padding: 16,
    alignItems: 'center'
  },
  cancelActionText: {
    fontSize: 16,
    color: '#0A6EFF',
    fontWeight: '600'
  }
});

export default GroupSettingsScreen;