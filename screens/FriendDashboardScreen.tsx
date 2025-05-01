import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView, Alert, Platform, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook
import { db } from '../services/firebaseConfig';
import { formatCurrency } from '../utils/formatCurrency';
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  orderBy 
} from 'firebase/firestore';

// Import needed for bottom tab navigation
import ActivityService from '../services/ActivityService';

// COLORS - Purple Theme
const COLORS = {
  primary: '#8A2BE2', // Deep Purple (main brand color)
  primaryLight: '#F0E6FF', // Light purple for backgrounds
  primaryDark: '#5D1A9C', // Darker purple for pressed states
  accent: '#9061F9', // Bright purple for accents and highlights
  accentLight: 'rgba(144, 97, 249, 0.15)', // Transparent accent for subtle highlights
  text: '#333333', // Main text color
  textLight: '#757575', // Secondary text color
  background: '#FFFFFF', // Main background
  surface: '#F9F6FF', // Surface color with slight purple tint
  border: '#E8E0FF', // Border color with purple tint
  error: '#FF3B30', // Error color kept the same for consistency
  success: '#4CAF50' // Success color
};

// Define group types and their corresponding icons
const GROUP_TYPES = {
  "flight trip": "airplane-outline",
  "beach trip": "umbrella-outline",
  "flatmate": "home-outline",
  "gettogether": "people-outline",
  "party": "wine-outline"
};

// Helper function to get group icon
const getGroupIcon = (groupName: string = ""): string => {
  const nameLower = groupName.toLowerCase();
  for (const [key, value] of Object.entries(GROUP_TYPES)) {
    if (nameLower.includes(key)) {
      return value;
    }
  }
  return "people-outline"; // Default icon
};

interface SharedGroup {
  id: string;
  name: string;
  type?: string;
  amount: number;
  date: string;
  members?: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: any;
  paidById: string;
  paidByName: string;
  splitWith: any[];
  category: string;
  notes?: string;
  createdAt: any;
}

