import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert,
  Image,
  ScrollView,
  BackHandler,
  Modal
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { db } from '../services/firebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import SharedTabBar from '../components/SharedTabBar';
import { useAuth } from '../components/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';

// Define the proper types for the component props
type GroupDashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GroupDashboardScreen'>;
  route: RouteProp<{
    GroupDashboardScreen: {
      groupId: string;
      groupName: string;
      groupType?: string;
      totalAmount?: number;
      isNewGroup?: boolean;
      refresh?: boolean;
      refreshGroupsOnReturn?: boolean;
    }
  }, 'GroupDashboardScreen'>;
};

// Define transaction interface
interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  paidBy: string;
  paidById?: string;
  splitWith: string[];
  type: string;
  category?: string;
  timestamp?: any;
  notes?: string;
}

// Define member interface
interface GroupMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  balance: number;
  isAdmin?: boolean;
  uid?: string; // Adding this to match the Firebase data structure
}

// Define group data interface
interface GroupDataType {
  id: string;
  name: string;
  type?: string;
  members: GroupMember[];
  createdAt?: any;
  createdBy?: string;
  totalAmount?: number;
  imageUrl?: string | null;
  [key: string]: any; // Allow for additional properties
}

// Define category spending interface for the timeline visualization
interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// Helper to group transactions by date
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const grouped: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    const date = transaction.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  // Convert to array format for FlatList
  return Object.keys(grouped)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Sort from newest to oldest
    .map(date => ({
      date,
      data: grouped[date]
    }));
};

// Get color for category
const getCategoryColor = (category: string) => {
  const categoryColors: Record<string, string> = {
    food: '#4A90E2',
    transport: '#50C878',
    shopping: '#FF6B81',
    entertainment: '#9D65C9',
    home: '#FF9642',
    bills: '#8A2BE2',
    health: '#4CAF50',
    travel: '#009688',
    education: '#607D8B',
    other: '#E91E63'
  };
  
  return categoryColors[category] || '#607D8B'; // Default color for unknown categories
};

