import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator, 
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../components/AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  doc,
  getDoc,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import SharedTabBar from '../components/SharedTabBar';
import { RootStackParamList } from '../types';

// Define navigation prop type
type ActivityScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Activity types for different actions
export enum ActivityType {
  GROUP_CREATED = 'group_created',
  GROUP_JOINED = 'group_joined',
  FRIEND_ADDED = 'friend_added',
  FRIEND_INVITED = 'friend_invited',
  EXPENSE_ADDED = 'expense_added',
  EXPENSE_DELETED = 'expense_deleted',
  EXPENSE_EDITED = 'expense_edited',
  FRIEND_REMOVED = 'friend_removed',
  MEMBER_ADDED = 'member_added',
  SETTLEMENT = 'settlement',
  GROUP_SETTINGS_CHANGED = 'group_settings_changed'
}

// Activity interface
export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: Timestamp;
  data: {
    groupId?: string;
    groupName?: string;
    friendId?: string;
    friendName?: string;
    expenseId?: string;
    expenseAmount?: number;
    expenseDescription?: string;
    userId?: string;
    userName?: string;
    settledAmount?: number;
    [key: string]: any;
  };
  read: boolean;
}

const ActivityScreen = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<ActivityScreenNavigationProp>();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch activities when the component mounts and when user changes
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    if (!user) return;
    
    try {
      setError(null);
      if (!refreshing) setLoading(true);
      
      // Try to get the user's phone number for looking up friends data
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setError('User profile not found');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const userData = userDoc.data();
      const userPhone = userData.phone;
      
      // Fetch activities from user's activities subcollection
      const activitiesRef = collection(db, 'users', user.uid, 'activities');
      const activitiesQuery = query(
        activitiesRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const activitiesSnapshot = await getDocs(activitiesQuery);
      
      if (!activitiesSnapshot.empty) {
        // Process activities from the database
        const fetchedActivities = activitiesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp
          } as Activity;
        });
        
        setActivities(fetchedActivities);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // If no activities found in db, generate some from user's data
      // This is for demonstration and should be removed in production
      // In a real app, activities would be created when actions happen
      
      const generatedActivities: Activity[] = [];
      
      // Fetch groups to generate group-related activities
      const groupsRef = collection(db, 'groups');
      const groupsQuery = query(groupsRef, where('memberIds', 'array-contains', user.uid));
      const groupsSnapshot = await getDocs(groupsQuery);
      
      let groupCount = 0;
      
      for (const groupDoc of groupsSnapshot.docs) {
        // Limit to 3 groups to avoid too many mock activities
        if (groupCount >= 3) break;
        
        const groupData = groupDoc.data();
        groupCount++;
        
        // Generate group created activity
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - groupCount * 3); // Stagger dates
        
        generatedActivities.push({
          id: `generated-group-${groupDoc.id}`,
          type: ActivityType.GROUP_CREATED,
          timestamp: Timestamp.fromDate(createdDate),
          data: {
            groupId: groupDoc.id,
            groupName: groupData.name || 'Group',
            userId: user.uid,
            userName: user.displayName || 'You'
          },
          read: groupCount > 1 // First one unread
        });
        
        // Generate expense activity if this group has expenses
        if (groupData.members && Array.isArray(groupData.members)) {
          const expenseDate = new Date(createdDate);
          expenseDate.setDate(expenseDate.getDate() + 1);
          
          generatedActivities.push({
            id: `generated-expense-${groupDoc.id}`,
            type: ActivityType.EXPENSE_ADDED,
            timestamp: Timestamp.fromDate(expenseDate),
            data: {
              groupId: groupDoc.id,
              groupName: groupData.name || 'Group',
              expenseId: `mock-expense-${groupDoc.id}`,
              expenseDescription: 'Dinner',
              expenseAmount: 850,
              userId: user.uid,
              userName: user.displayName || 'You'
            },
            read: groupCount > 1 // First one unread
          });
        }
      }
      
      // If we have the user's phone, generate friend-related activities
      if (userPhone) {
        const friendsRef = collection(db, 'users', userPhone, 'friends');
        const friendsSnapshot = await getDocs(friendsRef);
        
        let friendCount = 0;
        
        for (const friendDoc of friendsSnapshot.docs) {
          // Limit to 3 friends
          if (friendCount >= 3) break;
          
          const friendData = friendDoc.data();
          friendCount++;
          
          // Generate friend added activity
          const addedDate = new Date();
          addedDate.setDate(addedDate.getDate() - friendCount * 2);
          
          generatedActivities.push({
            id: `generated-friend-${friendDoc.id}`,
            type: ActivityType.FRIEND_ADDED,
            timestamp: Timestamp.fromDate(addedDate),
            data: {
              friendId: friendDoc.id,
              friendName: friendData.name || 'Friend',
              userId: user.uid,
              userName: user.displayName || 'You'
            },
            read: true
          });
          
          // For first friend, add a settlement activity
          if (friendCount === 1) {
            const settlementDate = new Date(addedDate);
            settlementDate.setDate(settlementDate.getDate() + 1);
            
            generatedActivities.push({
              id: `generated-settlement-${friendDoc.id}`,
              type: ActivityType.SETTLEMENT,
              timestamp: Timestamp.fromDate(settlementDate),
              data: {
                friendId: friendDoc.id,
                friendName: friendData.name || 'Friend',
                userId: user.uid,
                userName: user.displayName || 'You',
                settledAmount: 350
              },
              read: false
            });
          }
        }
      }
      
      // Add one expense edited and one deleted activity
      if (groupCount > 0) {
        const firstGroupDoc = groupsSnapshot.docs[0];
        const firstGroupData = firstGroupDoc.data();
        
        const editedDate = new Date();
        editedDate.setDate(editedDate.getDate() - 5);
        
        generatedActivities.push({
          id: `generated-expense-edited`,
          type: ActivityType.EXPENSE_EDITED,
          timestamp: Timestamp.fromDate(editedDate),
          data: {
            groupId: firstGroupDoc.id,
            groupName: firstGroupData.name || 'Group',
            expenseId: 'mock-expense-edited',
            expenseDescription: 'Groceries',
            expenseAmount: 750,
            previousAmount: 680,
            userId: user.uid,
            userName: user.displayName || 'You'
          },
          read: true
        });
        
        const deletedDate = new Date();
        deletedDate.setDate(deletedDate.getDate() - 6);
        
        generatedActivities.push({
          id: `generated-expense-deleted`,
          type: ActivityType.EXPENSE_DELETED,
          timestamp: Timestamp.fromDate(deletedDate),
          data: {
            groupId: firstGroupDoc.id,
            groupName: firstGroupData.name || 'Group',
            expenseId: 'mock-expense-deleted',
            expenseDescription: 'Coffee',
            expenseAmount: 120,
            userId: user.uid,
            userName: user.displayName || 'You'
          },
          read: true
        });
      }
      
      // Sort by timestamp (newest first)
      generatedActivities.sort((a, b) => 
        b.timestamp.toMillis() - a.timestamp.toMillis()
      );
      
      setActivities(generatedActivities);
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const formatTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[date.getDay()]} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // More than a week
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case ActivityType.GROUP_CREATED:
        return { name: 'people-circle', color: '#4A90E2' };
      case ActivityType.GROUP_JOINED:
        return { name: 'enter', color: '#50C878' };
      case ActivityType.FRIEND_ADDED:
        return { name: 'person-add', color: '#9D65C9' };
      case ActivityType.FRIEND_INVITED:
        return { name: 'mail', color: '#FF9642' };
      case ActivityType.EXPENSE_ADDED:
        return { name: 'cash', color: '#4CAF50' };
      case ActivityType.EXPENSE_DELETED:
        return { name: 'trash', color: '#F44336' };
      case ActivityType.EXPENSE_EDITED:
        return { name: 'create', color: '#FF9800' };
      case ActivityType.FRIEND_REMOVED:
        return { name: 'person-remove', color: '#F44336' };
      case ActivityType.MEMBER_ADDED:
        return { name: 'person-add', color: '#8A2BE2' };
      case ActivityType.SETTLEMENT:
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case ActivityType.GROUP_SETTINGS_CHANGED:
        return { name: 'settings', color: '#0A6EFF' };
      default:
        return { name: 'alert-circle', color: '#607D8B' };
    }
  };

  const getActivityDescription = (activity: Activity) => {
    const { type, data } = activity;
    
    switch (type) {
      case ActivityType.GROUP_CREATED:
        return `You created group "${data.groupName}"`;
      
      case ActivityType.GROUP_JOINED:
        return `You joined group "${data.groupName}"`;
      
      case ActivityType.FRIEND_ADDED:
        return `You added ${data.friendName} as a friend`;
      
      case ActivityType.FRIEND_INVITED:
        return `You invited ${data.friendName} to BuddyPay`;
      
      case ActivityType.EXPENSE_ADDED:
        return `You added expense "${data.expenseDescription}" (₹${data.expenseAmount}) in "${data.groupName}"`;
      
      case ActivityType.EXPENSE_DELETED:
        return `You deleted expense "${data.expenseDescription}" from "${data.groupName}"`;
      
      case ActivityType.EXPENSE_EDITED:
        return `You edited expense "${data.expenseDescription}" in "${data.groupName}"`;
      
      case ActivityType.FRIEND_REMOVED:
        return `You removed ${data.friendName} from your friends`;
      
      case ActivityType.MEMBER_ADDED:
        return `You added ${data.friendName} to group "${data.groupName}"`;
      
      case ActivityType.SETTLEMENT:
        return `You settled up ₹${data.settledAmount} with ${data.friendName}`;
      
      case ActivityType.GROUP_SETTINGS_CHANGED:
        return `You changed setting "${data.settingName}" to ${data.settingValue} in "${data.groupName}"`;
      
      default:
        return 'Unknown activity';
    }
  };

  const handleActivityPress = (activity: Activity) => {
    // Navigate to relevant screen based on activity type
    switch (activity.type) {
      case ActivityType.GROUP_CREATED:
      case ActivityType.GROUP_JOINED:
      case ActivityType.EXPENSE_ADDED:
      case ActivityType.EXPENSE_EDITED:
      case ActivityType.EXPENSE_DELETED:
      case ActivityType.GROUP_SETTINGS_CHANGED:
        // Navigate to group dashboard if we have a groupId
        if (activity.data.groupId) {
          navigation.navigate('GroupDashboardScreen', {
            groupId: activity.data.groupId,
            groupName: activity.data.groupName || 'Group'
          });
        }
        break;
        
      case ActivityType.FRIEND_ADDED:
      case ActivityType.FRIEND_INVITED:
      case ActivityType.FRIEND_REMOVED:
      case ActivityType.SETTLEMENT:
        // Navigate to friend dashboard if we have a friendId
        if (activity.data.friendId) {
          navigation.navigate('FriendsDashboardScreen', {
            friendId: activity.data.friendId,
            friendName: activity.data.friendName || 'Friend'
          });
        }
        break;
    }
    
    // TODO: Mark the activity as read in Firebase
    // This would be implemented in a full version
  };

  const renderActivityItem = ({ item }: { item: Activity }) => {
    const icon = getActivityIcon(item.type);
    const description = getActivityDescription(item);
    const timestamp = formatTimestamp(item.timestamp);
    
    return (
      <TouchableOpacity 
        style={[
          styles.activityItem,
          !item.read && styles.unreadActivity
        ]}
        onPress={() => handleActivityPress(item)}
      >
        <View style={[styles.activityIconContainer, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        
        <View style={styles.activityContent}>
          <Text style={styles.activityDescription}>{description}</Text>
          <Text style={styles.activityTime}>{timestamp}</Text>
        </View>
        
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="bar-chart-outline" size={60} color="#bbb" />
      <Text style={styles.emptyStateTitle}>No recent activity</Text>
      <Text style={styles.emptyStateSubtitle}>
        When you add expenses or settle up with friends, your activity will show here
      </Text>
    </View>
  );

  // Handle loading state while auth data is loading
  if (authLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screenContainer}>
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Activity</Text>
          <TouchableOpacity>
            <Ionicons name="filter-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Activity Feed */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading activity...</Text>
          </View>
        ) : (
          <FlatList
            data={activities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              activities.length === 0 && styles.emptyListContent
            ]}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#0A6EFF']}
                tintColor="#0A6EFF"
              />
            }
          />
        )}
        
        {/* Tab Bar at the bottom */}
        <SharedTabBar activeTab="Activity" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 10,
    paddingBottom: 60 // Space for tab bar
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A6EFF',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#888'
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  emptyListContent: {
    flex: 1
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  unreadActivity: {
    backgroundColor: '#f5f9ff'
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  activityContent: {
    flex: 1,
    marginRight: 8
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20
  },
  activityTime: {
    fontSize: 12,
    color: '#888'
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A6EFF',
    marginTop: 6
  }
});

export default ActivityScreen;