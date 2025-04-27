import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView, Alert, Platform, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import SharedTabBar from '../components/SharedTabBar';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook

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

const FriendDashboardScreen = () => {
  const { user, isLoading } = useAuth(); // Use auth context
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FriendsDashboardScreen'>>();
  const { friendId, friendName, totalOwed, groups = [] } = route.params;

  // Avatar background color should match with the one from FriendsScreen
  const getAvatarColor = (name: string) => {
    const bgColors = ['#F44336', '#9C27B0', '#FF9800', '#3F51B5', '#4CAF50', '#009688'];
    return bgColors[name.charCodeAt(0) % bgColors.length];
  };

  const avatarColor = getAvatarColor(friendName);

  // Alert for button clicks
  const handleButtonClick = () => {
    Alert.alert("Coming soon!", "This feature is coming up in future updates.");
  };

  const formatDate = (dateString: string) => {
    try {
      // Attempt to parse the date string
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (error) {
      return "Recent"; // Fallback value
    }
  };

  // Get status bar height for proper padding
  const STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

  // Navigate to GroupDashboardScreen when a group is clicked
  const handleGroupPress = (group: any) => {
    navigation.navigate('GroupDashboardScreen', {
      groupId: group.id,
      groupName: group.name,
      groupType: group.type || 'other',
      totalAmount: group.amount || 0
    });
  };

  // Show loading indicator while auth data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#0A6EFF'}}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading friend data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0A6EFF'}}>
      <View style={styles.container}>
      {/* Blue header */}
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: STATUSBAR_HEIGHT + 10 }]}>
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
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
        
        {/* Profile section with avatar */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor || '#FF7043' }]}>
            <Text style={styles.avatarText}>{friendName.charAt(0)}</Text>
          </View>
          <Text style={styles.friendName}>{friendName}</Text>
          <Text style={styles.oweText}>You owe {friendName} ₹{totalOwed}</Text>
        </View>
      </View>

      {/* Action buttons with icons */}
      <View style={styles.actionContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
            <Icon name="card-outline" size={16} color="#0A6EFF" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: '#0A6EFF' }]}>Settle up</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
            <Icon name="notifications-outline" size={16} color="#0A6EFF" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: '#0A6EFF' }]}>Remind</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
            <Icon name="bar-chart-outline" size={16} color="#0A6EFF" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: '#0A6EFF' }]}>Charts</Text>
          </TouchableOpacity>
          
          
          <TouchableOpacity style={styles.actionBtn} onPress={handleButtonClick}>
            <Icon name="download-outline" size={16} color="#0A6EFF" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: '#0A6EFF' }]}>Export</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>


      {/* Transactions list with group icons */}
      <TouchableOpacity 
  style={styles.floatingActionButton}
  onPress={() => navigation.navigate('AddExpenseScreen')}>
  <Icon name="add" size={30} color="#fff" />
</TouchableOpacity>
      <View style={styles.transactionsContainer}>
        <Text style={styles.sectionHeader}>Shared Groups</Text>
        
        {groups.length > 0 ? (
          // If there are groups, map through them
          groups.map((group, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.transactionItem}
              onPress={() => handleGroupPress(group)}
            >
              {/* Group icon based on group type moved to left */}
              <View style={styles.groupIconContainer}>
                <Icon 
                  name={getGroupIcon(group?.name || '') as any} 
                  size={24} 
                  color="#333" 
                  style={styles.groupIcon} 
                />
              </View>
              
              <View style={styles.transactionDetails}>
                <View style={styles.groupNameRow}>
                  <Text style={styles.transactionTitle}>{group?.name || ''}</Text>
                  {/* If there are multiple group members, show a small icon */}
                  <Icon name="people-outline" size={14} color="#757575" style={{marginLeft: 5}} />
                </View>
                <Text style={styles.transactionSubtitle}>
                  {formatDate(group?.date || '')}
                </Text>
              </View>
              
              <View style={styles.amountContainer}>
                <Text style={styles.borrowedText}>you borrowed</Text>
                <Text style={styles.amountText}>₹{group?.amount || 0}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          // If no groups, show an empty state
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No shared groups yet</Text>
            <Text style={styles.emptyStateSubText}>
              Create a group with {friendName} to track group expenses
            </Text>
          </View>
        )}
      </View>

      {/* Use SharedTabBar instead of custom tab bar */}
      <SharedTabBar activeTab="Friends" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A6EFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16
  },
  header: {
    backgroundColor: '#0A6EFF', // Bright blue as shown in the screenshot
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 30,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  iconButton: {
    padding: 10, // Add padding for better touch target
    borderRadius: 20, // Optional: rounded touch area
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  friendName: {
    fontSize: 34,
    fontWeight: '600',
    color: '#fff',
    marginTop: 10
  },
  oweText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4
  },
  actionContainer: {
    marginTop: 15
  },
  actionsRow: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    gap: 10
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  actionIcon: {
    marginRight: 5
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500'
  },
  transactionsContainer: {
    flex: 1,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 70 // Add space for tab bar
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '500',
    color: '#616161',
    marginVertical: 10
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingVertical: 8
  },
  groupIconContainer: {
    marginRight: 10
  },
  groupIcon: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 8
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
    fontWeight: '500',
    color: '#212121'
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#757575'
  },
  amountContainer: {
    alignItems: 'flex-end'
  },
  borrowedText: {
    fontSize: 12,
    color: '#E65100'
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100'
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginTop: 15
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#616161',
    marginBottom: 5
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingHorizontal: 20
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
  }
});

export default FriendDashboardScreen;