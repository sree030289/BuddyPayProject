import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext';
import ActivityService from '../services/ActivityService';
import { formatDistanceToNow } from 'date-fns';
import { useIsFocused } from '@react-navigation/native';

const ActivityScreen = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  // Fetch activities when the component mounts or refreshes
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch user's activities - temporarily remove the orderBy to avoid index requirements
      // If you've created the index from the link in the error, you can uncomment the orderBy line
      const userActivities = await ActivityService.getActivitiesWithoutIndex(user.uid);
      console.log(`Fetched ${userActivities.length} activities for user`, 
        userActivities.map(a => `${a.type} - ${a.data?.description || 'No description'}`));
      
      setActivities(userActivities);
      
      // Mark all as read when viewing the screen
      await ActivityService.markAllActivitiesAsRead(user.uid);
    } catch (error) {
      console.error('Error fetching activities:', error);
      
      // Set empty activities array to avoid crashes
      setActivities([]);
      
      // Try fetching without ordering as a fallback
      try {
        const fallbackActivities = await ActivityService.getActivitiesNoOrder(user.uid);
        console.log(`Fallback: Fetched ${fallbackActivities.length} activities`);
        setActivities(fallbackActivities);
      } catch (fallbackError) {
        console.error('Even fallback activity fetch failed:', fallbackError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load activities when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      console.log("Activity screen focused, refreshing data");
      fetchActivities();
    }
  }, [isFocused, fetchActivities]);

  // Add this new effect to refresh when unread count changes
  useEffect(() => {
    const refreshUnreadInterval = setInterval(() => {
      if (isFocused && user) {
        // Check for new activities
        ActivityService.getUnreadCount(user.uid)
          .then(count => {
            if (count > 0) {
              console.log(`Found ${count} unread activities, refreshing`);
              fetchActivities();
            }
          })
          .catch(err => console.error("Error checking for unread activities:", err));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshUnreadInterval);
  }, [isFocused, user, fetchActivities]);

  // Pull-to-refresh functionality
  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  // Function to format time (e.g., "2 hours ago")
  const formatTime = (timestamp: Date) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Function to render different activity types
  const renderActivity = (activity: any) => {
    // Add more detailed logging to help diagnose
    console.log(`Activity ${activity.id} of type: ${activity.type}`);
    console.log("Activity data:", JSON.stringify(activity.data || {}, null, 2));
    
    // Check for explicit demotion indicators
    const explicitDemotion = 
      activity.type === 'admin_demotion' || 
      activity.type === 'admin_role_removed' ||
      activity.data?.actionType === 'demotion' || 
      activity.data?.isDemotion === true;
    
    // Handle explicit demotion activities first  
    if (explicitDemotion) {
      if (activity.userId === user?.uid && activity.type === 'admin_role_removed') {
        // User was demoted
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-remove-circle-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>You</Text>
                {' were removed as an admin from '}
                <Text style={styles.activityHighlight}>
                  {activity.targetName || 'a group'}
                </Text>
                {activity.data?.removedBy ? ` by ${activity.data.removedBy}` : ''}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      } else {
        // User demoted someone else
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-remove-circle-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' removed admin privileges from '}
                <Text style={styles.activityHighlight}>
                  {activity.data?.demotedName || 'a member'}
                </Text>
                {' in '}
                <Text style={styles.activityHighlight}>
                  {activity.targetName || 'a group'}
                </Text>
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      }
    }
    
    // Continue with all other activity types
    switch (activity.type) {
      case 'expense_added':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="receipt-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' added an expense '}
                <Text style={styles.activityHighlight}>
                  "{activity.data?.description || 'Expense'}"
                </Text>
                {' for '}
                <Text style={styles.activityHighlight}>
                  ${parseFloat(activity.data?.amount || 0).toFixed(2)}
                </Text>
                {activity.targetName && activity.targetName !== 'Group/Friend' ? 
                  ` in ${activity.targetName}` : ''}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
        
      case 'group_created':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="people-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' created a new group '}
                <Text style={styles.activityHighlight}>
                  "{activity.data?.groupName || activity.targetName || 'New Group'}"
                </Text>
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
        
      case 'friend_added':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' added '}
                <Text style={styles.activityHighlight}>
                  {activity.data?.friendName || activity.targetName || 'a friend'}
                </Text>
                {' as a friend'}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      
      case 'member_added':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-add-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' added '}
                <Text style={styles.activityHighlight}>
                  {activity.data?.memberName || 'a member'}
                </Text>
                {' to '}
                <Text style={styles.activityHighlight}>
                  {activity.targetName || 'a group'}
                </Text>
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
        
      case 'added_to_group':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="people-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>You</Text>
                {' were added to '}
                <Text style={styles.activityHighlight}>
                  {activity.targetName || 'a group'}
                </Text>
                {activity.data?.addedBy ? ` by ${activity.data.addedBy}` : ''}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      
      case 'group_deleted':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="trash-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' deleted the group '}
                <Text style={styles.activityHighlight}>
                  "{activity.data?.groupName || activity.targetName || 'Group'}"
                </Text>
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      
      case 'friend_removed':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="person-remove-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' removed '}
                <Text style={styles.activityHighlight}>
                  {activity.data?.friendName || activity.targetName || 'a friend'}
                </Text>
                {' from friends list'}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
      
      case 'group_left':
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="exit-outline" size={24} color="#8A2BE2" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                <Text style={styles.activityName}>{activity.userName}</Text>
                {' left the group '}
                <Text style={styles.activityHighlight}>
                  "{activity.data?.groupName || activity.targetName || 'Group'}"
                </Text>
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );

      // Removed member_promoted, promoted_to_admin, member_demoted, demoted_from_admin cases
      // since they're now handled above
      
      // Fallback for unknown types
      default:
        return (
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="alert-circle-outline" size={24} color="#999" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                Unknown activity type: {activity.type}
              </Text>
              <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
            </View>
          </View>
        );
    }
  };

  // Render empty state when no activities
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
          <Text style={styles.emptyText}>Loading activities...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Activities Yet</Text>
        <Text style={styles.emptyText}>
          Activities like adding expenses, settling up, and joining groups will appear here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        {activities.length > 0 && (
          <Text style={styles.activityCount}>{activities.length}</Text>
        )}
      </View>
      
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id || String(item.timestamp)}
        renderItem={({ item }) => renderActivity(item)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8A2BE2']} />
        }
        ListEmptyComponent={renderEmptyState()}
        contentContainerStyle={activities.length === 0 ? styles.listEmptyContainer : styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: Platform.OS === 'ios' ? 50 : 10, // Add padding for status bar
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    fontSize: 18, // Reduced from 22
    fontWeight: '600',
    color: '#8A2BE2', // Changed to purple
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  activityCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A2BE2',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 85, // Increased to account for tab bar
  },
  listEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 85, // Added for tab bar
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12, // Reduced from 16
    marginHorizontal: 10, // Reduced from 16
    marginVertical: 6, // Reduced from 8
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  activityIcon: {
    width: 36, // Reduced from 40
    height: 36, // Reduced from 40
    borderRadius: 18,
    backgroundColor: '#f5f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14, // Reduced from 15
    color: '#333',
    lineHeight: 20, // Reduced from 22
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  activityName: {
    fontWeight: '600',
    color: '#333',
  },
  activityHighlight: {
    fontWeight: '600',
    color: '#8A2BE2',
  },
  activityTime: {
    fontSize: 11, // Reduced from 12
    color: '#888',
    marginTop: 3, // Reduced from 4
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ActivityScreen;