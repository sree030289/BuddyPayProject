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
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../components/AuthContext';
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
    
    // Fetch available groups for dropdown - do this after group/friend setup
    fetchAvailableGroups();
  }, [user?.uid]); // Only depend on user.uid to ensure this runs once when user is available

  
  useEffect(() => {
  // Only fetch if user exists
  if (user && user.uid) {
    const fetchFriends = async () => {
      try {
        setLoading(true);
        console.log('Fetching friends for user:', user.uid);
        
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
              
              console.log(`Loaded ${friendsList.length} friends from phone number subcollection`);
              
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
              
              setMembers(membersList);
              
              // Set current user as default payer
              setPaidBy(membersList[0]);
              
              // Initialize selected members
              const initialSelectedState: Record<string, boolean> = {};
              membersList.forEach(member => {
                initialSelectedState[member.uid] = true; // Select all by default
              });
              setSelectedMembers(initialSelectedState);
              
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
        
        setMembers([currentUser]);
        setPaidBy(currentUser);
        setSelectedMembers({ [user.uid]: true });
        
      } catch (error) {
        console.error('Error fetching friends:', error);
        // Set a minimal default state
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
    
    // Call the function to fetch friends
    fetchFriends();
  }
}, [user]);
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
  
  // Initialize when component mounts
  useEffect(() => {
    console.log("Component mounted with params:", route.params);
    
    // For group expense - ensure this runs first and only once
    if (route.params?.groupId) {
      const groupId = route.params.groupId;
      console.log(`Initial load for group: ${groupId}`);
      fetchGroupMembers();
    } 
    // For friend expense
    else if (route.params?.friendId) {
      const friendId = route.params.friendId;
      console.log(`Initial load for friend: ${friendId}`);
      setupFriendExpense();
    }
    
    // Fetch available groups for dropdown - do this after group/friend setup
    fetchAvailableGroups();
  }, [user?.uid]); // Only depend on user.uid to ensure this runs once when user is available
  
  
  const setupFriendExpense = async () => {
    if (!friendId || !user) return;
    
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
          uid: friendId,
          name: friendName || 'Friend',
          isSelected: true
        }
      ];
      setMembers(membersArray);
      
      // Initialize selected members (both are selected by default)
      const initialSelectedState: Record<string, boolean> = {
        [user.uid]: true,
        [friendId]: true
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
  
  // Modified fetchGroupMembers function to track group member IDs
  const fetchGroupMembers = async () => {
    if (!groupId || !user) {
      console.log("Missing groupId or user, cannot fetch members");
      return;
    }
    
    console.log(`Fetching members for group: ${groupId}`);
    setLoading(true);
    
    try {
      // Get the group document directly
      const groupRef = doc(db, 'groups', groupId);
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
              uid: member.uid || member.id, // Use uid if available, fall back to id
              name: isCurrentUser ? 'You' : (member.name || 'Unknown'),
              email: member.email,
              phone: member.phone,
              isAdmin: member.isAdmin,
              balance: member.balance || 0,
              isSelected: true // By default select all members
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
          
          // Set members state with the new list
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
            
            // Store all friends for filtering
            setAllFriends(friendsList);
            
            // Filter out friends who are already in the group
            const nonGroupFriends = friendsList.filter(
              friend => !groupMemberIds.includes(friend.uid)
            );
            
            console.log(`Found ${nonGroupFriends.length} friends who are not in the group`);
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
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
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
      // Check if amounts add up to the total
      const total = customSplits.reduce((sum, split) => {
        const value = parseFloat(split.value) || 0;
        return sum + value;
      }, 0);
      
      return Math.abs(total - totalAmount) < 0.01;
    }
    
    return true; // For shares or any other method
  };
  
  const calculateSplitAmounts = () => {
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) return [];
    
    const selectedMemberIds = Object.entries(selectedMembers)
      .filter(([_, isSelected]) => isSelected)
      .map(([memberId]) => memberId);
    
    if (splitMethod === 'equal') {
      // Equal split
      const perPersonAmount = totalAmount / selectedMemberIds.length;
      
      return selectedMemberIds.map(memberId => ({
        memberId,
        amount: perPersonAmount,
        percentage: 100 / selectedMemberIds.length
      }));
    } else if (splitMethod === 'percentage') {
      // Percentage split
      return customSplits.map(split => {
        const percentage = parseFloat(split.value) || 0;
        return {
          memberId: split.memberId,
          amount: (percentage / 100) * totalAmount,
          percentage
        };
      });
    } else if (splitMethod === 'unequal') {
      // Unequal split (direct amounts)
      return customSplits.map(split => {
        const splitAmount = parseFloat(split.value) || 0;
        return {
          memberId: split.memberId,
          amount: splitAmount,
          percentage: (splitAmount / totalAmount) * 100
        };
      });
    } else {
      // Shares split
      const totalShares = customSplits.reduce((sum, split) => {
        return sum + (parseFloat(split.value) || 0);
      }, 0);
      
      if (totalShares === 0) return [];
      
      return customSplits.map(split => {
        const shares = parseFloat(split.value) || 0;
        const percentage = (shares / totalShares) * 100;
        return {
          memberId: split.memberId,
          amount: (percentage / 100) * totalAmount,
          percentage,
          shares
        };
      });
    }
  };
// Update the saveExpense function in AddExpenseScreen.tsx to handle the TabBar case better

const saveExpense = async () => {
  if (!validateExpense()) return;
  if (!user) {
    Alert.alert('Error', 'You must be logged in to add an expense');
    return;
  }
  
  // Check if we have either groupId or friendId from route params
  // Since the params might have changed after component mounted
  const currentGroupId = route.params?.groupId || groupId;
  const currentFriendId = route.params?.friendId || friendId;
  
  // Modify validation to handle tab bar expense creation
  const hasSelectedMembers = Object.values(selectedMembers).some(selected => selected);
  
  if (!currentGroupId && !currentFriendId && !hasSelectedMembers) {
    setError('Please select at least one person to split with');
    return;
  }
  
  console.log(`Saving expense with: groupId=${currentGroupId}, friendId=${currentFriendId}, selectedMembers=${Object.keys(selectedMembers).filter(id => selectedMembers[id]).join(',')}`);
  
  setSaving(true);
  setError('');
  
  try {
    // Calculate the split amounts
    const splitAmounts = calculateSplitAmounts();
    
    // Prepare expense data for Firestore
    const expenseData = {
      description,
      amount: parseFloat(amount),
      date: Timestamp.fromDate(date),
      category: category || 'other',
      notes,
      paidById: paidBy?.uid,
      paidByName: paidBy?.name,
      splitMethod,
      splitWith: splitAmounts.map(split => {
        const member = members.find(m => m.uid === split.memberId);
        return {
          uid: split.memberId,
          name: member?.name || 'Unknown',
          amount: split.amount,
          percentage: split.percentage,
          ...(splitMethod === 'shares' && { shares: split.shares })
        };
      }),
      groupId: currentGroupId || null,
      groupName: route.params?.groupName || groupName || null,
      friendId: currentFriendId || null,
      friendName: route.params?.friendName || friendName || null,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      receiptUrl: receiptImage || null,
    };

    if (currentGroupId) {
      // Handle group expense
      console.log(`Saving as group expense to group: ${currentGroupId}`);
      await saveGroupExpense({...expenseData, groupId: currentGroupId});
      
      // Navigate back to group dashboard with refresh flag
      navigation.navigate('GroupDashboardScreen', {
        groupId: currentGroupId,
        groupName: expenseData.groupName,
        refresh: true
      });
    } else if (currentFriendId) {
      // Handle friend expense
        console.log(`Saving as friend expense with friend: ${currentFriendId}`);
        await saveFriendExpense({...expenseData, friendId: currentFriendId});
        
        // Navigate back to friend dashboard with refresh flag - fix type issue
        navigation.navigate('FriendsDashboardScreen', {
          friendId: currentFriendId,
          friendName: expenseData.friendName || '',
          totalOwed: 0, // This will be recalculated on the dashboard
          groups: [], // This will be reloaded on the dashboard
          email: user.email || undefined,
          refresh: true
        });
    } else if (hasSelectedMembers) {
      // New case: Handle tab bar expense creation with selected members
      console.log(`Creating expense from tab bar with selected members`);
      
      // Get all selected members that aren't the current user
      const selectedMemberIds = Object.entries(selectedMembers)
        .filter(([id, isSelected]) => isSelected && id !== user.uid)
        .map(([id]) => id);
      
      console.log(`Selected member IDs: ${selectedMemberIds.join(', ')}`);
      
      if (selectedMemberIds.length > 0) {
        // Get first selected member that isn't the current user
        const targetFriendId = selectedMemberIds[0];
        const targetFriend = members.find(m => m.uid === targetFriendId);
        
        if (targetFriend) {
          console.log(`Creating friend expense with: ${targetFriend.name} (${targetFriendId})`);
          await saveFriendExpense({
            ...expenseData, 
            friendId: targetFriendId,
            friendName: targetFriend.name
          });
          
          // Navigate to friend dashboard - fix type issue
          navigation.navigate('FriendsDashboardScreen', {
            friendId: targetFriendId,
            friendName: targetFriend.name,
            totalOwed: 0, // Will be calculated on the dashboard
            groups: [], // Will be loaded on the dashboard
            email: user.email || undefined,
            refresh: true
          });
        } else {
          throw new Error('Selected member not found in members list');
        }
      } else {
        throw new Error('No friends selected to split with');
      }
    } else {
      throw new Error('Missing group or friend information');
    }
    
  } catch (error) {
    console.error('Error saving expense:', error);
    setError(`Failed to save expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setSaving(false);
  }
};

// Also ensure this validation function correctly handles all cases
const validateExpense = () => {
  if (!description.trim()) {
    setError('Please enter a description');
    return false;
  }
  
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    setError('Please enter a valid amount');
    return false;
  }
  
  if (!paidBy) {
    setError('Please select who paid');
    return false;
  }
  
  // Check if at least one member is selected
  const hasSelectedMembers = Object.values(selectedMembers).some(selected => selected);
  if (!hasSelectedMembers) {
    setError('Please select at least one person to split with');
    return false;
  }
  
  // Validate custom splits if applicable
  if (splitMethod !== 'equal' && !validateCustomSplits()) {
    if (splitMethod === 'percentage') {
      setError('Percentages must add up to 100%');
    } else if (splitMethod === 'unequal') {
      setError('Amounts must add up to the total');
    } else {
      setError('Please enter valid split values');
    }
    return false;
  }
  
  return true;
};

  
  const saveGroupExpense = async (expenseData: any) => {
    if (!groupId || !user) return;
    
    try {
      // Use transaction to ensure atomic updates
      await runTransaction(db, async (transaction) => {
        // 1. Get the current group data
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) {
          throw new Error('Group not found');
        }
        
        const groupData = groupDoc.data();
        
        // 2. Add the expense to the expenses subcollection
        const expenseRef = doc(collection(db, 'groups', groupId, 'expenses'));
        transaction.set(expenseRef, {
          ...expenseData,
          id: expenseRef.id
        });
        
        // Also add to transactions subcollection for timeline view
        const transactionRef = doc(collection(db, 'groups', groupId, 'transactions'));
        transaction.set(transactionRef, {
          id: transactionRef.id,
          description: expenseData.description,
          amount: expenseData.amount,
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          paidBy: expenseData.paidByName,
          splitWith: expenseData.splitWith.map((s: any) => s.uid),
          type: 'expense',
          category: expenseData.category || 'other', // Ensure category is included
          timestamp: serverTimestamp()
        });
        
        // 3. Update member balances in the group
        const updatedMembers = [...(groupData.members || [])];
        
        // The person who paid gets a positive balance adjustment
        const paidAmount = parseFloat(amount);
        
        // Find and update balances for each member
        expenseData.splitWith.forEach((split: any) => {
          // Skip the payer for now (we'll handle them separately)
          if (split.uid === paidBy?.uid) return;
          
          // Find the member in the group
          const memberIndex = updatedMembers.findIndex(
            (m: any) => m.uid === split.uid
          );
          
          if (memberIndex >= 0) {
            // This member owes money to the payer
            const currentBalance = updatedMembers[memberIndex].balance || 0;
            updatedMembers[memberIndex].balance = currentBalance - split.amount;
          }
        });
        
        // Update the payer's balance
        const payerIndex = updatedMembers.findIndex(
          (m: any) => m.uid === paidBy?.uid
        );
        
        if (payerIndex >= 0) {
          // The payer's balance increases by what others owe them
          const payerSplit = expenseData.splitWith.find(
            (s: any) => s.uid === paidBy?.uid
          );
          
          const payerPortion = payerSplit ? payerSplit.amount : 0;
          const othersOwe = paidAmount - payerPortion;
          
          const currentBalance = updatedMembers[payerIndex].balance || 0;
          updatedMembers[payerIndex].balance = currentBalance + othersOwe;
        }
        
        // 4. Update the group document with new member balances
        transaction.update(groupRef, {
          members: updatedMembers,
          lastUpdated: serverTimestamp()
        });
      });
      
      // Navigate back to group dashboard with refresh flag
      navigation.navigate('GroupDashboardScreen', {
        groupId,
        groupName,
        refresh: true
      });
      
    } catch (error) {
      console.error('Error saving group expense:', error);
      throw error;
    }
  };
  
  const saveFriendExpense = async (expenseData: any) => {
    if (!friendId || !user) return;
    
    try {
      // Get current user's phone number (needed for friend operations)
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const userPhone = userData.phone;
      
      if (!userPhone) {
        throw new Error('User phone number is required');
      }
      
      // Calculate the balance change
      const totalAmount = parseFloat(amount);
      let balanceChange = 0;
      
      if (paidBy?.uid === user.uid) {
        // User paid, so friend owes user
        // Find friend's split amount
        const friendSplit = expenseData.splitWith.find((s: any) => s.uid === friendId);
        balanceChange = friendSplit ? friendSplit.amount : 0;
      } else {
        // Friend paid, so user owes friend
        // Find user's split amount
        const userSplit = expenseData.splitWith.find((s: any) => s.uid === user.uid);
        balanceChange = -(userSplit ? userSplit.amount : 0);
      }
      
      // Transaction to update everything atomically
      await runTransaction(db, async (transaction) => {
        // Add expense to the user's friends collection
        const expenseRef = doc(collection(db, 'users', userPhone, 'friends', friendId, 'expenses'));
        transaction.set(expenseRef, {
          ...expenseData,
          id: expenseRef.id
        });
        
        // Update friend balance in user's friends list
        const friendRef = doc(db, 'users', userPhone, 'friends', friendId);
        const friendDoc = await transaction.get(friendRef);
        
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          const currentBalance = friendData.totalAmount || 0;
          
          transaction.update(friendRef, {
            totalAmount: currentBalance + balanceChange,
            lastUpdated: serverTimestamp()
          });
        }
      });
      
      // Navigate back to friend dashboard with refresh flag
      navigation.navigate('FriendsDashboardScreen', {
        friendId,
        friendName,
        refresh: true,
        totalOwed: 0, // This will be recalculated on the dashboard
        groups: [] // This will be reloaded on the dashboard
      });
      
    } catch (error) {
      console.error('Error saving friend expense:', error);
      throw error;
    }
  };
  
  // Helper functions for display
  const formatDate = (selectedDate: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return selectedDate.toLocaleDateString('en-US', options);
  };
  
  const getCategoryName = () => {
    const selectedCategory = categories.find(c => c.id === category);
    return selectedCategory ? selectedCategory.name : 'Category';
  };
  
  const getCategoryIcon = () => {
    const selectedCategory = categories.find(c => c.id === category);
    return selectedCategory ? selectedCategory.icon : 'list';
  };
  
  const getSelectedMembersText = () => {
    const selectedCount = Object.values(selectedMembers).filter(Boolean).length;
    
    if (selectedCount === 0) return 'Select people';
    if (selectedCount === members.length) return 'Everyone';
    return `${selectedCount} people`;
  };
  
  const getSplitMethodText = () => {
    const option = splitOptions.find(o => o.id === splitMethod);
    if (splitMethod === 'equal') return 'Split equally';
    return option ? option.name : 'Custom split';
  };
  
  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.uid === memberId);
    return member?.name || 'Unknown';
  };
  
  // Render functions for modals
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.categoryItem, 
                  category === item.id && styles.selectedCategoryItem
                ]}
                onPress={() => handleCategorySelect(item.id)}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={24} 
                    color={category === item.id ? '#0A6EFF' : '#666'} 
                  />
                </View>
                <Text style={[
                  styles.categoryName,
                  category === item.id && styles.selectedCategoryName
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
  
  const renderDateModal = () => (
    <Modal
      visible={showDateModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowDateModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateOptions}>
            <TouchableOpacity 
              style={styles.dateOption}
              onPress={() => {
                setDate(new Date());
                setShowDateModal(false);
              }}
            >
              <Text style={styles.dateOptionText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateOption}
              onPress={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setDate(yesterday);
                setShowDateModal(false);
              }}
            >
              <Text style={styles.dateOptionText}>Yesterday</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dateOptionCustom}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateOptionTextCustom}>Choose date</Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              style={styles.datePicker}
            />
          )}
        </View>
      </View>
    </Modal>
  );
  
  const renderPaidByModal = () => (
    <Modal
      visible={showPaidByModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaidByModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Who paid?</Text>
            <TouchableOpacity onPress={() => setShowPaidByModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={members.filter(member => groupId ? member : true)}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.memberItem, 
                  paidBy?.uid === item.uid && styles.selectedMemberItem
                ]}
                onPress={() => handlePaidBySelect(item)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{item.name}</Text>
                {paidBy?.uid === item.uid && (
                  <Ionicons name="checkmark-circle" size={24} color="#0A6EFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
  
  const renderSplitModal = () => (
    <Modal
      visible={showSplitModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSplitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Split Options</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => {
                  setShowSplitModal(false);
                  setShowSplitInfoModal(true);
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color="#0A6EFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={splitOptions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.splitOptionItem, 
                  splitMethod === item.id && styles.selectedSplitOption
                ]}
                onPress={() => handleSplitMethodSelect(item.id)}
              >
                <View style={styles.splitOptionContent}>
                  <Text style={[
                    styles.splitOptionTitle,
                    splitMethod === item.id && styles.selectedSplitOptionText
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.splitOptionDescription}>
                    {item.description}
                  </Text>
                </View>
                {splitMethod === item.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#0A6EFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
  
  const renderSplitInfoModal = () => (
    <Modal
      visible={showSplitInfoModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSplitInfoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>About Split Methods</Text>
            <TouchableOpacity onPress={() => setShowSplitInfoModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.infoModalContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Split equally</Text>
              <Text style={styles.infoSectionDescription}>
                The total amount is divided evenly among all selected people. 
                For example, if the total is $100 and 4 people are selected, 
                each person would pay $25.
              </Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Split by percentage</Text>
              <Text style={styles.infoSectionDescription}>
                Each person pays a custom percentage of the total. The sum of all 
                percentages must equal 100%. For example, one person might pay 40% 
                and another 60% of the total.
              </Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Split by amounts</Text>
              <Text style={styles.infoSectionDescription}>
                Specify exact amounts for each person. The sum of all amounts must 
                equal the total expense amount. Use this when you know exactly how 
                much each person should pay.
              </Text>
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Split by shares</Text>
              <Text style={styles.infoSectionDescription}>
                Assign shares to determine how the expense is split. For example, 
                if one person has 2 shares and another has 1 share, the first person 
                would pay 2/3 of the total and the second would pay 1/3.
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => setShowSplitInfoModal(false)}
          >
            <Text style={styles.confirmButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const renderMembersModal = () => (
    <Modal
      visible={showMembersModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMembersModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Split with</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => {
                  Alert.alert(
                    "Split Information",
                    "Select the people you want to split this expense with. Only selected people will share the cost.",
                    [{ text: "Got it" }]
                  );
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color="#0A6EFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Select/Deselect All buttons */}
          <View style={styles.selectionButtonsContainer}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={() => {
                console.log('Selecting all members');
                const newSelectedMembers = { ...selectedMembers };
                members.forEach(member => {
                  newSelectedMembers[member.uid] = true;
                });
                setSelectedMembers(newSelectedMembers);
              }}
            >
              <Text style={styles.selectAllButtonText}>Select All</Text>
            </TouchableOpacity>
  
            <TouchableOpacity
              style={styles.deselectAllButton}
              onPress={() => {
                console.log('Deselecting all members');
                const newSelectedMembers = { ...selectedMembers };
                members.forEach(member => {
                  newSelectedMembers[member.uid] = false;
                });
                setSelectedMembers(newSelectedMembers);
              }}
            >
              <Text style={styles.deselectAllButtonText}>Deselect All</Text>
            </TouchableOpacity>
          </View>
  
          {members.length > 0 ? (
            <FlatList
              data={members.filter(m => 
                m.name.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.memberItem}
                  onPress={() => {
                    toggleMemberSelection(item.uid);
                  }}
                >
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberInitial}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <View style={[
                    styles.checkbox,
                    selectedMembers[item.uid] && styles.checkboxSelected
                  ]}>
                    {selectedMembers[item.uid] && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyMembersContainer}>
                  <Text style={styles.emptyMembersText}>No matching members found</Text>
                </View>
              }
            />
          ) : (
            <View style={styles.emptyMembersContainer}>
              <ActivityIndicator size="small" color="#0A6EFF" />
              <Text style={styles.emptyMembersText}>Loading members...</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => setShowMembersModal(false)}
          >
            <Text style={styles.confirmButtonText}>
              Confirm ({Object.values(selectedMembers).filter(Boolean).length} selected)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const renderNotesModal = () => (
    <Modal
      visible={showNotesModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowNotesModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
        >
          <View style={[styles.modalContent, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Notes</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.notesInput}
              placeholder="Add notes about this expense..."
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            
            <View style={styles.notesModalActions}>
              <TouchableOpacity 
                style={styles.keyboardDismissButton}
                onPress={() => Keyboard.dismiss()}
              >
                <Ionicons name="keyboard-outline" size={20} color="#666" />
                <Text style={styles.keyboardDismissText}>Dismiss</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.noteSaveButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowNotesModal(false);
                }}
              >
                <Text style={styles.noteSaveButtonText}>Save Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
  
  // Function to handle changing the group or friend
  const handleChangeGroupOrFriend = (item: any) => {
    console.log("Changed group/friend to:", item);
  
    // Update the route params first to ensure groupId/friendId are set properly
    if (item.type === 'group') {
      navigation.setParams({
        groupId: item.id,
        groupName: item.name,
        friendId: undefined,
        friendName: undefined
      });
      
      // We need to update our local state variables immediately for the fetch functions to work
      groupId = item.id;
      groupName = item.name;
      friendId = undefined;
      friendName = undefined;
      
      // Reload members for the new group
      fetchGroupMembers();
    } else {
      navigation.setParams({
        groupId: undefined,
        groupName: undefined,
        friendId: item.id,
        friendName: item.name
      });
      
      // Update local state variables
      groupId = undefined;
      groupName = undefined;
      friendId = item.id;
      friendName = item.name;
      
      // Load friend info
      setupFriendExpense();
    }
    
    // Close the dropdown
    setShowGroupDropdown(false);
  };
  
  const renderCustomSplitModal = () => (
    <Modal
      visible={showCustomSplitModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCustomSplitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {splitMethod === 'percentage' ? 'Split by Percentage' : 
               splitMethod === 'unequal' ? 'Split by Amounts' : 'Split by Shares'}
            </Text>
            <TouchableOpacity onPress={() => setShowCustomSplitModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.splitTotalContainer}>
            <Text style={styles.splitTotalLabel}>Total Amount</Text>
            <Text style={styles.splitTotalAmount}>${amount || '0.00'}</Text>
          </View>
          
          <FlatList
            data={customSplits}
            keyExtractor={(item) => item.memberId}
            renderItem={({ item }) => (
              <View style={styles.customSplitItem}>
                <View style={styles.customSplitMember}>
                  <View style={styles.miniAvatar}>
                    <Text style={styles.miniAvatarText}>
                      {getMemberName(item.memberId).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.customSplitName}>
                    {getMemberName(item.memberId)}
                  </Text>
                </View>
                
                <View style={styles.customSplitInputContainer}>
                  {splitMethod === 'unequal' && (
                    <Text style={styles.customSplitPrefix}>$</Text>
                  )}
                  <TextInput
                    style={styles.customSplitInput}
                    keyboardType="numeric"
                    value={item.value}
                    onChangeText={(value) => updateCustomSplitValue(item.memberId, value)}
                    placeholder={splitMethod === 'percentage' ? '0' : '0.00'}
                  />
                  {splitMethod === 'percentage' && (
                    <Text style={styles.customSplitSuffix}>%</Text>
                  )}
                </View>
              </View>
            )}
          />
          
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => setShowCustomSplitModal(false)}
          >
            <Text style={styles.confirmButtonText}>Apply Split</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // Main render
  return (
    <SafeAreaView style={styles.safeArea}>
     <KeyboardAvoidingView 
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{flex: 1}}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 0}
>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        {/* Group/Friend context banner */}
        {(groupId || friendId) && (
  <View style={styles.contextBanner}>
    <TouchableOpacity 
      style={styles.contextInfo}
      onPress={() => {
        console.log("Toggling dropdown, current state:", showGroupDropdown);
        console.log("Available groups:", availableGroups.length);
        setShowGroupDropdown(!showGroupDropdown);
      }}
    >
      <Ionicons name={groupId ? "people" : "person"} size={18} color="#fff" />
      <Text style={styles.contextText}>
        {groupId ? groupName : `With ${friendName}`}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#fff" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  </View>
)}

{/* Group Dropdown - Improved Rendering */}
{showGroupDropdown && (
  <View style={styles.dropdownContainer}>
    {availableGroups.length > 0 ? (
      <FlatList
        data={availableGroups}
        keyExtractor={(item) => item.id}
        style={styles.dropdownList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.dropdownItem} 
            onPress={() => {
              console.log("Selected group/friend:", item);
              handleChangeGroupOrFriend(item);
            }}
          >
            <Ionicons 
              name={item.type === 'group' ? "people" : "person"} 
              size={16} 
              color="#0A6EFF" 
            />
            <Text style={styles.dropdownItemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    ) : (
      <View style={styles.emptyDropdownItem}>
        <Text style={styles.emptyDropdownText}>No groups or friends found</Text>
      </View>
    )}
  </View>
)}
        
        {/* Receipt processing indicator */}
        {processingReceipt && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="small" color="#0A6EFF" />
            <Text style={styles.scanningText}>Processing receipt...</Text>
          </View>
        )}
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={{paddingBottom: 0}}
        >
          {/* Error message if any */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {/* Main expense input card */}
          <View style={styles.expenseCard}>
            {/* Description field */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.descriptionInput}
                placeholder="What was this expense for?"
                value={description}
                onChangeText={setDescription}
                returnKeyType="next" // Add this for keyboard navigation
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // Focus on amount field when done
                  // This requires a ref on the amount input which we're not implementing here
                  Keyboard.dismiss();
                }}
              />
            </View>
            
            {/* Amount field */}
            <View style={styles.amountInputContainer}>
              <Ionicons name="cash-outline" size={24} color="#666" style={styles.amountIcon} />
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                returnKeyType="done" // Add this to show a "Done" button on keyboard
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          </View>
          
          {/* Icon grid for options */}
          <View style={styles.iconsGrid}>
            {/* Row 1 */}
            <View style={styles.iconRow}>
              <TouchableOpacity style={styles.iconButton} onPress={handleScanReceipt}>
                <View style={styles.iconCircle}>
                  <Ionicons name="scan-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>Scan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.iconButton} onPress={handleUploadReceipt}>
                <View style={styles.iconCircle}>
                  <Ionicons name="image-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>Upload</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton} 
                onPress={() => setShowCategoryModal(true)}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name={getCategoryIcon() as any} size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>{getCategoryName()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setShowDateModal(true)}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>{formatDate(date)}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Row 2 */}
            <View style={styles.iconRow}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowPaidByModal(true);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="wallet-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText} numberOfLines={1}>
                  {paidBy ? `${paidBy.name} paid` : 'Paid by'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowMembersModal(true);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="people-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>{getSelectedMembersText()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowSplitModal(true);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="pie-chart-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>{getSplitMethodText()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowNotesModal(true);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="create-outline" size={22} color="#0A6EFF" />
                </View>
                <Text style={styles.iconText}>
                  {notes ? 'Edit notes' : 'Add notes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Receipt preview if uploaded */}
          {receiptImage && (
            <View style={styles.receiptContainer}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptTitle}>Receipt</Text>
                <TouchableOpacity onPress={() => setReceiptImage(null)}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              <Image 
                source={{ uri: receiptImage }} 
                style={styles.receiptImage} 
                resizeMode="contain"
              />
            </View>
          )}
        </ScrollView>
        
        {/* Bottom action buttons - fixed at bottom */}
        <Animated.View 
          style={[
            styles.footer,
            {
              transform: [{
                translateY: keyboardHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10]
                })
              }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveExpense}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Expense</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
        
        {/* Render modals */}
        {renderCategoryModal()}
        {renderDateModal()}
        {renderPaidByModal()}
        {renderSplitModal()}
        {renderSplitInfoModal()}
        {renderMembersModal()}
        {renderNotesModal()}
        {renderCustomSplitModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  backButton: {
    padding: 8
  },
  closeButton: {
    padding: 8
  },
  
  // Context banner styles
  contextBanner: {
    backgroundColor: '#0A6EFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  contextInfo: {
    flexDirection: 'row', 
    alignItems: 'center'
  },
  contextText: {
    color: '#fff', 
    marginLeft: 8, 
    fontWeight: '500'
  },
  scanningText: {
    color: '#0A6EFF',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500'
  },
  
  scrollView: {
    flex: 1
  },
  expenseCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  inputGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
    marginBottom: 12
  },
  descriptionInput: {
    fontSize: 16,
    color: '#333',
    padding: 8
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  amountIcon: {
    marginRight: 8
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    padding: 8
  },
  
  // Loading and error styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEB',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    color: '#FF3B30',
    fontSize: 14
  },
  
  // Icon grid styles
  iconsGrid: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  iconButton: {
    alignItems: 'center',
    width: '25%'
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  iconText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  
  // Receipt styles
  receiptContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  receiptImage: {
    height: 150,
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8
  },
  
  // Bottom action buttons
  footer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500'
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#0A6EFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButtonDisabled: {
    backgroundColor: '#0A6EFF80'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  
  // Category modal styles
  categoryItem: {
    width: width / 3,
    alignItems: 'center',
    padding: 12
  },
  selectedCategoryItem: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  selectedCategoryName: {
    color: '#0A6EFF',
    fontWeight: '500'
  },
  
  // Date modal styles
  dateOptions: {
    padding: 16
  },
  dateOption: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  dateOptionText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  dateOptionCustom: {
    backgroundColor: '#e6f0ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8
  },
  dateOptionTextCustom: {
    color: '#0A6EFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center'
  },
  datePicker: {
    width: '100%',
    height: 200
  },
  
  // Member styles
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedMemberItem: {
    backgroundColor: '#f0f8ff'
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  memberInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#0A6EFF',
    borderColor: '#0A6EFF'
  },
  
  // Split modal styles
  splitOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedSplitOption: {
    backgroundColor: '#f0f8ff'
  },
  splitOptionContent: {
    flex: 1
  },
  splitOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4
  },
  selectedSplitOptionText: {
    color: '#0A6EFF'
  },
  splitOptionDescription: {
    fontSize: 14,
    color: '#666'
  },
  
  // Split info modal styles
  infoModalContent: {
    padding: 16
  },
  infoSection: {
    marginBottom: 20
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  infoSectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  
  // Search styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    margin: 16
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333'
  },
  
  // Confirm button
  confirmButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    margin: 16
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  
  // Notes modal styles
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    height: 180,
    fontSize: 16,
    margin: 16,
    textAlignVertical: 'top'
  },
  notesModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  keyboardDismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  keyboardDismissText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666'
  },
  
  // Custom split styles
  splitTotalContainer: {
    backgroundColor: '#e6f0ff',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  splitTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0A6EFF'
  },
  splitTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A6EFF'
  },
  customSplitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  customSplitMember: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  customSplitName: {
    fontSize: 16,
    color: '#333'
  },
  customSplitInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    minWidth: 80
  },
  customSplitInput: {
    fontSize: 16,
    padding: 8,
    color: '#333',
    textAlign: 'right',
    minWidth: 60
  },
  customSplitPrefix: {
    fontSize: 16,
    color: '#666'
  },
  customSplitSuffix: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4
  },
  dropdownContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 9999, // Increase z-index to ensure it appears above other content
  },
  dropdownList: {
    maxHeight: 200,
  },
  // Make sure the other related styles are also in your styles:
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  noteSaveButton: {
    backgroundColor: '#0A6EFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noteSaveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectAllButton: {
    backgroundColor: '#e6f0ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  selectAllButtonText: {
    color: '#0A6EFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deselectAllButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deselectAllButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyDropdownItem: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emptyDropdownText: {
    fontSize: 14,
    color: '#999',
  },
  emptyMembersContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoButton: {
    marginRight: 10,
    padding: 4
  }
});
export default AddExpenseScreen;