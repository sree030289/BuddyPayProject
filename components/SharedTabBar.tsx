import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';

interface SharedTabBarProps {
  activeTab?: string;
}

// This component should only be used in screens that are NOT part of the main tab navigator
// For example, in modal screens or detail screens where you want to provide navigation back to main tabs
const SharedTabBar = ({ activeTab }: SharedTabBarProps) => {
  const navigation = useNavigation();
  
  const navigateToTab = (tabName: string) => {
    console.log(`Navigating to main dashboard and selecting tab: ${tabName}`);
    
    // Determine correct tab name for navigation
    const screen = tabName === 'Account' || tabName === 'Profile' || tabName === 'Settings' 
      ? 'Account' 
      : tabName;
    
    // Reset navigation stack and navigate to MainDashboard with specific tab
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { 
            name: 'MainDashboard',
            state: {
              routes: [
                { 
                  name: screen,
                  params: { insideTabNavigator: true }
                }
              ],
              index: 0
            }
          }
        ],
      })
    );
  };
  
  return (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'Friends' && styles.activeTab]} 
        onPress={() => navigateToTab('Friends')}
      >
        <Icon 
          name={activeTab === 'Friends' ? 'people' : 'people-outline'} 
          size={24} 
          color={activeTab === 'Friends' ? '#fff' : '#90CAF9'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'Friends' && styles.activeTabLabel]}>Friends</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'Groups' && styles.activeTab]} 
        onPress={() => navigateToTab('Groups')}
      >
        <Icon 
          name={activeTab === 'Groups' ? 'people-circle' : 'people-circle-outline'} 
          size={24} 
          color={activeTab === 'Groups' ? '#fff' : '#90CAF9'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'Groups' && styles.activeTabLabel]}>Groups</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'Activity' && styles.activeTab]} 
        onPress={() => navigateToTab('Activity')}
      >
        <Icon 
          name={activeTab === 'Activity' ? 'bar-chart' : 'bar-chart-outline'} 
          size={24} 
          color={activeTab === 'Activity' ? '#fff' : '#90CAF9'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'Activity' && styles.activeTabLabel]}>Activity</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabItem, activeTab === 'Account' && styles.activeTab]} 
        onPress={() => navigateToTab('Account')}
      >
        <Icon 
          name={activeTab === 'Account' ? 'person' : 'person-outline'} 
          size={24} 
          color={activeTab === 'Account' ? '#fff' : '#90CAF9'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'Account' && styles.activeTabLabel]}>Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#0A6EFF',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%'
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 5
  },
  tabLabel: {
    color: '#90CAF9',
    fontSize: 12,
    marginTop: 2
  },
  activeTabLabel: {
    color: '#fff'
  },
  centerButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    transform: [{ translateY: -15 }]
  }
});

export default SharedTabBar;