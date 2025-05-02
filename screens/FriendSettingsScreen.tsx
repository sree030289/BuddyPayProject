import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Dimensions,
  Keyboard,
  Animated,
  InputAccessoryView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import SimpleSplitOptions from '../components/SimpleSplitOptions';

import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc, 
  runTransaction,
  Timestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import DateTimePicker from '@react-native-community/datetimepicker'; // Import DateTimePicker
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import ActivityService from '../services/ActivityService';
import { logFriendActivity } from '../utils/activityLogger';

type AddExpenseScreenRouteProp = RouteProp<TabParamList, 'AddExpenseScreen'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface GroupMember {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  isAdmin?: boolean;
  balance?: number;
  isSelected?: boolean;
}

interface CustomSplit {
  memberId: string;
  value: string;
  amount?: number;
  percentage?: number;
}

const AddExpenseScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddExpenseScreenRouteProp>();
  const { user } = useAuth();
  
  // Reference for the ScrollView
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation for keyboard opening
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  
  // Get params from navigation
  let { groupId, groupName, friendId, friendName } = route.params || {};
  
  // Basic expense state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  
  // Members and payment state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidBy, setPaidBy] = useState<GroupMember | null>(null);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([]);

  // Add these state variables for handling group members
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [allFriends, setAllFriends] = useState<GroupMember[]>([]);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showPaidByModal, setShowPaidByModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCustomSplitModal, setShowCustomSplitModal] = useState(false);
  const [showSplitInfoModal, setShowSplitInfoModal] = useState(false);
  
  // Additional states
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [processingReceipt, setProcessingReceipt] = useState(false);

  // Categories with icons
  const categories = [
    { id: 'food', name: 'Food & Drinks', icon: 'fast-food' },
    { id: 'transport', name: 'Transport', icon: 'car' },
    { id: 'shopping', name: 'Shopping', icon: 'cart' },
    { id: 'entertainment', name: 'Entertainment', icon: 'film' },
    { id: 'home', name: 'House', icon: 'home' },
    { id: 'bills', name: 'Bills', icon: 'receipt' },
    { id: 'health', name: 'Health', icon: 'medical' },
    { id: 'travel', name: 'Travel', icon: 'airplane' },
    { id: 'education', name: 'Education', icon: 'school' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' }
  ];
  
  // Split options
  const splitOptions = [
    { id: 'equal', name: 'Split equally', description: 'Everyone pays the same amount' },
    { id: 'percentage', name: 'Split by percentage', description: 'Split by custom percentages' },
    { id: 'unequal', name: 'Split by amounts', description: 'Specify exact amounts for each person' },
    { id: 'shares', name: 'Split by shares', description: 'Use shares to determine split ratio' }
  ];

  // First, let's modify the main useEffect that runs on component mount
useEffect(() => {
  console.log("Component mounted with params:", route.params);
  
  // For group expense - ensure this runs first and only once
  if (route.params?.groupId) {
    const groupId = route.params.groupId;
    console.log(`Initial load for group: ${groupId}`);
    fetchGroupMembers(groupId);
  } 
  // For friend expense
  else if (route.params?.friendId) {
    const friendId = route.params.friendId;
    console.log(`Initial load for friend: ${friendId}`);
    setupFriendExpense(route.params.friendId, route.params.friendName);
  }
  // Only run the default friends fetch if we don't have a group or friend context
  else if (user && user.uid) {
    // Use our fetchDefaultFriends function when there's no group/friend context
    fetchDefaultFriends();
  }
  
  // Fetch available groups for dropdown - do this after group/friend setup
  fetchAvailableGroups();
}, [user?.uid]); // Only depend on user.uid to ensure this runs once when user is available
  // Add this new useEffect right after the existing useEffect that depends on [user?.uid]
// Place this around line 448 after the first useEffect

// New effect to handle route param changes
useEffect(() => {
  console.log("Route params changed:", route.params);
  
  // Clear existing data when route params change
  setMembers([]);
  setSelectedMembers({});
  setPaidBy(null);
  
  // Re-initialize based on new route params
  if (route.params?.groupId) {
    console.log(`Loading group members due to route param change: ${route.params.groupId}`);
    
    // Update local variables to match route params
    groupId = route.params.groupId;
    groupName = route.params.groupName;
    friendId = undefined;
    friendName = undefined;
    
    fetchGroupMembers(route.params.groupId);
  } 
  else if (route.params?.friendId) {
    console.log(`Loading friend due to route param change: ${route.params.friendId}`);
    
    // Update local variables
    groupId = undefined;
    groupName = undefined;
    friendId = route.params.friendId;
    friendName = route.params.friendName;
    
    setupFriendExpense(route.params.friendId, route.params.friendName);
  }
}, [route.params?.groupId, route.params?.friendId]);

  // Add this effect to force a re-render when the 'members' state changes
  useEffect(() => {
    console.log("Members state changed, length:", members.length);
    console.log("Members details:", members.map(m => m.name));
    
    // Update the selectedMembers whenever members change
    if (members.length > 0) {
      const updatedSelectedMembers: Record<string, boolean> = {};
      members.forEach(member => {
        updatedSelectedMembers[member.uid] = true; // Select all members by default
      });
      setSelectedMembers(updatedSelectedMembers);
      
      // Also update paidBy if it's not set or not found in the new members list
      if (!paidBy || !members.find(m => m.uid === paidBy.uid)) {
        const currentUser = members.find(m => m.uid === user?.uid);
        if (currentUser) {
          setPaidBy(currentUser);
        }
      }
    }
  }, [members]);
  
  useEffect(() => {
  // Only fetch if user exists AND we don't have an active group/friend context
  if (user && user.uid && !route.params?.groupId && !route.params?.friendId) {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        console.log('Fetching friends for user (default tab view):', user.uid);
        
        // Approach 1: Try to get friends from user document first
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userPhone = userData.phone;
          
          if (userPhone) {
            console.log('Found user phone:', userPhone);
            
            // Get friends from the subcollection using phone as ID
            const friendsRef = collection(db, 'users', userPhone, 'friends');
            const friendsSnapshot = await getDocs(friendsRef);
            
            if (!friendsSnapshot.empty) {
              // Process friends from the subcollection
              const friendsList = friendsSnapshot.docs.map(doc => ({
                uid: doc.id,
                name: doc.data().name || 'Friend',
                email: doc.data().email,
                phone: doc.data().phone,
                isSelected: false
              }));
              
              console.log(`Loaded ${friendsList.length} friends from phone number subcollection - tab bar mode`);
              
              // Add current user first in the list
              const membersList = [
                {
                  uid: user.uid,
                  name: 'You',
                  email: user.email || undefined,
                  isSelected: true
                },
                ...friendsList
              ];
              
              // Only set members if we're in tab bar mode (no group or friend context)
              if (!route.params?.groupId && !route.params?.friendId) {
                console.log("Setting members in tab bar mode (no group/friend context)");
                setMembers(membersList);
                
                // Set current user as default payer
                setPaidBy(membersList[0]);
                
                // Initialize selected members
                const initialSelectedState: Record<string, boolean> = {};
                membersList.forEach(member => {
                  initialSelectedState[member.uid] = true; // Select all by default
                });
                setSelectedMembers(initialSelectedState);
              } else {
                console.log("Skipping friend load because we're in group/friend context");
              }
              
              setLoading(false);
              return; // Exit early if we successfully loaded friends
            } else {
              console.log('No friends found in subcollection');
            }
          }
        }
        
        // Fallback approach: Try to fetch from user document directly
        console.log('Falling back to friends from user document');
        // Default to a minimal list with just the current user
        const currentUser = {
          uid: user.uid,
          name: 'You',
          email: user.email || undefined,
          isSelected: true
        };
        
        if (!route.params?.groupId && !route.params?.friendId) {
          setMembers([currentUser]);
          setPaidBy(currentUser);
          setSelectedMembers({ [user.uid]: true });
        }
        
      } catch (error) {
        console.error('Error fetching friends:', error);
        // Set a minimal default state
        const currentUser = {
          uid: user.uid,
          name: 'You',
          email: user.email || undefined,
          isSelected: true
        };
        
        if (!route.params?.groupId && !route.params?.friendId) {
          setMembers([currentUser]);
          setPaidBy(currentUser);
          setSelectedMembers({ [user.uid]: true });
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Call the function to fetch friends ONLY if we're not in a group/friend context
    fetchFriends();
  }
}, [user, route.params?.groupId, route.params?.friendId]);

  // Handle keyboard events to adjust UI
  useEffect(() => {
    const keyboardWillShowSub = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.timing(keyboardHeight, {
          toValue: 1,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );
    const keyboardWillHideSub = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, []);
  
  const setupFriendExpense = async (friendIdParam?: string, friendNameParam?: string) => {
    // Use the passed parameters or fall back to state variables
    const targetFriendId = friendIdParam || friendId;
    const targetFriendName = friendNameParam || friendName;
    
    if (!targetFriendId || !user) return;
    
    setLoading(true);
    
    try {
      // Create a simple two-person members array
      const membersArray: GroupMember[] = [
        {
          uid: user.uid,
          name: 'You',
          email: user.email || undefined,
          isSelected: true
        },
        {
          uid: targetFriendId,
          name: targetFriendName || 'Friend',
          isSelected: true
        }
      ];
      
      console.log(`Setting up friend expense with: ${targetFriendName} (${targetFriendId})`);
      console.log(`Members array: ${JSON.stringify(membersArray)}`);
      
      // Set members state
      setMembers(membersArray);
      
      // Initialize selected members (both are selected by default)
      const initialSelectedState: Record<string, boolean> = {
        [user.uid]: true,
        [targetFriendId]: true
      };
      setSelectedMembers(initialSelectedState);
      
      // Set current user as default payer
      setPaidBy(membersArray[0]);
      
    } catch (error) {
      console.error('Error setting up friend expense:', error);
      setError('Failed to set up friend expense');
    } finally {
      setLoading(false);
    }
  };
  
// Modify the fetchGroupMembers function (around line 599)
// Here's an improved version with better error handling and state management

const fetchGroupMembers = async (groupIdParam?: string) => {
  // Use passed parameter or fallback to state variable
  const targetGroupId = groupIdParam || groupId;
  
  if (!targetGroupId || !user) {
    console.log("Missing groupId or user, cannot fetch members");
    setLoading(false);
    return;
  }
  
  console.log(`Fetching members for group: ${targetGroupId}`);
  setLoading(true);
  
  try {
    // Get the group document directly
    const groupRef = doc(db, 'groups', targetGroupId);
    const groupSnap = await getDoc(groupRef);
    
    if (groupSnap.exists()) {
      const groupData = groupSnap.data();
      console.log(`Group data loaded: ${groupData.name}`);
      
      let membersList: GroupMember[] = [];
      
      // First try to get members from the members array
      if (groupData.members && Array.isArray(groupData.members)) {
        console.log('Using members array from group data');
        
        membersList = groupData.members.map((member: any) => {
          const isCurrentUser = member.uid === user.uid || member.id === user.uid;
          return {
            uid: member.uid || member.id,              
            name: isCurrentUser ? 'You' : (member.name || 'Unknown'),
            email: member.email,
            phone: member.phone,
            isAdmin: member.isAdmin,
            balance: member.balance || 0,
            isSelected: true            
          };
        });
        
        console.log(`Processed ${membersList.length} members from members array`);
      } 
      // If no members array, try using memberIds
      else if (groupData.memberIds && Array.isArray(groupData.memberIds)) {
        console.log('Using memberIds array from group data');
        
        // We need to look up each member
        const userPromises = groupData.memberIds.map(async (memberId: string) => {
          // If it's the current user, don't need to look up
          if (memberId === user.uid) {
            return {
              uid: user.uid,
              name: 'You',
              email: user.email || undefined,
              isSelected: true
            };
          }
          
          // Otherwise look up the user document
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
              return {
                uid: memberId,
                name: userDoc.data().name || 'Unknown',
                email: userDoc.data().email,
                phone: userDoc.data().phone,
                isSelected: true
              };
            }
            return {
              uid: memberId,
              name: 'User ' + memberId.substring(0, 4),
              isSelected: true
            };
          } catch (err) {
            console.log(`Error looking up member ${memberId}:`, err);
            return {
              uid: memberId,
              name: 'User ' + memberId.substring(0, 4),
              isSelected: true
            };
          }
        });
        
        membersList = await Promise.all(userPromises);
        console.log(`Processed ${membersList.length} members from memberIds`);
      }
      
      if (membersList.length > 0) {
        console.log('Final member list:', membersList.map(m => `${m.name} (${m.uid})`));
        
        // Store group member IDs for filtering friend lists
        const memberIds = membersList.map(member => member.uid);
        setGroupMemberIds(memberIds);
        
        // Important: Set members state with the new list immediately
        setMembers(membersList);
        
        // Setup initial selected members state
        const initialSelectedState: Record<string, boolean> = {};
        membersList.forEach(member => {
          initialSelectedState[member.uid] = true;
        });
        setSelectedMembers(initialSelectedState);
        
        // Set current user as default payer
        const currentUser = membersList.find(m => m.uid === user.uid);
        if (currentUser) {
          setPaidBy(currentUser);
        }
        
        console.log("Updated UI state with members - selected count:", Object.keys(initialSelectedState).length);
        
        // Also fetch all user's friends to show non-group members for splitting
        fetchNonGroupFriends(memberIds);
      } else {
        console.warn('No members found in group data');
        // Handle the case where no members are found
        const currentUser = {
          uid: user.uid,
          name: 'You',
          email: user.email || undefined,
          isSelected: true
        };
        
        setMembers([currentUser]);
        setPaidBy(currentUser);
        setSelectedMembers({ [user.uid]: true });
      }
    } else {
      console.log('Group document not found');
      Alert.alert('Error', 'Group not found');
      navigation.goBack();
    }
  } catch (error) {
    console.error('Error fetching group members:', error);
    setError('Failed to load group members');
    
    // Fallback to just the current user in case of error
    const currentUser = {
      uid: user.uid,
      name: 'You',
      email: user.email || undefined,
      isSelected: true
    };
    
    setMembers([currentUser]);
    setPaidBy(currentUser);
    setSelectedMembers({ [user.uid]: true });
  } finally {
    setLoading(false);
  }
};
  
  // New function to fetch friends that are not in the group
  const fetchNonGroupFriends = async (groupMemberIds: string[]) => {
    if (!user || !user.uid) return;
    
    try {
      // Get the user reference
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userPhone = userData.phone;
        
        if (userPhone) {
          // Get friends from the subcollection
          const friendsRef = collection(db, 'users', userPhone, 'friends');
          const friendsSnapshot = await getDocs(friendsRef);
          
          if (!friendsSnapshot.empty) {
            // Process friends from the subcollection
            const friendsList = friendsSnapshot.docs.map(doc => ({
              uid: doc.id,
              name: doc.data().name || 'Friend',
              email: doc.data().email,
              phone: doc.data().phone,
              isSelected: false
            }));
            
            console.log(`Loaded ${friendsList.length} total friends from contacts`);
            
            // Store all friends for filtering but DO NOT add to members array
            // This prevents combining group members and all friends
            setAllFriends(friendsList);
            
            // Check if group member IDs actually includes user IDs or just string identifiers
            console.log(`Group member IDs for filtering: ${JSON.stringify(groupMemberIds)}`);
            
            // Filter out friends who are already in the group - but only store in allFriends, not members
            const nonGroupFriends = friendsList.filter(friend => {
              // First check by UID (direct ID match)
              if (groupMemberIds.includes(friend.uid)) {
                console.log(`Friend ${friend.name} (${friend.uid}) is in group by UID match`);
                return false;
              }
              
              // If we have group member details from members array, do more comprehensive check
              for (const member of members) {
                // Check if any member in the group matches this friend by phone or email
                if ((friend.phone && member.phone === friend.phone) || 
                    (friend.email && member.email === friend.email)) {
                  console.log(`Friend ${friend.name} matches group member by phone/email`);
                  return false;
                }
              }
              
              // If no matches found, this friend is not in the group
              return true;
            });
            
            console.log(`Found ${nonGroupFriends.length} friends who are not in the group after detailed matching`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching non-group friends:', error);
    }
  };
  
  const fetchAvailableGroups = async () => {
    if (!user) return;
    
    try {
      console.log("Fetching available groups for dropdown...");
      const groups: any[] = [];
      
      // Fetch ALL groups first to check their structure
      const allGroupsRef = collection(db, 'groups');
      const allGroupsSnap = await getDocs(allGroupsRef);
      console.log(`Found ${allGroupsSnap.size} total groups in database`);
      
      // Check each group for the current user
      for (const groupDoc of allGroupsSnap.docs) {
        const groupData = groupDoc.data();
        
        // Check if current user is in this group through any method
        let userInGroup = false;
        
        // Check memberIds array
        if (groupData.memberIds && Array.isArray(groupData.memberIds) && groupData.memberIds.includes(user.uid)) {
          console.log(`User found in memberIds for group ${groupData.name}`);
          userInGroup = true;
        }
        
        // Check members array
        if (!userInGroup && groupData.members && Array.isArray(groupData.members)) {
          const userMember = groupData.members.find(m => 
            m.uid === user.uid || m.id === user.uid || (user.email && m.email === user.email)
          );
          
          if (userMember) {
            console.log(`User found in members array for group ${groupData.name}`);
            userInGroup = true;
          }
        }
        
        // If user is in this group, add it to available groups
        if (userInGroup) {
          groups.push({
            id: groupDoc.id,
            name: groupData.name || 'Unnamed Group',
            type: 'group'
          });
          console.log(`Added group to dropdown: ${groupData.name}`);
        }
      }
      
      // Only fetch friends if not coming from a GroupDashboard
      if (!groupId) {
        // Fetch user's friends
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userPhone = userData.phone;
          
          if (userPhone) {
            const friendsRef = collection(db, 'users', userPhone, 'friends');
            const friendsSnap = await getDocs(friendsRef);
            
            const friends = friendsSnap.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name || 'Friend',
              type: 'friend'
            }));
            
            console.log(`Found ${friends.length} friends for dropdown`);
            setAvailableGroups([...groups, ...friends]);
            return;
          }
        }
      }
      
      setAvailableGroups(groups);
      console.log(`Set available groups for dropdown: ${groups.length} items`);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    }
  };
  
  const toggleMemberSelection = (memberId: string) => {
    console.log(`Toggling selection for member: ${memberId}`);
    
    setSelectedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
    
    // Update custom splits if needed
    if (splitMethod !== 'equal') {
      setCustomSplits(prev => {
        const exists = prev.some(split => split.memberId === memberId);
        if (!exists) {
          return [
            ...prev,
            { memberId, value: '0' }
          ];
        }
        return prev;
      });
    }
  };
  
  const handleCategorySelect = (categoryId: string) => {
    setCategory(categoryId);
    setShowCategoryModal(false);
  };
  
  // Update the handleDateChange function to prevent premature closing
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, the picker has "cancel" and "set" actions
      // Only close if the user clicked outside (cancelled) or confirmed
      if (event.type === 'set' && selectedDate) {
        setDate(selectedDate);
        setShowDatePicker(false);
        setShowDateModal(false);
      } else if (event.type === 'dismissed') {
        // User dismissed the picker without selection
        setShowDatePicker(false);
      }
      // Don't close the picker if the user is still selecting
    } else {
      // On iOS, we don't automatically close - let the user press Done
      if (selectedDate) {
        setDate(selectedDate);
      }
    }
  };
  
  // Add this helper function to handle explicit date confirmation (for iOS)
  const confirmDateSelection = () => {
    setShowDatePicker(false);
    setShowDateModal(false);
  };

  const handleSplitMethodSelect = (method: string) => {
    setSplitMethod(method);
    setShowSplitModal(false);
    
    if (method !== 'equal') {
      // Initialize custom splits for the selected members
      const splits: CustomSplit[] = [];
      
      Object.entries(selectedMembers).forEach(([memberId, isSelected]) => {
        if (isSelected) {
          splits.push({
            memberId,
            value: method === 'percentage' ? '0' : '0.00'
          });
        }
      });
      
      setCustomSplits(splits);
      setShowCustomSplitModal(true);
    }
  };
  
  const handlePaidBySelect = (member: GroupMember) => {
    setPaidBy(member);
    setShowPaidByModal(false);
  };
  
  const handleScanReceipt = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to grant camera access to scan receipts.');
        return;
      }
      
      setProcessingReceipt(true);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (result.canceled) {
        setProcessingReceipt(false);
        return;
      }
      
      // Set receipt image
      setReceiptImage(result.assets[0].uri);
      
      // Process the image for OCR
      try {
        // Resize and optimize image for OCR
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // In a real implementation, you would call a real OCR service like Google Cloud Vision
        // For this demo, we'll simulate OCR with some mock data
        // Simulate OCR with a realistic approach
        // In a production app, you would use a real OCR service API
        const simulateOcr = async (imageUri: string) => {
          try {
            // Convert image to base64
            const base64Image = await FileSystem.readAsStringAsync(imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Create the request body for Google Cloud Vision API
            const body = {
              requests: [
                {
                  image: {
                    content: base64Image
                  },
                  features: [
                    {
                      type: "TEXT_DETECTION" 
                    },
                    {
                      type: "DOCUMENT_TEXT_DETECTION"
                    }
                  ]
                }
              ]
            };
            
            // Replace this with your actual API key
            const apiKey = "YOUR_GOOGLE_CLOUD_VISION_API_KEY";
            
            // Make request to Google Cloud Vision API
            const response = await fetch(
              `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
              {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            const data = await response.json();
            
            // Process OCR results
            let extractedText = "";
            if (data.responses && 
                data.responses[0] && 
                data.responses[0].fullTextAnnotation) {
              extractedText = data.responses[0].fullTextAnnotation.text;
            }
            
            // Extract relevant information from the text
            const result = {
              description: extractMerchantName(extractedText),
              amount: extractAmount(extractedText),
              date: extractDate(extractedText),
              category: guessCategory(extractedText),
              notes: extractedText.substring(0, 100) // First 100 chars as notes
            };
            
            return result;
          } catch (error) {
            console.error('OCR processing error:', error);
            // Return empty result on error
            return {
              description: '',
              amount: '',
              date: new Date(),
              category: '',
              notes: ''
            };
          }
        };

        // Helper function to extract merchant name from OCR text
        const extractMerchantName = (text: string) => {
          // Simple heuristic: first line is often the merchant name
          const lines = text.split('\n');
          if (lines.length > 0) {
            return lines[0].trim();
          }
          return '';
        };

        // Helper function to extract amount from OCR text
        const extractAmount = (text: string) => {
          // Look for patterns like $XX.XX or Total: $XX.XX
          const amountRegex = /(?:total|amount|subtotal|balance|due)[:\s]*[$]?(\d+\.\d{2})/i;
          const match = text.match(amountRegex);
          
          if (match && match[1]) {
            return match[1];
          }
          
          // Alternative pattern: just find any dollar amount
          const simpleAmountRegex = /[$](\d+\.\d{2})/;
          const simpleMatch = text.match(simpleAmountRegex);
          
          if (simpleMatch && simpleMatch[1]) {
            return simpleMatch[1];
          }
          
          return '';
        };

        // Helper function to extract date from OCR text
        const extractDate = (text: string) => {
          // Look for common date formats: MM/DD/YYYY, DD/MM/YYYY, etc.
          const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
          const match = text.match(dateRegex);
          
          if (match && match[1]) {
            // Try to parse the date
            try {
              const parts = match[1].split(/[\/\-\.]/);
              // Assume MM/DD/YYYY format - adjust if needed for your locale
              const date = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
              if (!isNaN(date.getTime())) {
                return date;
              }
            } catch (e) {
              console.log('Date parsing error:', e);
            }
          }
          
          // If no date found or parsing failed, return current date
          return new Date();
        };

        // Helper function to guess category based on keywords
        const guessCategory = (text: string) => {
          const lowerText = text.toLowerCase();
          
          if (/(restaurant|cafe|food|drink|bar|coffee|meal|breakfast|lunch|dinner)/i.test(lowerText)) {
            return 'food';
          } else if (/(uber|lyft|taxi|cab|train|bus|transport|fare|ride|metro)/i.test(lowerText)) {
            return 'transport';
          } else if (/(shop|store|mall|market|retail|clothing|purchase)/i.test(lowerText)) {
            return 'shopping';
          } else if (/(movie|cinema|theater|ticket|event|concert|show)/i.test(lowerText)) {
            return 'entertainment';
          } else if (/(rent|utility|electricity|water|gas|internet)/i.test(lowerText)) {
            return 'bills';
          } else if (/(doctor|hospital|pharmacy|medical|health|drug)/i.test(lowerText)) {
            return 'health';
          } else if (/(hotel|airbnb|flight|airline|booking|travel)/i.test(lowerText)) {
            return 'travel';
          }
          
          return 'other';
        };

        // Make the API request with the processed image
        const mockOcrResult = await simulateOcr(manipResult.uri);
        
        // Populate fields with OCR results
        if (mockOcrResult.description) {
          setDescription(mockOcrResult.description);
        }
        
        if (mockOcrResult.amount) {
          setAmount(mockOcrResult.amount);
        }
        
        if (mockOcrResult.date) {
          setDate(mockOcrResult.date);
        }
        
        if (mockOcrResult.category) {
          setCategory(mockOcrResult.category);
        }
        
        if (mockOcrResult.notes) {
          setNotes(mockOcrResult.notes);
        }
        
      } catch (ocrError) {
        console.error('Error processing receipt:', ocrError);
      }
      
      setProcessingReceipt(false);
    } catch (error) {
      console.error('Error scanning receipt:', error);
      Alert.alert('Error', 'Failed to scan receipt');
      setProcessingReceipt(false);
    }
  };
  
  const handleUploadReceipt = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to grant gallery access to upload receipts.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      
      if (!result.canceled) {
        // In a real implementation, you would upload the image to Firebase Storage
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      Alert.alert('Error', 'Failed to upload receipt');
    }
  };
  
  const updateCustomSplitValue = (memberId: string, value: string) => {
    setCustomSplits(prev => {
      return prev.map(split => {
        if (split.memberId === memberId) {
          return { ...split, value };
        }
        return split;
      });
    });
  };
  
  const validateCustomSplits = (): boolean => {
    if (splitMethod === 'equal') return true;
    
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) return false;
    
    if (splitMethod === 'percentage') {
      // Check if percentages add up to 100%
      const total = customSplits.reduce((sum, split) => {
        const value = parseFloat(split.value) || 0;
        return sum + value;
      }, 0);
      
      return Math.abs(total - 100) < 0.01; // Allow for tiny floating point differences
    } else if (splitMethod === 'unequal') {