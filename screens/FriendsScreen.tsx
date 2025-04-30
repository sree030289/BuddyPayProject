// Complete refined FriendsScreen.tsx implementation

import React, { useState, useCallback, useEffect } from 'react';
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
  where,
  getDoc,
  doc
} from 'firebase/firestore';
import { useAuth } from '../components/AuthContext';

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

const FriendsScreen = ({ navigation, route }: FriendsScreenProps) => {
  const { user, isLoading: authLoading } = useAuth();
  
  // Get params from route if available
  const routeParams = route?.params || {};
  const statusFromRoute = routeParams.status || routeParams.toastStatus;
  const refreshTriggerFromRoute = routeParams.refreshTrigger || 0;
  
  const [filterVisible, setFilterVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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
      fetchFriends();
    }
  }, [refreshTriggerFromRoute, user]);

  // Fetch friends whenever screen comes into focus and user data is available
  useFocusEffect(
    useCallback(() => {
      if (user && !authLoading) {
        fetchFriends();
      }
      return () => {};
    }, [user, filter, authLoading])
  );

  const handleSplitBill = () => {
    navigation.navigate('AddExpenseScreen');
  };

  const fetchFriends = async () => {
    if (!user) {
      console.log('No user available yet');
      return;
    }

    const userEmail = user.email;
    if (!userEmail) {
      setError('User email not found');
      setLoading(false);
      setRefreshing(false);
      setInitialLoading(false);
      return;
    }

    setLoading(true);
    setRefreshing(true);
    setError(null);
    
    try {
      // First, get the user document to find their phone
      const userQuery = query(collection(db, 'users'), where('email', '==', userEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const userPhone = userData.phone;

        if (!userPhone) {
          setError('Phone number not set in your profile');
          setLoading(false);
          setRefreshing(false);
          setInitialLoading(false);
          return;
        }

        // Get friends collection directly
        const friendsRef = collection(db, 'users', userPhone, 'friends');
        const friendsQuery = filter 
          ? query(friendsRef, where('status', '==', filter))
          : friendsRef;
          
        const friendsSnapshot = await getDocs(friendsQuery);
        
        const friendsList = friendsSnapshot.docs.map((doc) => {
          return {
            id: doc.id,
            ...doc.data(),
            // Set default status to "pending" if not specified
            status: doc.data().status || "pending"
          };
        });
        
        // Calculate total balance across all friends
        let totalOwed = 0;
        
        // Also calculate total from groups
        try {
          // Get all groups the user is part of
          const groupsRef = collection(db, 'groups');
          const groupsQuery = query(groupsRef, where('memberIds', 'array-contains', user.uid));
          const groupsSnapshot = await getDocs(groupsQuery);
          
          // For each group, find the user's balance
          for (const groupDoc of groupsSnapshot.docs) {
            const groupData = groupDoc.data();
            if (groupData.members && Array.isArray(groupData.members)) {
              // Find the current user in the members array
              const userMember = groupData.members.find((m: any) => m.uid === user.uid);
              if (userMember && userMember.balance) {
                // Add this balance to the total
                totalOwed += userMember.balance;
              }
            }
          }
        } catch (groupError) {
          console.error('Error calculating group balances:', groupError);
        }
        
        // Add direct friend balances
        for (const friend of friendsList) {
          totalOwed += (friend.totalAmount || 0);
        }
        
        setTotalBalance(totalOwed);
        setFriends(friendsList);
        setLoading(false);
        setRefreshing(false);
        setInitialLoading(false);
      } else {
        setError('User account not found');
        setLoading(false);
        setRefreshing(false);
        setInitialLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading friends');
      setLoading(false);
      setRefreshing(false);
      setInitialLoading(false);
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
    if (type.includes("flight") || type.includes("trip")) return "airplane-outline";
    if (type.includes("beach")) return "umbrella-outline";
    if (type.includes("flat") || type.includes("home")) return "home-outline";
    if (type.includes("together") || type.includes("group")) return "people-outline";
    if (type.includes("party")) return "wine-outline";
    return "people-outline"; // Default icon
  };

  // Alert for button clicks
  const handleButtonClick = () => {
    Alert.alert("Coming soon!", "This feature is coming up in future updates.");
  };

  const navigateToAddFriends = () => {
    const params = {
      userId: user?.uid,
      email: user?.email || undefined
    };
    
    navigation.navigate('AddFriendsScreen', params);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFriends();
  };

  const renderFriend = ({ item }: { item: any }) => {
    const bgColors = ['#F44336', '#9C27B0', '#FF9800', '#3F51B5', '#4CAF50', '#009688'];
    const randomColor = bgColors[item.name.charCodeAt(0) % bgColors.length];
    
    // Helper function to capitalize the first letter of each word
    const capitalizeWords = (str: string) => {
      return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    // Format the amount display correctly
    const owedAmount = item.totalAmount || 0;
    const amountDisplay = Math.abs(owedAmount).toFixed(0);
    const isPositive = owedAmount > 0;
    
    // Get capitalized name
    const displayName = capitalizeWords(item.name || '');
    
    return (
      <TouchableOpacity
        style={styles.friendRow}
        onPress={() => {
          navigation.navigate('FriendsDashboardScreen', {
            friendId: item.id,
            friendName: displayName,
            totalOwed: item.totalAmount || 0,
            email: user?.email || undefined,
            groups: item.groups || []
          });
        }}
      >
        <View style={[styles.friendIcon, { backgroundColor: randomColor }]}>
          <Text style={styles.friendInitial}>{displayName.charAt(0)}</Text>
        </View>
        
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{displayName}</Text>
          
          {/* Always show Pending status as a smaller tag, not as the primary balance text */}
          {item.status === 'pending' ? (
            <View style={styles.statusContainer}>
              <Icon name="time-outline" size={14} color="#FF9800" />
              <Text style={styles.pendingStatus}>Pending</Text>
            </View>
          ) : owedAmount !== 0 ? (
            <Text style={[
              styles.balanceInfo, 
              { color: isPositive ? '#4CAF50' : '#E65100' }
            ]}>
              {isPositive ? `owes you ₹${amountDisplay}` : `you owe ₹${amountDisplay}`}
            </Text>
          ) : (
            <Text style={styles.settledStatus}>Settled up</Text>
          )}
        </View>
        
        <View style={styles.amountWrap}>
          {/* Only show amount if there is one, regardless of status */}
          {owedAmount !== 0 ? (
            <>
              <Text style={[
                styles.amountText, 
                { color: isPositive ? '#4CAF50' : '#E65100' }
              ]}>
                ₹{amountDisplay}
              </Text>
              <Text style={[
                styles.amountLabel,
                { color: isPositive ? '#4CAF50' : '#E65100' }
              ]}>
                {isPositive ? 'owes you' : 'you owe'}
              </Text>
            </>
          ) : item.status === 'pending' ? (
            <Text style={styles.statusText}>Pending</Text>
          ) : (
            <Text style={styles.settledText}>Settled</Text>
          )}
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
        {/* Header */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Friends</Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)}>
            <Icon name="filter" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter Modal */}
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

        {/* Balance and Add Friend row */}
        <View style={styles.balanceRow}>
          {totalBalance !== 0 ? (
            <Text style={[
              styles.totalAmount, 
              {color: totalBalance > 0 ? '#4CAF50' : '#E65100'}
            ]}>
              {totalBalance > 0 
                ? `Others owe you ₹${totalBalance.toFixed(0)}` 
                : `You owe others ₹${Math.abs(totalBalance).toFixed(0)}`}
            </Text>
          ) : (
            <Text style={styles.totalAmount}>All settled up</Text>
          )}
          
          <TouchableOpacity 
            style={styles.addFriendsButton}
            onPress={navigateToAddFriends}
          >
            <Icon name="person-add" size={18} color="#0A6EFF" />
            <Text style={styles.addFriendsText}>Add friend</Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons row */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleSplitBill}
          >
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

        {/* Content area with loading/error/empty states or friend list */}
        {initialLoading || (loading && !refreshing) ? (
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

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
    padding: 16,
    borderRadius: 10,
    marginBottom: 20
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700'
  },
  // Balance row styling
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
    paddingRight: 10,
    lineHeight: 28
  },
  addFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D6E4FF'
  },
  addFriendsText: {
    color: '#0A6EFF',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 15
  },
  // Action buttons styles
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f7ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e8ff'
  },
  actionButtonText: {
    color: '#0A6EFF',
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '500'
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 80,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  cancelText: {
    color: '#0A6EFF',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
    padding: 8
  },
  // Friend row styling
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 4
  },
  friendIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 22
  },
  friendName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 6
  },
  // Status styling
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pendingStatus: {
    fontSize: 13,
    color: '#FF9800',
    marginLeft: 4,
    fontWeight: '500'
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800'
  },
  settledStatus: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500'
  },
  settledText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575'
  },
  // Balance info styling
  balanceInfo: {
    fontSize: 14,
    fontWeight: '500'
  },
  // Amount display styling
  amountWrap: {
    alignItems: 'flex-end',
    minWidth: 80,
    marginLeft: 10
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600'
  },
  amountLabel: {
    fontSize: 12,
    marginTop: 2
  },
  // List styling
  separator: {
    height: 1,
    backgroundColor: '#eee'
  },
  listContent: {
    paddingBottom: 80
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  // Empty state styling
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#555'
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 240
  },
  emptyStateButton: {
    marginTop: 24,
    backgroundColor: '#0A6EFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  // Error state styling
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
    borderRadius: 10
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});

export default FriendsScreen;