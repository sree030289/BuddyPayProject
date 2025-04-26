// Updated FriendsScreen.tsx with TypeScript fixes

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ToastAndroid,
  Platform,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { db } from '../services/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook

type FriendsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FriendsScreen'>;

interface FriendsScreenProps {
  navigation: FriendsScreenNavigationProp;
  route?: {
    params?: {
      userId?: string;
      email?: string;
      status?: string;
      refreshTrigger?: number;
      insideTabNavigator?: boolean;
      toastStatus?: string;
    }
  };
}

// Group types and their corresponding icons
const GROUP_TYPES = {
  "flight trip": "airplane-outline",
  "beach trip": "umbrella-outline",
  "flatmate": "home-outline",
  "gettogether": "people-outline",
  "party": "wine-outline"
};

const FriendsScreen = ({ navigation, route }: FriendsScreenProps) => {
  const { user, isLoading: authLoading } = useAuth(); // Get user data from AuthContext
  
  // Get params from route if available
  const routeParams = route?.params || {};
  const statusFromRoute = routeParams.status || routeParams.toastStatus;
  const refreshTriggerFromRoute = routeParams.refreshTrigger || 0;
  const insideTabNavigatorParam = routeParams.insideTabNavigator || false;
  
  // Debug logging
  React.useEffect(() => {
    console.log('FriendsScreen mounted with:');
    console.log('- User from AuthContext:', user);
    console.log('- refreshTrigger:', refreshTriggerFromRoute);
    console.log('- toastStatus:', statusFromRoute);
    console.log('- insideTabNavigator:', insideTabNavigatorParam);
    console.log('- routeParams:', JSON.stringify(routeParams));
  }, [user]);

  const [filterVisible, setFilterVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Display toast/alert for status message
  React.useEffect(() => {
    if (statusFromRoute) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(statusFromRoute, ToastAndroid.SHORT);
      } else {
        Alert.alert('Status', statusFromRoute);
      }
    }
  }, [statusFromRoute]);

  // Refetch when refreshTrigger changes
  React.useEffect(() => {
    if (refreshTriggerFromRoute > 0 && user) {
      console.log("Refresh triggered, fetching friends...");
      fetchFriends();
    }
  }, [refreshTriggerFromRoute, user]);

  // Fetch friends whenever screen comes into focus and user data is available
  useFocusEffect(
    useCallback(() => {
      if (user && !authLoading) {
        fetchFriends();
      }
      return () => {}; // cleanup function
    }, [user, filter, authLoading])
  );

  const fetchFriends = async () => {
    if (!user) {
      console.log('No user available yet');
      return;
    }

    const userEmail = user.email;
    if (!userEmail) {
      console.warn('No email available for user');
      setError('User email not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log('Fetching for user email:', userEmail);

    try {
      // First, get the user document to find their phone
      const userQuery = query(collection(db, 'users'), where('email', '==', userEmail));
      console.log('Executing query for user with email:', userEmail);
      const userSnapshot = await getDocs(userQuery);
      console.log('User query returned:', userSnapshot.docs.length, 'documents');

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const userPhone = userData.phone;
        console.log('Found user phone:', userPhone);

        if (!userPhone) {
          console.warn('Phone number not found for user');
          setError('Phone number not set in your profile');
          setLoading(false);
          return;
        }

        // Get friends collection directly
        console.log('Fetching friends from path:', `users/${userPhone}/friends`);
        const friendsRef = collection(db, 'users', userPhone, 'friends');
        const friendsQuery = filter 
          ? query(friendsRef, where('status', '==', filter))
          : friendsRef;
          
        const friendsSnapshot = await getDocs(friendsQuery);
        console.log('Friends query returned:', friendsSnapshot.docs.length, 'documents');
        
        const friendsList = friendsSnapshot.docs.map((doc) => {
          console.log('Friend document:', doc.id, JSON.stringify(doc.data()));
          return {
            id: doc.id,
            ...doc.data()
          };
        });
        
        console.log('Friends processed:', friendsList.length);
        setFriends(friendsList);
        setLoading(false);
      } else {
        console.warn('No user document found for email:', userEmail);
        setError('User account not found');
        setLoading(false);
      }
    } catch (e) {
      console.error('Error fetching friends:', e);
      setError(e instanceof Error ? e.message : 'Error loading friends');
      setLoading(false);
    }
  };

  const applyFilter = (filterOption: string) => {
    if (filterOption === 'None') {
      setFilter(null);
    } else if (filterOption === 'Accepted') {
      setFilter('accepted');
    } else if (filterOption === 'Pending') {
      setFilter('pending');
    }
    setFilterVisible(false);
    
    // Refetch with the new filter
    if (user) {
      fetchFriends();
    }
  };

  // Helper function to determine group icon
  const getGroupIcon = (groupType: string = "") => {
    const type = groupType.toLowerCase();
    for (const [key, value] of Object.entries(GROUP_TYPES)) {
      if (type.includes(key)) {
        return value;
      }
    }
    return "people-outline"; // Default icon
  };

  // Alert for button clicks
  const handleButtonClick = () => {
    Alert.alert("Coming soon!", "This feature is coming up in future updates.");
  };

  const navigateToAddFriends = () => {
    // Ensure we're passing only defined properties to match the types
    const params = {
      userId: user?.uid,
      email: user?.email || undefined // Convert null to undefined if needed
    };
    
    console.log('Navigating to AddFriendsScreen with:', params);
    navigation.navigate('AddFriendsScreen', params);
  };

  const renderFriend = ({ item }: { item: any }) => {
    const bgColors = ['#F44336', '#9C27B0', '#FF9800', '#3F51B5', '#4CAF50', '#009688'];
    const randomColor = bgColors[item.name.charCodeAt(0) % bgColors.length];
    
    // Determine if the item has group information and what type of group
    const hasGroup = item.groups && item.groups.length > 0;
    const groupType = hasGroup ? item.groups[0].name : "";
    const groupIcon = getGroupIcon(groupType);
    
    return (
      <TouchableOpacity
        style={styles.friendRow}
        onPress={() => {
          console.log('Navigating to FriendsDashboardScreen with:', {
            friendId: item.id,
            friendName: item.name,
            email: user?.email || undefined
          });
          
          navigation.navigate('FriendsDashboardScreen', {
            friendId: item.id,
            friendName: item.name,
            totalOwed: item.totalAmount || 1495, // fallback if not present
            groups: item.groups || [
              
            ],
            email: user?.email || undefined
          });
        }}
      >
        <View style={[styles.friendIcon, { backgroundColor: randomColor }]}>
          <Text style={styles.friendInitial}>{item.name?.[0]}</Text>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.name}</Text>
          
          {hasGroup && (
            <View style={styles.groupContainer}>
              <Icon name={groupIcon} size={16} color="#555" />
              <Text style={styles.groupName}>{item.groups[0].name}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.amountWrap}>
          <Text style={[
            styles.amountText, 
            { color: item.status === 'accepted' ? '#4CAF50' : '#E65100' }
          ]}>
            {item.status === 'accepted' ? 'Accepted' : 'Pending'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading state while auth data is loading
  if (authLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.screenContainer}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Friends</Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Icon name="filter" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal visible={filterVisible} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
            <View style={styles.filterModal}>
              {['None', 'Accepted', 'Pending'].map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.filterOption}
                  onPress={() => applyFilter(item)}
                >
                  <Text>{item}</Text>
                  {(item === 'None' && filter === null) || 
                   (item === 'Accepted' && filter === 'accepted') ||
                   (item === 'Pending' && filter === 'pending') ? (
                    <Icon name="checkmark" size={18} color="#0A6EFF" />
                  ) : null}
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.headerActions}>
          <Text style={styles.totalAmount}>
            Overall, you owe ₹{friends.reduce((sum, friend) => sum + (friend.totalAmount || 0), 0)}
          </Text>
          <TouchableOpacity 
            style={styles.addFriendsButton}
            onPress={navigateToAddFriends}
          >
            <Icon name="person-add" size={18} color="#0A6EFF" />
            <Text style={styles.addFriendsText}>Add friends</Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons with icons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleButtonClick}>
            <Icon name="cash-outline" size={20} color="#0A6EFF" />
            <Text style={styles.actionButtonText}>Split Bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleButtonClick}>
            <Icon name="notifications-outline" size={20} color="#0A6EFF" />
            <Text style={styles.actionButtonText}>Remind</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleButtonClick}>
            <Icon name="download-outline" size={20} color="#0A6EFF" />
            <Text style={styles.actionButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={60} color="#F44336" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchFriends}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Icon name="person-add-outline" size={60} color="#bbb" />
            <Text style={styles.emptyStateTitle}>No friends yet.</Text>
            <Text style={styles.emptyStateSubtitle}>Invite someone to split expenses easily!</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={navigateToAddFriends}
            >
              <Text style={styles.emptyStateButtonText}>Add Friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshing={loading}
            onRefresh={fetchFriends}
            contentContainerStyle={{ paddingBottom: 80 }} // Add padding to avoid overlap with tab bar
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default FriendsScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 10,
    paddingHorizontal: 20,
    paddingBottom: 80, // Add padding for tab bar
    backgroundColor: '#fff'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A6EFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerActions: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2A66'
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addFriendsText: {
    color: '#0A6EFF',
    fontWeight: 'bold'
  },
  // Action buttons styles
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f5ff',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e8ff'
  },
  actionButtonText: {
    color: '#0A6EFF',
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd'
  },
  cancelText: {
    color: '#0A6EFF',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold'
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12
  },
  friendIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  friendInfo: {
    flex: 1
  },
  friendInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111'
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  groupName: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4
  },
  amountWrap: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600'
  },
  separator: {
    height: 1,
    backgroundColor: '#eee'
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
    alignItems: 'center'
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
  emptyStateButton: {
    marginTop: 20,
    backgroundColor: '#0A6EFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: 'bold'
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
  }
});