const FriendDashboardScreen = () => {
  const { user, isLoading: authLoading } = useAuth(); // Use auth context
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FriendsDashboardScreen'>>();
  
  // Get parameters from route
  const { friendId, friendName } = route.params;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [totalOwed, setTotalOwed] = useState(0);
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [directExpenses, setDirectExpenses] = useState<Expense[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for unread activities badge
  const [unreadActivities, setUnreadActivities] = useState(0);

  // Fetch unread activity count when component mounts
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user]);

  // Helper function to fetch unread activity count
  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      // Use ActivityService to get unread count
      const count = await ActivityService.getUnreadCount(user.uid);
      setUnreadActivities(count);
    } catch (error) {
      console.error('Error fetching unread activity count:', error);
      // In case of error, just show 0 unread activities
      setUnreadActivities(0);
    }
  };

  // Load friend data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && friendId) {
        fetchFriendData();
      }
      return () => {}; // Cleanup function
    }, [user, friendId, route.params.refresh])
  );

  // Fetch friend data including shared groups and total owed
  const fetchFriendData = async () => {
    if (!user?.uid || !friendId) {
      console.warn('Missing user ID or friend ID', { userId: user?.uid, friendId });
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Starting fetchFriendData for user ${user.uid} and friend ${friendId}`);
      
      // First get the user's phone number (used as doc ID for the user)
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        console.warn('User document not found');
        setError('User account not found');
        setLoading(false);
        return;
      }
      
      const userData = userSnapshot.docs[0].data();
      const userPhone = userData.phone;
      
      if (!userPhone) {
        console.warn('User phone number not found');
        setError('Phone number not set in your profile');
        setLoading(false);
        return;
      }
      
      // Get friend document from the user's friends collection
      const friendRef = doc(db, 'users', userPhone, 'friends', friendId);
      const friendDoc = await getDoc(friendRef);
      
      if (!friendDoc.exists()) {
        console.warn('Friend document not found');
        setError('Friend not found in your contacts');
        setLoading(false);
        return;
      }
      
      const friendData = friendDoc.data();
      
      // Set the total amount owed
      setTotalOwed(friendData.totalAmount || 0);
      
      // Fetch shared groups with this friend
      const sharedGroupsData: SharedGroup[] = [];
      
      // First direct approach - try with both group by user ID
      console.log(`Trying direct group lookup with user ID: ${user.uid}`);
      const groupsRef = collection(db, 'groups');
      const groupsQuery = query(groupsRef, where('memberIds', 'array-contains', user.uid));
      const groupsSnapshot = await getDocs(groupsQuery);
      
      console.log(`Found ${groupsSnapshot.docs.length} groups for current user`);
      
      // Try alternate approaches if no groups found
      if (groupsSnapshot.empty) {
        console.log("No groups found with primary method, trying alternative approaches");
        
        // Try with email instead of UID
        if (user.email) {
          console.log(`Trying group lookup with user email: ${user.email}`);
          const emailGroupsQuery = query(groupsRef, where('memberEmails', 'array-contains', user.email));
          const emailGroupsSnapshot = await getDocs(emailGroupsQuery);
          console.log(`Found ${emailGroupsSnapshot.docs.length} groups with email lookup`);
          
          // Process these groups
          for (const groupDoc of emailGroupsSnapshot.docs) {
            const groupData = groupDoc.data();
            console.log(`Processing group by email: ${groupData.name}`);
            // Now check if friend is in this group...
            // (rest of your existing group processing code)
          }
        }
        
        // Try with phone number
        if (userPhone) {
          console.log(`Trying group lookup with user phone: ${userPhone}`);
          const phoneGroupsQuery = query(groupsRef, where('memberPhones', 'array-contains', userPhone));
          const phoneGroupsSnapshot = await getDocs(phoneGroupsQuery);
          console.log(`Found ${phoneGroupsSnapshot.docs.length} groups with phone lookup`);
          
          // Process these groups
          for (const groupDoc of phoneGroupsSnapshot.docs) {
            const groupData = groupDoc.data();
            console.log(`Processing group by phone: ${groupData.name}`);
            // Now check if friend is in this group...
            // (rest of your existing group processing code)
          }
        }
      }
      
      // Check if friend is in any of those groups from primary method
      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        console.log(`Checking group: ${groupData.name || 'Unnamed'}`);
        console.log('Group data structure:', JSON.stringify({
          hasMembers: !!groupData.members,
          membersLength: groupData.members?.length,
          hasMemberIds: !!groupData.memberIds,
          memberIdsLength: groupData.memberIds?.length
        }));
        
        // Check all possible ways the friend could be in the group
        let friendFound = false;
        
        // Check memberIds array
        if (groupData.memberIds && Array.isArray(groupData.memberIds)) {
          console.log(`Group memberIds: ${JSON.stringify(groupData.memberIds)}`);
          if (groupData.memberIds.includes(friendId)) {
            console.log(`Friend found in memberIds array with ID: ${friendId}`);
            friendFound = true;
          }
        }
        
        // Check members array objects
        if (!friendFound && groupData.members && Array.isArray(groupData.members)) {
          for (const member of groupData.members) {
            console.log(`Checking member: ${JSON.stringify(member)}`);
            if (member.uid === friendId || member.id === friendId) {
              console.log(`Friend found in members array with ID: ${friendId}`);
              friendFound = true;
              break;
            }
            
            // Check by other identifiers
            if (friendData.email && (member.email === friendData.email)) {
              console.log(`Friend found in members array by email: ${friendData.email}`);
              friendFound = true;
              break;
            }
            
            if (friendData.phone && (member.phone === friendData.phone)) {
              console.log(`Friend found in members array by phone: ${friendData.phone}`);
              friendFound = true;
              break;
            }
          }
        }
        
        if (friendFound) {
          console.log(`Friend ${friendName} is in group ${groupData.name || 'Unnamed Group'}`);
          
          // Extract the friend's balance in this group
          let friendBalance = 0;
          if (groupData.members && Array.isArray(groupData.members)) {
            const friendMember = groupData.members.find((m: any) => 
              m.uid === friendId || 
              m.id === friendId || 
              (friendData.email && m.email === friendData.email) ||
              (friendData.phone && m.phone === friendData.phone)
            );
            
            if (friendMember) {
              // Invert the balance since this is from friend's perspective
              friendBalance = -1 * (friendMember.balance || 0);
              console.log(`Found friend's balance in group: ${friendBalance}`);
            }
          }
          
          // This is a shared group
          sharedGroupsData.push({
            id: groupDoc.id,
            name: groupData.name || 'Unnamed Group',
            type: groupData.type || 'other',
            amount: Math.abs(friendBalance), // Always show absolute value
            date: formatFirestoreDate(groupData.createdAt),
            members: groupData.members?.length || 0
          });
        }
      }
      
      console.log(`After thorough check, found ${sharedGroupsData.length} shared groups with ${friendName}`);
      
      // Also check the expenses directly between the user and friend
      const expensesRef = collection(db, 'users', userPhone, 'friends', friendId, 'expenses');
      const expensesQuery = query(expensesRef, orderBy('createdAt', 'desc'));
      const expensesSnapshot = await getDocs(expensesQuery);
      
      const directExpensesList: Expense[] = [];
      let directExpenseTotal = 0; // Initialize the missing variable
      
      if (!expensesSnapshot.empty) {
        // Get all direct expenses
        expensesSnapshot.docs.forEach((expenseDoc) => {
          const expenseData = expenseDoc.data() as Expense;
          directExpensesList.push({
            ...expenseData,
            id: expenseDoc.id  // This will override any existing id in the data
          });
          
          // Calculate amount based on who paid
          if (expenseData.paidById === user.uid) {
            directExpenseTotal += expenseData.amount; // User paid, so friend owes
          } else {
            directExpenseTotal -= expenseData.amount; // Friend paid, so user owes
          }
        });
    
        // Store direct expenses
        setDirectExpenses(directExpensesList);
        
        if (directExpensesList.length > 0) {
          // Only add if there are expenses
          sharedGroupsData.push({
            id: 'direct-expenses',
            name: 'Direct Expenses',
            type: 'direct',
            amount: Math.abs(directExpenseTotal),
            date: directExpensesList.length > 0 ? 
              formatFirestoreDate(directExpensesList[0].createdAt) : 
              'Recent',
            members: 2
          });
        }
      }
      
      // Sort shared groups by amount descending
      sharedGroupsData.sort((a, b) => b.amount - a.amount);
      
      setSharedGroups(sharedGroupsData);

      console.log(`Final shared groups data: ${sharedGroupsData.length} groups found`);
      if (sharedGroupsData.length > 0) {
        console.log('Setting shared groups state with:', JSON.stringify(sharedGroupsData));
        
        // Sort shared groups by amount descending
        sharedGroupsData.sort((a, b) => b.amount - a.amount);
        
        // Ensure state update
        setSharedGroups([...sharedGroupsData]);
      } else {
        console.log('No shared groups found to display');
        // Set empty array to trigger empty state
        setSharedGroups([]);
      }
      
    } catch (error) {
      console.error('Error fetching friend data:', error);
      setError('Failed to load friend data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getOweText = () => {
    if (totalOwed === 0) {
      return 'All settled up';
    } else if (totalOwed > 0) {
      return `${friendName} owes you ${formatCurrency(totalOwed)}`;
    } else {
      return `You owe ${friendName} ${formatCurrency(Math.abs(totalOwed))}`;
    }
  };
  
  // Format Firestore timestamp to string
  const formatFirestoreDate = (timestamp: any): string => {
    if (!timestamp) return "Recent";
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      return "Recent";
    }
  };

  // Alert for button clicks
  const handleButtonClick = () => {
    Alert.alert("Coming soon!", "This feature is coming up in future updates.");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFriendData();
  };

  // Get status bar height for proper padding
  const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

  // Navigate to GroupDashboardScreen when a group is clicked
  const handleGroupPress = (group: SharedGroup) => {
    if (group.id === 'direct-expenses') {
      // For direct expenses, show details in an alert
      if (directExpenses.length > 0) {
        const expenseSummary = directExpenses.slice(0, 5).map(exp => 
          `${formatFirestoreDate(exp.date)}: ${exp.description} - ${formatCurrency(exp.amount)}`
        ).join('\n');
        
        const moreText = directExpenses.length > 5 ? `\n...and ${directExpenses.length - 5} more` : '';
        
        Alert.alert(
          "Direct Expenses with " + friendName,
          expenseSummary + moreText,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Direct Expenses",
          "No direct expenses found with " + friendName,
          [{ text: "OK" }]
        );
      }
    } else {
      navigation.navigate('GroupDashboardScreen', {
        groupId: group.id,
        groupName: group.name,
        groupType: group.type || 'other',
        totalAmount: group.amount || 0
      });
    }
  };

  // Show loading indicator while data is loading
  if (authLoading || loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: COLORS.primary}}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading friend data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderSharedGroupsSection = () => {
    // Add this at the top to show information about shared groups
    const renderGroupsInfo = () => {
      if (sharedGroups.length > 1) {
        return (
          <View style={styles.groupsInfoContainer}>
            <Text style={styles.groupsInfoText}>
              In {sharedGroups.length} shared groups
            </Text>
          </View>
        );
      }
      return null;
    };
  
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingGroupsContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingGroupsText}>Loading shared groups...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchFriendData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (sharedGroups.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No shared groups yet</Text>
          <Text style={styles.emptyStateSubText}>
            Create a group with {friendName} to track group expenses
          </Text>
          <TouchableOpacity 
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateGroupScreen', {
              initialFriendIds: [friendId],
              initialFriendNames: [friendName]
            })}
          >
            <Text style={styles.createGroupButtonText}>Create a group</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <>
        {renderGroupsInfo()}
        <FlatList
          data={sharedGroups}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.transactionItem}
              onPress={() => handleGroupPress(item)}
            >
              <View style={styles.groupIconContainer}>
                <Icon 
                  name={item.id === 'direct-expenses' ? "person-outline" : getGroupIcon(item.name) as any} 
                  size={24} 
                  color={COLORS.primary} 
                  style={styles.groupIcon} 
                />
              </View>
              
              <View style={styles.transactionDetails}>
                <View style={styles.groupNameRow}>
                  <Text style={styles.transactionTitle}>{item.name}</Text>
                  {item.members && item.members > 2 && (
                    <View style={styles.memberCountContainer}>
                      <Icon name="people-outline" size={14} color={COLORS.textLight} />
                      <Text style={styles.memberCountText}>{item.members}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.transactionSubtitle}>
                  {item.date}
                </Text>
              </View>
              
              <View style={styles.amountContainer}>
                <Text style={styles.borrowedText}>
                  {totalOwed >= 0 ? `${friendName} owes` : 'you owe'}
                </Text>
                <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={{ paddingBottom: 80 }} // Add padding to avoid floating button overlap
        />
      </>
    );
  };
  
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.primary}}>
      <View style={styles.container}>
        {/* Compact Purple header */}
        <View style={[styles.header, Platform.OS === 'android' && { paddingTop: STATUSBAR_HEIGHT }]}>
          <View style={styles.topBar}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.friendName}>{friendName}</Text>
              <Text style={styles.oweText}>{getOweText()}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => navigation.navigate('FriendSettingsScreen', { 
                friendId: friendId,
                friendName: friendName,
                email: route.params.email || ''
              })}
            >
              <Icon name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons with icons - redesigned look */}
        <View style={styles.actionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
              <Icon name="card-outline" size={18} color={COLORS.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Settle up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
              <Icon name="notifications-outline" size={18} color={COLORS.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Remind</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
              <Icon name="bar-chart-outline" size={18} color={COLORS.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Charts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
              <Icon name="download-outline" size={18} color={COLORS.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Export</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Shared Groups List */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionHeader}>Shared Groups</Text>
          {renderSharedGroupsSection()}
        </View>

        {/* Floating Action Button - now purple and better positioned */}
        <TouchableOpacity 
          style={styles.floatingActionButton}
          onPress={() => navigation.navigate('AddExpenseScreen', {
            friendId: friendId,
            friendName: friendName
          })}>
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Tab Bar with redesigned style - removed colored bar below */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Groups' })}
            >
              <View style={styles.tabIconContainer}>
                <Icon name="people-outline" size={22} color="#666" />
              </View>
              <Text style={styles.tabLabel}>Groups</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Friends' })}
            >
              <View style={styles.activeTabIconContainer}>
                <Icon name="person" size={22} color={COLORS.accent} />
              </View>
              <Text style={styles.activeTabLabel}>
                Friends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Activity' })}
            >
              <View style={styles.tabIconContainer}>
                <Icon name="time-outline" size={22} color="#666" />
                {unreadActivities > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {unreadActivities > 9 ? '9+' : unreadActivities}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.tabLabel}>Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Account' })}
            >
              <View style={styles.tabIconContainer}>
                <Icon name="person-circle-outline" size={22} color="#666" />
              </View>
              <Text style={styles.tabLabel}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Updated styles with purple theme and compact header
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16
  },
  loadingGroupsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingGroupsText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 10
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderBottomLeftRadius: 0, // Removed rounded corners for more compact look
    borderBottomRightRadius: 0
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  friendName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  oweText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  actionsRow: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    gap: 12
  },
  actionContainer: {
    marginTop: 15
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  actionIcon: {
    marginRight: 6
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionsContainer: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 15
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  groupIconContainer: {
    marginRight: 14
  },
  groupIcon: {
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 10
  },
  transactionDetails: {
    flex: 1
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  memberCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  memberCountText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  transactionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  amountContainer: {
    alignItems: 'flex-end'
  },
  borrowedText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed'
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  floatingActionButton: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Increased to avoid overlap with tab bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  createGroupButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 5
  },
  createGroupButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  groupsInfoContainer: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  groupsInfoText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingBottom: Platform.OS === 'ios' ? 20 : 5,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  activeTabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  activeTabLabel: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff'
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  }
});

export default FriendDashboardScreen;