const GroupDashboardScreen = ({ navigation, route }: GroupDashboardScreenProps): JSX.Element => {
  // Get user from AuthContext
  const { user } = useAuth();
  
  // Extract params from route
  const { groupId, groupName, groupType = 'other', totalAmount = 0, isNewGroup = false, refresh = false, refreshGroupsOnReturn = false } = route.params;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<GroupDataType | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<{date: string, data: Transaction[]}[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'members'>('expenses');
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null); // Member filter for expenses
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [showBalanceSummaryModal, setShowBalanceSummaryModal] = useState(false);
  const [balanceSummaries, setBalanceSummaries] = useState<{name: string, amount: number}[]>([]);
  const [currentMemberBalances, setCurrentMemberBalances] = useState<Record<string, number>>({});
  const [unreadActivities, setUnreadActivities] = useState(0); // Adding this for the notification badge

  // Handler for back button to handle 'refreshGroupsOnReturn' flag
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (refreshGroupsOnReturn) {
          navigation.navigate('MainDashboard', { 
            screen: 'Groups',
            params: { refresh: true, timestamp: Date.now() }
          });
          return true; // Handled
        }
        return false; // Not handled, let default behavior happen
      };

      // Add event listener for Android back button
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => {
        // Remove the event listener on cleanup
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [refreshGroupsOnReturn, navigation])
  );

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'You need to be logged in to view group details.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PINEntryScreen')
          }
        ]
      );
      return;
    }
    
    fetchGroupData();
  }, [groupId, user, refresh]); 

  // Group transactions whenever transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      // Start with all transactions
      let transactionsToShow = [...transactions];
      
      // Apply filter if set
      if (filterMemberId) {
        transactionsToShow = transactions.filter(t => 
          t.paidById === filterMemberId || 
          (t.splitWith && t.splitWith.includes(filterMemberId))
        );
      }
      
      // Set filtered transactions
      setFilteredTransactions(transactionsToShow);
      
      // Group by date
      setGroupedTransactions(groupTransactionsByDate(transactionsToShow));
      
      // Calculate spending by category
      calculateCategorySpending(transactions);
    }
  }, [transactions, filterMemberId]);

  const calculateCategorySpending = (transactions: Transaction[]) => {
    // Get total spending by category
    const categoryTotals: Record<string, number> = {};
    let totalSpending = 0;
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
      totalSpending += transaction.amount;
    });
    
    // Convert to array with percentages
    const spending: CategorySpending[] = Object.keys(categoryTotals).map(category => {
      const amount = categoryTotals[category];
      return {
        category,
        amount,
        percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        color: getCategoryColor(category)
      };
    });
    
    // Sort by amount descending
    spending.sort((a, b) => b.amount - a.amount);
    
    setCategorySpending(spending);
  };

  const fetchGroupData = async () => {
    if (!user) return; // Safety check
    
    try {
      setLoading(true);
      
      // Fetch group data from Firestore
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (groupDoc.exists()) {
        const data = { 
          id: groupDoc.id, 
          ...groupDoc.data() 
        } as GroupDataType;
        
        setGroupData(data);
        
        // Get members directly from the group data if available
        if (data.members && Array.isArray(data.members)) {
          // Convert the members array to the format expected by our component
          const formattedMembers = data.members.map((member: any) => {
            // Store member balances in a lookup for fast access
            setCurrentMemberBalances(prev => ({
              ...prev,
              [member.uid]: member.balance || 0
            }));
            
            return {
              id: member.uid || member.id || Date.now().toString(),
              uid: member.uid || member.id,
              name: member.name || 'Unknown',
              email: member.email || undefined,
              phone: member.phone || undefined,
              balance: member.balance || 0,
              isAdmin: member.isAdmin || false
            };
          });
          
          setMembers(formattedMembers);
          console.log(`Loaded ${formattedMembers.length} members from group data`);
          
          // Create balance summaries for UI display
          const summaries = formattedMembers
            .filter(member => member.balance !== 0)
            .map(member => ({
              name: member.name,
              amount: member.balance
            }))
            .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
          
          setBalanceSummaries(summaries);
          
        } else {
          // Fallback to fetching from subcollection if members not in group document
          try {
            const membersRef = collection(db, 'groups', groupId, 'members');
            const membersSnapshot = await getDocs(membersRef);
            
            if (!membersSnapshot.empty) {
              const membersData = membersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              })) as GroupMember[];
              setMembers(membersData);
              console.log(`Loaded ${membersData.length} members from subcollection`);
              
              // Create balance summaries
              const summaries = membersData
                .filter(member => member.balance !== 0)
                .map(member => ({
                  name: member.name,
                  amount: member.balance
                }))
                .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
              
              setBalanceSummaries(summaries);
              
            } else {
              console.log('No members found in subcollection');
            }
          } catch (err) {
            console.error('Error fetching members subcollection:', err);
          }
        }
        
        // Fetch transactions
        const transactionsRef = collection(db, 'groups', groupId, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        setTransactions(transactionsData);
        console.log(`Loaded ${transactionsData.length} transactions`);
      } else {
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroupData();
  };

  const handleAddExpense = () => {
    // Navigate to add expense screen with group parameters
    navigation.navigate('AddExpenseScreen', {
      groupId,
      groupName
    });
  };

  const handleAddMember = () => {
    navigation.navigate('AddGroupMembersScreen', {
      groupId,
      groupName
    });
  };

  const handleSettleUp = () => {
    Alert.alert('Settle Up', 'This feature is coming soon!');
  };

  const handleSettings = () => {
    navigation.navigate('GroupSettingsScreen', {
      groupId,
      groupName,
      groupType
    });
  };

  const handleBackToGroups = () => {
    // If refreshGroupsOnReturn flag is set, navigate with refresh param
    if (refreshGroupsOnReturn) {
      navigation.navigate('MainDashboard', { 
        screen: 'Groups',
        params: { refresh: true, timestamp: Date.now() }
      });
    } else {
      navigation.navigate('MainDashboard', { screen: 'Groups' });
    }
  };

  const handleViewMember = (member: GroupMember) => {
    // Only navigate if this isn't the current user
    if (member.id !== user?.uid && member.uid !== user?.uid) {
      // Navigate to FriendDashboardScreen instead of FriendSettingsScreen
      navigation.navigate('FriendsDashboardScreen', { 
        friendId: member.id || member.uid,
        friendName: member.name,
        email: member.email
      });
    }
  };

  // Handle member filter selection
  const handleSelectFilter = (memberId: string | null) => {
    setFilterMemberId(memberId);
    setShowFilterModal(false);
  };

  // Get initial for member
  const getMemberInitial = (name: string = '') => {
    return name.charAt(0).toUpperCase();
  };

  // Get member color based on name
  const getMemberColor = (name: string) => {
    const colors = ['#4A90E2', '#50C878', '#FF6B81', '#9D65C9', '#FF9642', '#8A2BE2', '#607D8B', '#E91E63'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Get group type background color
  const getGroupTypeColor = () => {
    const typeColors: {[key: string]: string} = {
      'trip': '#4A90E2',
      'home': '#50C878',
      'couple': '#FF6B81',
      'friends': '#9D65C9',
      'flatmate': '#FF9642',
      'apartment': '#8A2BE2',
      'other': '#607D8B'
    };
    
    return typeColors[groupType.toLowerCase()] || '#0A6EFF';
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isPaid = item.paidById === user?.uid;
    const memberName = isPaid ? 'You' : item.paidBy;
    const category = item.category || 'other';
    const categoryColor = getCategoryColor(category);
    
    return (
      <View style={styles.transactionContainer}>
        {/* Timeline line */}
        <View style={styles.timelineLine}></View>
        
        {/* Timeline dot */}
        <View style={[styles.timelineDot, { backgroundColor: categoryColor }]}></View>
        
        {/* Expense card */}
        <View style={styles.timelineCard}>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionHeaderLeft}>
              <Text style={styles.transactionDescription}>{item.description}</Text>
              <View style={styles.transactionPaidByContainer}>
                <View style={[styles.memberInitialBubble, 
                  { backgroundColor: getMemberColor(memberName) }]}>
                  <Text style={styles.memberInitialText}>{getMemberInitial(memberName)}</Text>
                </View>
                <Text style={styles.transactionPaidBy}>
                  {isPaid ? 'You paid' : `Paid by ${item.paidBy}`}
                </Text>
              </View>
            </View>
            <View style={styles.transactionHeaderRight}>
              <Text style={[
                styles.transactionAmount,
                { color: isPaid ? '#4CAF50' : '#F44336' }
              ]}>
                {formatCurrency(item.amount)}
              </Text>
              <Text style={styles.transactionShareText}>
                {isPaid ? '' : 'Your share: ' + formatCurrency(Math.round(item.amount / (item.splitWith?.length || 4)))}
              </Text>
            </View>
          </View>
          
          <View style={styles.transactionFooter}>
            <View style={[styles.transactionTag, { backgroundColor: `${categoryColor}22` }]}>
              <Text style={[styles.transactionTagText, { color: categoryColor }]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </View>
            {item.notes && (
              <TouchableOpacity onPress={() => {
                Alert.alert('Notes', item.notes || 'No additional notes');
              }}>
                <Text style={styles.transactionDetailsButton}>View Notes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderDateHeader = ({ section }: { section: { date: string } }) => (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{section.date}</Text>
    </View>
  );

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isCurrentUser = item.id === user?.uid || item.uid === user?.uid;
    const balance = item.balance || 
      (item.id ? currentMemberBalances[item.id] : 0) || 
      (item.uid ? currentMemberBalances[item.uid] : 0) || 
      0;
    
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberCardContent}>
          <View style={styles.memberHeader}>
            <View style={[styles.memberAvatar, { backgroundColor: getMemberColor(item.name) }]}>
              <Text style={styles.memberInitial}>{getMemberInitial(item.name)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {item.name}
                {item.isAdmin && <Text style={styles.adminBadge}> (Admin)</Text>}
                {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
              </Text>
              <Text style={styles.memberContact}>{item.email || item.phone || 'No contact info'}</Text>
            </View>
            <View>
              <Text style={[
                styles.memberBalance,
                { 
                  color: balance > 0 ? '#4CAF50' : 
                         balance < 0 ? '#F44336' : 
                         '#757575' 
                }
              ]}>
                {balance === 0 ? 
                  'Settled' : 
                  formatCurrency(Math.abs(balance))}
              </Text>
              <Text style={styles.memberBalanceLabel}>
                {balance > 0 ? 'gets back' : 
                 balance < 0 ? 'owes' : ''}
              </Text>
            </View>
          </View>
          
          {/* Balance bar visualization */}
          <View style={styles.balanceBarContainer}>
            <View style={[
              styles.balanceBarFill, 
              { 
                width: `${Math.min(Math.abs(balance) / 10, 100)}%`,
                backgroundColor: balance > 0 ? '#4CAF50' : 
                                balance < 0 ? '#F44336' : 
                                '#E0E0E0'
              }
            ]}></View>
          </View>
        </View>
        
        {!isCurrentUser && (
          <TouchableOpacity 
            style={styles.memberViewButton}
            onPress={() => handleViewMember(item)}
          >
            <Icon name="person" size={16} color="#0A6EFF" style={styles.memberViewIcon} />
            <Text style={styles.memberViewButtonText}>View Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity 
        style={styles.filterModalOverlay} 
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Expenses</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.filterOption, !filterMemberId && styles.selectedFilterOption]}
            onPress={() => handleSelectFilter(null)}
          >
            <Text style={styles.filterOptionText}>All Expenses</Text>
            {!filterMemberId && <Icon name="checkmark" size={20} color="#0A6EFF" />}
          </TouchableOpacity>
          
          <View style={styles.filterSeparator} />
          
          <Text style={styles.filterSectionTitle}>By Member</Text>
          
          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[styles.filterOption, filterMemberId === member.id && styles.selectedFilterOption]}
              onPress={() => handleSelectFilter(member.id)}
            >
              <View style={styles.filterMemberRow}>
                <View style={[styles.filterMemberIcon, {backgroundColor: getMemberColor(member.name)}]}>
                  <Text style={styles.filterMemberInitial}>{getMemberInitial(member.name)}</Text>
                </View>
                <Text style={styles.filterOptionText}>
                  {member.id === user?.uid ? "Your expenses" : `${member.name}'s expenses`}
                </Text>
              </View>
              {filterMemberId === member.id && <Icon name="checkmark" size={20} color="#0A6EFF" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
  
  // Render balance summary modal
  const renderBalanceSummaryModal = () => (
    <Modal
      visible={showBalanceSummaryModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBalanceSummaryModal(false)}
    >
      <TouchableOpacity 
        style={styles.filterModalOverlay} 
        activeOpacity={1}
        onPress={() => setShowBalanceSummaryModal(false)}
      >
        <View style={styles.balanceSummaryModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Balance Summary</Text>
            <TouchableOpacity onPress={() => setShowBalanceSummaryModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {balanceSummaries.length === 0 ? (
            <View style={styles.balanceSummaryEmptyContainer}>
              <Icon name="checkmark-circle" size={40} color="#4CAF50" />
              <Text style={styles.balanceSummaryEmptyText}>Everyone is settled up!</Text>
            </View>
          ) : (
            <FlatList
              data={balanceSummaries}
              keyExtractor={(item, index) => `balance-${index}`}
              renderItem={({ item }) => (
                <View style={styles.balanceSummaryItem}>
                  <Text style={styles.balanceSummaryName}>{item.name}</Text>
                  <Text style={[
                    styles.balanceSummaryAmount, 
                    { color: item.amount > 0 ? '#4CAF50' : '#F44336' }
                  ]}>
                    {item.amount > 0 ? 
                      `gets back ${formatCurrency(item.amount)}` : 
                      `owes ${formatCurrency(Math.abs(item.amount))}`}
                  </Text>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={styles.balanceSummarySeparator} />}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          )}
          
          <TouchableOpacity 
            style={styles.balanceSummaryCloseButton}
            onPress={() => setShowBalanceSummaryModal(false)}
          >
            <Text style={styles.balanceSummaryCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading group details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Immersive Header */}
      <View style={[styles.header, { backgroundColor: getGroupTypeColor() }]}>
        <View style={styles.headerOverlay}></View>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToGroups}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={handleSettings}
            >
              <Icon name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerBottom}>
            <Text style={styles.groupName}>{groupName}</Text>
            <View style={styles.groupInfo}>
              <View style={styles.groupTypeTag}>
                <Text style={styles.groupTypeText}>
                  {groupType.charAt(0).toUpperCase() + groupType.slice(1)}
                </Text>
              </View>
              <Text style={styles.memberCount}>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Balance Card (Overlapping with header) */}
      <View style={styles.balanceCardContainer}>
      <View style={styles.balanceCard}>
  <View style={styles.balanceCardContent}>
    <TouchableOpacity 
      style={styles.balanceCardLeft}
      onPress={() => setShowBalanceSummaryModal(true)}
    >
      {balanceSummaries.length > 0 ? (
        <>
          <Text style={styles.balanceLabel}>
            {totalAmount === 0 ? 'All Settled Up' : 
             totalAmount > 0 ? 'You are owed' : 'You owe'}
          </Text>
          <Text style={[
            styles.balanceValue,
            { color: totalAmount > 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {formatCurrency(Math.abs(totalAmount))}
          </Text>
          {balanceSummaries.length > 1 && (
            <Icon name="information-circle-outline" size={20} color="#0A6EFF" />
          )}
        </>
      ) : (
        <View style={styles.settledRow}>
          <Icon name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.settledText}>All settled</Text>
        </View>
      )}
    </TouchableOpacity>
          </View>
          
          {/* Mini spending visualization using real category data */}
          {categorySpending.length > 0 ? (
    <>
      <View style={styles.spendingGraph}>
        {categorySpending.slice(0, 4).map((category, index) => (
          <View 
            key={index} 
            style={[
              styles.spendingBar, 
              { 
                width: `${category.percentage}%`, 
                height: 20 + Math.min(category.percentage, 30), 
                backgroundColor: category.color 
              }
            ]}
          />
        ))}
      </View>
      <View style={styles.spendingLabels}>
        {categorySpending.slice(0, 4).map((category, index) => (
          <Text key={index} style={styles.spendingLabel}>
            {category.category.charAt(0).toUpperCase() + category.category.slice(1, 4)}
          </Text>
        ))}
      </View>
    </>
  ) : (
    <View style={styles.noSpendingContainer}>
      <Text style={styles.noSpendingText}>No spending data yet</Text>
    </View>
  )}
</View>
      </View>
      
      {/* Tabs with sliding indicator */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsContent}>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'expenses' && styles.activeTabButtonText
            ]}>
              Expenses
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === 'members' && styles.activeTabButtonText
            ]}>
              Members
            </Text>
          </TouchableOpacity>
          
          {/* Sliding indicator */}
          <View 
            style={[
              styles.tabIndicator,
              { left: activeTab === 'expenses' ? '0%' : '50%' }
            ]}
          ></View>
        </View>
      </View>
      
      {/* Content Area */}
      <View style={styles.contentContainer}>
        {activeTab === 'expenses' ? (
          <>
            {/* Filter button */}
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon name={filterMemberId ? "filter" : "filter-outline"} size={18} color="#0A6EFF" />
              <Text style={styles.filterButtonText}>
                {filterMemberId ? "Filtered" : "Filter Expenses"}
              </Text>
              {filterMemberId && (
                <TouchableOpacity 
                  style={styles.filterClearButton}
                  onPress={() => setFilterMemberId(null)}
                >
                  <Icon name="close-circle" size={16} color="#0A6EFF" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            
            {filteredTransactions.length > 0 ? (
              <FlatList
                data={groupedTransactions}
                renderItem={({ item }) => (
                  <>
                    <View style={styles.dateHeader}>
                      <Text style={styles.dateHeaderText}>{item.date}</Text>
                    </View>
                    {item.data.map(transaction => (
                      <View key={transaction.id}>
                        {renderTransactionItem({ item: transaction })}
                      </View>
                    ))}
                  </>
                )}
                keyExtractor={(item) => item.date}
                contentContainerStyle={styles.listContainer}
                onRefresh={onRefresh}
                refreshing={refreshing}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Icon name="receipt-outline" size={60} color="#ccc" />
                <Text style={styles.emptyStateTitle}>
                  {filterMemberId ? "No filtered expenses found" : "No expenses yet"}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {filterMemberId ? 
                    "Try changing your filter or add new expenses" : 
                    "Add your first expense to start tracking"
                  }
                </Text>
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={handleAddExpense}
                >
                  <Text style={styles.emptyStateButtonText}>Add an expense</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          members.length > 0 ? (
            <FlatList
              data={members}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              onRefresh={onRefresh}
              refreshing={refreshing}
              ListHeaderComponent={
                <TouchableOpacity 
                  style={styles.addMemberButton}
                  onPress={handleAddMember}
                >
                  <Icon name="person-add-outline" size={20} color="#0A6EFF" />
                  <Text style={styles.addMemberText}>Add more people</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <Icon name="people-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No members yet</Text>
              <Text style={styles.emptyStateSubtitle}>Add members to start tracking expenses together</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={handleAddMember}
              >
                <Text style={styles.emptyStateButtonText}>Add members</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.floatingActionButton}
        onPress={() => navigation.navigate('AddExpenseScreen', {
          groupId: groupId,
          groupName: groupName
        })}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
      
      {/* Render modals */}
      {renderFilterModal()}
      {renderBalanceSummaryModal()}
      
      {/* Tab Bar with MainDashboard style */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('MainDashboard', { screen: 'Groups' })}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(144, 97, 249, 0.15)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="people" size={22} color="#9061F9" />
            </View>
            <Text style={[styles.tabLabel, { color: '#9061F9', fontWeight: '600' }]}>
              Groups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('MainDashboard', { screen: 'Friends' })}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 20,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="person-outline" size={22} color="#666" />
            </View>
            <Text style={styles.tabLabel}>Friends</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate('MainDashboard', { screen: 'Activity' })}
          >
            <View>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 20,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Icon name="time-outline" size={22} color="#666" />
              </View>
              {unreadActivities > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#FF3B30',
                  borderRadius: 10,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  zIndex: 1
                }}>
                  <Text style={{
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 'bold'
                  }}>
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
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 20,
              backgroundColor: 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name="person-circle-outline" size={22} color="#666" />
            </View>
            <Text style={styles.tabLabel}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },
  // Header styles
  header: {
    height: 160,
    position: 'relative'
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  headerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerBottom: {
    marginBottom: 30
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  groupTypeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8
  },
  groupTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  memberCount: {
    color: '#fff',
    fontSize: 12
  },
  
  // Balance card styles
  balanceCardContainer: {
    paddingHorizontal: 16,
    marginTop: -30
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  balanceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  balanceCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed from initial
  },
  balanceLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 4
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4
  },
  balanceCountBadge: {
    backgroundColor: '#0A6EFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  balanceCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  settledText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 4
  },
  settleButton: {
    backgroundColor: '#0A6EFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  settleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  spendingGraph: {
    height: 30,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'flex-end'
  },
  spendingBar: {
    height: '100%'
  },
  spendingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  spendingLabel: {
    fontSize: 10,
    color: '#757575',
    textAlign: 'center',
    flex: 1
  },
  noSpendingContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  noSpendingText: {
    color: '#888',
    fontSize: 14
  },
  
  // Filter button
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EDF4FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#D6E4FF'
  },
  filterButtonText: {
    color: '#0A6EFF',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500'
  },
  filterClearButton: {
    marginLeft: 4
  },
  
  // Tabs styles
  tabsContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    marginBottom: 8
  },
  tabsContent: {
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  tabButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#757575'
  },
  activeTabButtonText: {
    color: '#0A6EFF',
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '50%',
    backgroundColor: '#0A6EFF'
  },
  
  // Filter modal styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  filterModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '80%'
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4
  },
  selectedFilterOption: {
    backgroundColor: '#f0f5ff',
    borderRadius: 8
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333'
  },
  filterSeparator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
    marginBottom: 8
  },
  filterMemberRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  filterMemberIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  filterMemberInitial: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  
  // Balance summary modal
  balanceSummaryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden'
  },
  balanceSummaryEmptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  balanceSummaryEmptyText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500'
  },
  balanceSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  balanceSummaryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  balanceSummaryAmount: {
    fontSize: 15,
    fontWeight: '600'
  },
  balanceSummarySeparator: {
    height: 1,
    backgroundColor: '#eee'
  },
  balanceSummaryCloseButton: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 16,
    alignItems: 'center'
  },
  balanceSummaryCloseButtonText: {
    color: '#0A6EFF',
    fontSize: 16,
    fontWeight: '600'
  },
  
  // Timeline styles
  transactionContainer: {
    position: 'relative',
    paddingLeft: 16,
    paddingBottom: 24
  },
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
    marginTop: 8
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575'
  },
  timelineLine: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 0,
    width: 2,
    backgroundColor: '#e0e0e0'
  },
  timelineDot: {
    position: 'absolute',
    left: 4,
    top: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0A6EFF',
    zIndex: 1
  },
  timelineCard: {
    marginLeft: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 4
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  transactionHeaderLeft: {
    flex: 1,
    marginRight: 8
  },
  transactionHeaderRight: {
    alignItems: 'flex-end'
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6
  },
  transactionPaidByContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  memberInitialBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6
  },
  memberInitialText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  transactionPaidBy: {
    fontSize: 12,
    color: '#757575'
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  transactionShareText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  transactionTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  transactionTagText: {
    fontSize: 11,
    fontWeight: '500'
  },
  transactionDetailsButton: {
    fontSize: 12,
    color: '#0A6EFF',
    fontWeight: '500'
  },
  
  // Member card styles
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden'
  },
  memberCardContent: {
    padding: 12
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
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
  memberInfo: {
    flex: 1,
    marginRight: 8
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  adminBadge: {
    fontStyle: 'italic',
    color: '#757575',
    fontWeight: 'normal'
  },
  youBadge: {
    fontStyle: 'italic',
    color: '#0A6EFF',
    fontWeight: 'normal'
  },
  memberContact: {
    fontSize: 12,
    color: '#757575'
  },
  memberBalance: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right'
  },
  memberBalanceLabel: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'right'
  },
  balanceBarContainer: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8
  },
  balanceBarFill: {
    height: '100%',
    backgroundColor: '#0A6EFF',
    width: '0%'
  },
  memberViewButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  memberViewButtonText: {
    fontSize: 13,
    color: '#0A6EFF',
    fontWeight: '500'
  },
  
  // Content container styles
  contentContainer: {
    flex: 1,
    marginBottom: 60 // Space for tab bar
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8
  },
  
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24
  },
  emptyStateButton: {
    backgroundColor: '#0A6EFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: '#666'
  },
  
  // Add member button
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  addMemberText: {
    color: '#0A6EFF',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 14
  },
  
  // Floating action button
  floatingActionButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 6
  },
  memberViewIcon: {
    marginRight: 6
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  tabItem: {
    alignItems: 'center'
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  }
});

export default GroupDashboardScreen;