// Updated GroupsScreen.tsx with no card blocks and colorful thin lines
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
  Modal,
  Image
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext';
import GroupService from '../services/GroupService';
import { useFocusEffect } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatCurrency';
import BottomNavigator from '../components/BottomNavigator';

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
      
      // Calculate total owed across all groups based on user's balance in each group
      let totalBalance = 0;
      groupsList.forEach(group => {
        // Check if we have members array with balance information
        if (group.members && Array.isArray(group.members)) {
          const userMember = group.members.find((m) => 
            m.uid === user.uid || 
            (m.email && m.email === user.email)
          );
          
          if (userMember) {
            // Add user's balance in this group to total
            totalBalance += (userMember.balance || 0);
          }
        } else if (group.totalAmount) {
          // Fallback to group's totalAmount if no members array with user balance
          totalBalance += group.totalAmount;
        }
      });
      
      console.log('Total balance across all groups:', totalBalance);
      setTotalOwed(totalBalance);
      
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

  // Update the renderGroup function to use subtle divider lines
  const renderGroup = ({ item, index }: { item: any, index: number }) => {
    // Calculate the user's balance in this group
    let userBalance = 0;
    if (item.members && Array.isArray(item.members)) {
      const userMember = item.members.find((m: any) => m.uid === user?.uid);
      if (userMember) {
        userBalance = userMember.balance || 0;
      }
    } else {
      userBalance = item.totalAmount || 0;
    }
    
    // Get emoji for group type
    const getGroupEmoji = (type: string) => {
      switch (type) {
        case 'trip': return '✈️';
        case 'home': return '🏠';
        case 'couple': return '❤️';
        case 'friends': return '👥';
        case 'flatmate': return '🛌';
        case 'apartment': return '🏢';
        default: return '👥';
      }
    };
    
    // Get icon background color - using lighter purple for background
    const getIconBgColor = () => 'rgba(144, 97, 249, 0.1)'; // Light purple background
    
    // Determine text and line color based on balance
    const getLineAndTextColor = () => {
      if (userBalance > 0) {
        return '#00C853'; // Green for "gets back"
      } else if (userBalance < 0) {
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
          style={styles.groupItemNew}
          onPress={() => {
            navigation.navigate('GroupDashboardScreen', {
              groupId: item.id,
              groupName: item.name,
              groupType: item.type || 'other',
              totalAmount: userBalance
            });
          }}
        >
          <View style={[styles.groupIconNew, { backgroundColor: getIconBgColor() }]}>
            <Text style={styles.groupEmoji}>{getGroupEmoji(item.type || 'other')}</Text>
          </View>
          
          <View style={styles.groupInfo}>
            <Text style={styles.groupNameNew} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.groupMembersNew}>
              {item.members ? (typeof item.members === 'number' ? `${item.members} members` : `${item.members.length} members`) : '0 members'}
            </Text>
          </View>
          
          <View style={styles.amountWrapNew}>
            <Text style={[styles.amountTextNew, { color: amountColor }]} numberOfLines={1}>
              {formatCurrency(Math.abs(userBalance))}
            </Text>
            <Text style={[styles.amountLabelNew, { color: amountColor === '#BDBDBD' ? '#666' : amountColor }]}>
              {userBalance > 0 ? 'gets back' : userBalance < 0 ? 'owes' : 'settled up'}
            </Text>
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
            <Text style={styles.filterOptionText}>All Groups</Text>
            {filter === null && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter('owed')}
          >
            <Text style={styles.filterOptionText}>Groups that owe me</Text>
            {filter === 'owed' && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter('owing')}
          >
            <Text style={styles.filterOptionText}>Groups I owe</Text>
            {filter === 'owing' && <Icon name="checkmark" size={18} color="#9061F9" />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterOption}
            onPress={() => applyFilter('settled')}
          >
            <Text style={styles.filterOptionText}>Settled groups</Text>
            {filter === 'settled' && <Icon name="checkmark" size={18} color="#9061F9" />}
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
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity onPress={() => setFilterVisible(true)} style={styles.menuButton}>
            <Icon name="menu" size={18} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.totalAmountSection}>
          <Text style={styles.totalAmountLabel}>Overall in groups:</Text>
          <Text style={styles.totalAmountValue}>{formatCurrency(totalOwed)}</Text>
        </View>
        
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateGroupScreen')}
          >
            <Icon name="add" size={14} color="#fff" />
            <Text style={styles.createButtonText}>Create</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={handleJoinGroup}
          >
            <Icon name="log-in" size={14} color="#9061F9" />
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Groups list section with white background instead of gray */}
      <View style={styles.groupsListSection}>
        <Text style={styles.groupsListTitle}>Your Groups</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9061F9" />
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
                style={styles.emptyStateCreateButton}
                onPress={() => navigation.navigate('CreateGroupScreen')}
              >
                <Text style={styles.emptyStateButtonText}>Create a group</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.emptyStateJoinButton}
                onPress={handleJoinGroup}
              >
                <Text style={styles.emptyStateJoinButtonText}>Join a group</Text>
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
      
      {renderFilterModal()}
      
      {/* Only show the bottom navigator if we're not inside a tab navigator */}
      {!route?.params?.insideTabNavigator && (
        <BottomNavigator activeTab="Groups" />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Keep existing utility styles
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
  
  // Updated groups list section styles - white background
  groupsListSection: {
    flex: 1,
    backgroundColor: '#fff', // Changed from gray to white
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 80, // Add space for tab bar
  },
  groupsListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginLeft: 2,
  },
  
  // New group item styles without card blocks
  groupItemNew: {
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
  groupIconNew: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupNameNew: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  groupMembersNew: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
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
  
  // Reduced sizes for other styles
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
  emptyStateJoinButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(144, 97, 249, 0.3)',
  },
  emptyStateJoinButtonText: {
    color: '#9061F9',
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

export default GroupsScreen;