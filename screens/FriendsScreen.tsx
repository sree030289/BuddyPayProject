// Complete refined FriendsScreen.tsx implementation with GroupsScreen styling

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
import { formatCurrency } from '../utils/formatCurrency';
import BottomNavigator from '../components/BottomNavigator';

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
        const userPhone = userData.phoneNumber;

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

  const applyFilter = (filterOption: string | null) => {
    setFilter(filterOption);
    setFilterVisible(false);
    
    // Refetch with the new filter
    if (user) {
      fetchFriends();
    }
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

  const renderFriend = ({ item, index }: { item: any, index: number }) => {
    // Generate a pseudo-random pastel color based on the friend's name
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
    
    // Get capitalized name
    const displayName = capitalizeWords(item.name || '');
    
    // Determine text and line color based on balance
    const getLineAndTextColor = () => {
      if (owedAmount > 0) {
        return '#00C853'; // Green for "gets back"
      } else if (owedAmount < 0) {
        return '#FF5252'; // Red for "owes"
      } else {
        return '#BDBDBD'; // Gray for "settled"
      }
    };
    
    const colorForLine = getLineAndTextColor();
    const amountColor = getLineAndTextColor();
    
    return (
      <View>
        <TouchableOpacity
          style={styles.friendItemNew}
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
          <View style={[styles.friendIconNew, { backgroundColor: 'rgba(144, 97, 249, 0.1)' }]}>
            <Text style={styles.friendInitial}>{displayName.charAt(0)}</Text>
          </View>
          
          <View style={styles.friendInfo}>
            <Text style={styles.friendNameNew} numberOfLines={1}>{displayName}</Text>
            {item.status === 'pending' ? (
              <View style={styles.statusContainer}>
                <Icon name="time-outline" size={11} color="#FF9800" />
                <Text style={styles.pendingStatus}>Pending</Text>
              </View>
            ) : (
              <Text style={styles.friendStatusNew}>
                {item.status === 'accepted' ? 'Friend' : item.status}
              </Text>
            )}
          </View>
          
          <View style={styles.amountWrapNew}>
            {owedAmount !== 0 ? (
              <>
                <Text style={[styles.amountTextNew, { color: amountColor }]} numberOfLines={1}>
                  {formatCurrency(Math.abs(owedAmount))}
                </Text>
                <Text style={[styles.amountLabelNew, { color: amountColor === '#BDBDBD' ? '#666' : amountColor }]}>
                  {owedAmount > 0 ? 'gets back' : owedAmount < 0 ? 'owes' : 'settled up'}
                </Text>
              </>
            ) : (
              <Text style={styles.settledText}>Settled</Text>
            )}
          </View>
        </TouchableOpacity>
        {/* Add very subtle divider at the bottom of each item except the last one */}
        <View style={[styles.subtleDivider, { backgroundColor: colorForLine + '15' }]} />
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={filterVisible} transparent animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        onPress={() => setFilterVisible(false)}
      >
        <View style={styles.filterModal}>
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter(null)}
          >
            <Text style={styles.filterOptionText}>All Friends</Text>
            {filter === null && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter('accepted')}
          >
            <Text style={styles.filterOptionText}>Accepted</Text>
            {filter === 'accepted' && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter('pending')}
          >
            <Text style={styles.filterOptionText}>Pending</Text>
            {filter === 'pending' && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelFilterButton}
            onPress={() => setFilterVisible(false)}
          >
            <Text style={styles.cancelFilterText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Show loading indicator while auth data is loading
  if (authLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#9061F9" />
          <Text style={styles.loadingText}>Loading user data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      {/* Header section with white background */}
      <View style={styles.headerSection}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.menuButton}>
            <Icon name="menu" size={18} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.totalAmountSection}>
          <Text style={styles.totalAmountLabel}>Overall with friends:</Text>
          <Text style={styles.totalAmountValue}>{formatCurrency(totalBalance)}</Text>
        </View>
        
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleSplitBill}
          >
            <Icon name="cash" size={14} color="#fff" />
            <Text style={styles.createButtonText}>Split bill</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={navigateToAddFriends}
          >
            <Icon name="person-add" size={14} color="#9061F9" />
            <Text style={styles.joinButtonText}>Add friend</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Friends list section with white background */}
      <View style={styles.friendsListSection}>
        <Text style={styles.friendsListTitle}>Your Friends</Text>

        {loading && initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9061F9" />
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
            <Icon name="person-add-outline" size={80} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No friends yet</Text>
            <Text style={styles.emptyStateSubtitle}>Add friends to split expenses with them</Text>
            <View style={styles.emptyStateButtons}>
              <TouchableOpacity 
                style={styles.emptyStateCreateButton}
                onPress={navigateToAddFriends}
              >
                <Text style={styles.emptyStateButtonText}>Add a friend</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      
      {renderFilterModal()}
      
      {/* Add our new bottom navigator */}
      {/* Only show the bottom navigator if we're not inside a tab navigator */}
      {/* Check route.params.insideTabNavigator to know if we're in a tab navigator */}
      {!route?.params?.insideTabNavigator && (
        <BottomNavigator activeTab="Friends" />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Utility styles
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Updated header section styles with much smaller sizes
  headerSection: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  menuButton: {
    padding: 6,
  },
  totalAmountSection: {
    marginBottom: 12,
  },
  totalAmountLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  totalAmountValue: {
    fontSize: 24,
    fontWeight: '500',
    color: '#9061F9',
    marginTop: -2,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9061F9',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
  joinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(144, 97, 249, 0.3)',
    gap: 6,
  },
  joinButtonText: {
    color: '#9061F9',
    fontWeight: '500',
    fontSize: 13,
  },
  
  // Updated friends list section styles - white background
  friendsListSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 80, // Add space for tab bar
  },
  friendsListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 2,
  },
  
  // New friend item styles without card blocks
  friendItemNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  // New subtle divider style
  subtleDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)', // Very light, almost invisible
  },
  friendIconNew: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  friendInitial: {
    fontSize: 16,
    color: '#9061F9',
    fontWeight: '600',
  },
  friendInfo: {
    flex: 1,
  },
  friendNameNew: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  friendStatusNew: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingStatus: {
    fontSize: 10,
    color: '#FF9800',
    marginLeft: 2,
  },
  amountWrapNew: {
    alignItems: 'flex-end',
    maxWidth: '45%', // Limit width to prevent overflow
  },
  amountTextNew: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  amountLabelNew: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
    textAlign: 'right',
  },
  settledText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#BDBDBD',
  },
  
  // Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  
  // Empty state styles with reduced sizes
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 80,
    paddingTop: 30,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButtons: {
    width: '100%',
    gap: 10,
  },
  emptyStateCreateButton: {
    backgroundColor: '#9061F9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Error state styles with reduced sizes
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  errorMessage: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#9061F9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Filter modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#333',
  },
  cancelFilterButton: {
    paddingVertical: 10,
    marginTop: 6,
    alignItems: 'center',
  },
  cancelFilterText: {
    color: '#9061F9',
    fontWeight: '600',
    fontSize: 13,
  }
});

export default FriendsScreen;