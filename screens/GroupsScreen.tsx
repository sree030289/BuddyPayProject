// Updated GroupsScreen.tsx with GroupService integration
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext';
import GroupService from '../services/GroupService';
import { useFocusEffect } from '@react-navigation/native';

interface GroupsScreenProps {
  navigation: any;
  route?: any;
}

const GroupsScreen = ({ navigation, route }: GroupsScreenProps) => {
  const { user, isLoading: authLoading } = useAuth(); // Get user data from AuthContext
  
  const [filterVisible, setFilterVisible] = useState(false);
  const [filter, setFilter] = useState<string | null>(null); // 'settled', 'owed', 'owing', or null (all)

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalOwed, setTotalOwed] = useState(0);
  // Add a refresh counter to track when to refresh
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log('GroupsScreen mounted with user from AuthContext:', user);
    console.log('Route params:', JSON.stringify(route?.params || {}));
    
    // If params include refresh flag, increment refresh counter
    if (route?.params?.refresh) {
      console.log('Refresh flag detected in route params, triggering refresh');
      setRefreshCounter(prev => prev + 1);
    }
  }, [user, route?.params]);

  // Fetch groups when screen gains focus and when user is available
  useFocusEffect(
    React.useCallback(() => {
      if (!authLoading && user) {
        console.log('Screen focused, fetching groups...');
        fetchGroups();
      }
      return () => {}; // Cleanup function
    }, [user, authLoading, refreshCounter]) // Add refreshCounter as dependency
  );

  const getFilteredGroups = () => {
    if (!filter) return groups; // No filter, return all groups
    
    return groups.filter(group => {
      // Calculate the user's balance in this group
      let userBalance = 0;
      if (group.members && Array.isArray(group.members)) {
        const userMember = group.members.find((m: any) => m.uid === user?.uid);
        if (userMember) {
          userBalance = userMember.balance || 0;
        }
      } else {
        userBalance = group.totalAmount || 0;
      }
      
      switch (filter) {
        case 'settled':
          return userBalance === 0;
        case 'owed':
          return userBalance > 0; // Others owe you
        case 'owing':
          return userBalance < 0; // You owe others
        default:
          return true;
      }
    });
  };
  const applyFilter = (filterOption: string | null) => {
    setFilter(filterOption);
    setFilterVisible(false);
  };
  const fetchGroups = async () => {
    if (!user?.email || !user?.uid) {
      setError('User email not found');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching groups for user email:', user.email);
      
      // Use GroupService to fetch groups
      const groupsList = await GroupService.getUserGroups(user.uid, user.email);
      
      console.log('Fetched groups:', groupsList.length);
      setGroups(groupsList);
      
      // Calculate total owed across all groups
      const total = groupsList.reduce((sum, group) => sum + (group.totalAmount || 0), 0);
      setTotalOwed(total);
      
      setLoading(false);
    } catch (e) {
      console.error('Error fetching groups:', e);
      setError(e instanceof Error ? e.message : 'Error loading groups');
      setLoading(false);
    }
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroupScreen');
  };

