// Updated SharedTabBar.tsx with consistent positioning
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface SharedTabBarProps {
  activeTab: string;
}

const SharedTabBar: React.FC<SharedTabBarProps> = ({ activeTab }) => {
  const navigation = useNavigation();

  const navigateTo = (routeName: string) => {
    // Handle navigation to the selected tab
    navigation.navigate('MainDashboard', { screen: routeName });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'Friends' && styles.activeTabItem]}
        onPress={() => navigateTo('Friends')}
      >
        <Icon
          name={activeTab === 'Friends' ? 'people' : 'people-outline'}
          size={24}
          color={activeTab === 'Friends' ? '#0A6EFF' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'Friends' && styles.activeTabText]}>
          Friends
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'Groups' && styles.activeTabItem]}
        onPress={() => navigateTo('Groups')}
      >
        <Icon
          name={activeTab === 'Groups' ? 'people-circle' : 'people-circle-outline'}
          size={24}
          color={activeTab === 'Groups' ? '#0A6EFF' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'Groups' && styles.activeTabText]}>
          Groups
        </Text>
      </TouchableOpacity>

      <View style={styles.centerButtonContainer}>
  <TouchableOpacity 
    style={styles.centerButton}
    onPress={() => navigation.navigate('AddExpenseScreen')}
  >
    <Icon name="add" size={24} color="#fff" />
  </TouchableOpacity>
</View>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'Activity' && styles.activeTabItem]}
        onPress={() => navigateTo('Activity')}
      >
        <Icon
          name={activeTab === 'Activity' ? 'bar-chart' : 'bar-chart-outline'}
          size={24}
          color={activeTab === 'Activity' ? '#0A6EFF' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'Activity' && styles.activeTabText]}>
          Activity
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'Account' && styles.activeTabItem]}
        onPress={() => navigateTo('Account')}
      >
        <Icon
          name={activeTab === 'Account' ? 'person' : 'person-outline'}
          size={24}
          color={activeTab === 'Account' ? '#0A6EFF' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'Account' && styles.activeTabText]}>
          Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// Get the window dimensions for positioning
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12, // Extra padding for iOS devices with home indicator
    paddingTop: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 1000, // Ensure tab bar appears above other content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5, // Android shadow
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabItem: {
    // You could add additional styling for active tab
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activeTabText: {
    color: '#0A6EFF',
    fontWeight: 'bold',
  },
  centerButtonContainer: {
    position: 'absolute',
    alignItems: 'center',
    top: -30, // Adjust as needed to position above the tab bar
    width: '100%'
  },
  centerButton: {
    backgroundColor: '#0A6EFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5
  }
});

export default SharedTabBar;