// Update the renderGroup function in GroupsScreen.tsx to handle balances correctly
const renderGroup = ({ item }: { item: any }) => {
  // Define group type colors
  const typeColors: {[key: string]: string} = {
    'trip': '#4A90E2',
    'home': '#50C878',
    'couple': '#FF6B81',
    'friends': '#9D65C9',
    'flatmate': '#FF9642',
    'apartment': '#8A2BE2',
    'other': '#607D8B'
  };
  
  // Use type color or fallback to random color based on name
  const bgColors = ['#3F51B5', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#009688'];
  const typeColor = item.type && typeColors[item.type] 
    ? typeColors[item.type] 
    : bgColors[item.name.charCodeAt(0) % bgColors.length];
  
  // Calculate the user's balance in this group
  let userBalance = 0;
  if (item.members && Array.isArray(item.members)) {
    const userMember = item.members.find((m: any) => m.uid === user?.uid);
    if (userMember) {
      userBalance = userMember.balance || 0;
    }
  } else {
    // If no members array, use totalAmount directly
    userBalance = item.totalAmount || 0;
  }
  
  // Determine if the amount should be shown in green (owed), red (owe), or gray (settled)
  const amountColor = 
    userBalance > 0 ? '#4CAF50' : 
    userBalance < 0 ? '#F44336' : 
    '#757575';
  
  return (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => {
        // Navigate to GroupDashboard
        navigation.navigate('GroupDashboardScreen', {
          groupId: item.id,
          groupName: item.name,
          groupType: item.type || 'other',
          totalAmount: userBalance
        });
      }}
    >
      <View style={[styles.groupIcon, { backgroundColor: typeColor }]}>
        {/* Show icon based on group type */}
        {item.type === 'trip' && <Icon name="airplane" size={24} color="#fff" />}
        {item.type === 'home' && <Icon name="home" size={24} color="#fff" />}
        {item.type === 'couple' && <Icon name="heart" size={24} color="#fff" />}
        {item.type === 'friends' && <Icon name="people" size={24} color="#fff" />}
        {item.type === 'flatmate' && <Icon name="bed" size={24} color="#fff" />}
        {item.type === 'apartment' && <Icon name="business" size={24} color="#fff" />}
        {(!item.type || item.type === 'other') && <Text style={styles.groupInitial}>{item.name?.[0]}</Text>}
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>
          {item.members ? (typeof item.members === 'number' ? `${item.members} members` : `${item.members.length} members`) : '0 members'}
        </Text>
      </View>
      
      <View style={styles.amountWrap}>
        <Text style={[styles.amountText, { color: amountColor }]}>
          ₹{Math.abs(userBalance)}
        </Text>
        <Text style={styles.amountLabel}>
          {userBalance > 0 ? 'You are owed' : userBalance < 0 ? 'You owe' : 'Settled up'}
        </Text>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.filterOptionText}>All Groups</Text>
          {filter === null && <Icon name="checkmark" size={18} color="#0A6EFF" />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterOption}
          onPress={() => applyFilter('owed')}
        >
          <Text style={styles.filterOptionText}>Groups that owe me</Text>
          {filter === 'owed' && <Icon name="checkmark" size={18} color="#0A6EFF" />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterOption}
          onPress={() => applyFilter('owing')}
        >
          <Text style={styles.filterOptionText}>Groups I owe</Text>
          {filter === 'owing' && <Icon name="checkmark" size={18} color="#0A6EFF" />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterOption}
          onPress={() => applyFilter('settled')}
        >
          <Text style={styles.filterOptionText}>Settled groups</Text>
          {filter === 'settled' && <Icon name="checkmark" size={18} color="#0A6EFF" />}
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
          <Text style={styles.topBarTitle}>Groups</Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.filterButton}>
          <Icon name="filter" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
        <Text style={styles.totalAmount}>
          Overall in groups: ₹{totalOwed}
        </Text>
        <View style={styles.buttonsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateGroupScreen')}
          >
            <Icon name="add-circle" size={18} color="#0A6EFF" />
            <Text style={styles.actionButtonText}>Create</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleJoinGroup}
          >
            <Icon name="log-in" size={18} color="#0A6EFF" />
            <Text style={styles.actionButtonText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle-outline" size={60} color="#F44336" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchGroups}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Icon name="people-circle-outline" size={80} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No groups yet</Text>
            <Text style={styles.emptyStateSubtitle}>Create a group to split expenses with multiple people</Text>
            <View style={styles.emptyStateButtons}>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('CreateGroupScreen')}
              >
                <Text style={styles.emptyStateButtonText}>Create a group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.emptyStateButton, styles.outlineButton]}
                onPress={handleJoinGroup}
              >
                <Text style={styles.outlineButtonText}>Join a group</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
          data={getFilteredGroups()}
          keyExtractor={(item) => item.id}
          renderItem={renderGroup}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={loading}
          onRefresh={fetchGroups}
          showsVerticalScrollIndicator={false}
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
    backgroundColor: '#fff',
    paddingBottom: 80 // Add space for tab bar
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  filterButton: {
    padding: 8
  },
  headerActions: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  totalAmount: {
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
    color: '#0A2A66',
    flex: 1 // Add flex to allow proper space allocation
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0 // Prevent buttons from shrinking
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4
  },
  actionButtonText: {
    color: '#0A6EFF',
    fontWeight: 'bold'
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  groupInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  groupMembers: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  amountWrap: {
    alignItems: 'flex-end'
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600'
  },
  amountLabel: {
    fontSize: 12,
    color: '#666'
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
    paddingHorizontal: 20
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24
  },
  emptyStateButtons: {
    width: '100%',
    gap: 12
  },
  emptyStateButton: {
    backgroundColor: '#0A6EFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0A6EFF'
  },
  outlineButtonText: {
    color: '#0A6EFF',
    fontWeight: 'bold',
    fontSize: 16
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
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
    borderBottomColor: '#f0f0f0'
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333'
  },
  cancelFilterButton: {
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center'
  },
  cancelFilterText: {
    color: '#0A6EFF',
    fontWeight: '600',
    fontSize: 16
  }
});

export default GroupsScreen;