import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, SafeAreaView, Platform, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';

interface BottomNavigatorProps {
  activeTab: 'Groups' | 'Friends' | 'Activity' | 'Account';
  unreadActivities?: number;
  forceShow?: boolean;
}

const BottomNavigator = ({ activeTab, unreadActivities = 0, forceShow = false }: BottomNavigatorProps) => {
  const navigation = useNavigation();
  const navigationState = useNavigationState(state => state);
  
  // Check if we're already inside the MainDashboard tab navigator
  const isInTabNavigator = () => {
    // If forceShow is true, always show the navigator regardless of navigation state
    if (forceShow) return false;
    
    // If we're inside any tab navigator, don't show this component
    const routes = navigationState?.routes || [];
    for (const route of routes) {
      // Check for both MainDashboard and TabNavigator
      if ((route.state?.type === 'tab' && (route.name === 'MainDashboard' || route.name === 'TabNavigator')) ||
          // Also check direct params to see if we're inside a tab navigator
          route.params?.insideTabNavigator === true) {
        return true;
      }
    }
    
    return false;
  };

  // If we're already in the tab navigator, don't show this component
  if (isInTabNavigator()) {
    return null;
  }

  // Get device window dimensions
  const windowDimensions = Dimensions.get('window');
  
  // Determine if the device has a home indicator (iPhone X and later)
  const hasHomeIndicator = () => {
    if (Platform.OS === 'ios') {
      const { height, width } = windowDimensions;
      const aspectRatio = height / width;
      return aspectRatio > 1.8; // Threshold for devices with home indicators
    }
    return false;
  };

  // Calculate appropriate bottom padding based on platform
  const bottomPadding = Platform.OS === 'ios' ? (hasHomeIndicator() ? 34 : 0) : 0;
  
  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarBackground}>
        <SafeAreaView style={{ paddingBottom: bottomPadding }}>
          <View style={styles.tabBar}>
            {/* Groups Tab */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Groups' })}
            >
              <View style={[
                styles.iconContainer, 
                activeTab === 'Groups' && styles.activeIconContainer
              ]}>
                <Icon 
                  name={activeTab === 'Groups' ? "people" : "people-outline"} 
                  size={22} 
                  color={activeTab === 'Groups' ? "#9061F9" : "#666"} 
                />
              </View>
              <View style={styles.labelBackground}>
                <Text style={[
                  styles.tabLabel, 
                  activeTab === 'Groups' && styles.activeTabLabel
                ]}>
                  Groups
                </Text>
              </View>
            </TouchableOpacity>

            {/* Friends Tab */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Friends' })}
            >
              <View style={[
                styles.iconContainer, 
                activeTab === 'Friends' && styles.activeIconContainer
              ]}>
                <Icon 
                  name={activeTab === 'Friends' ? "person" : "person-outline"} 
                  size={22} 
                  color={activeTab === 'Friends' ? "#9061F9" : "#666"} 
                />
              </View>
              <View style={styles.labelBackground}>
                <Text style={[
                  styles.tabLabel, 
                  activeTab === 'Friends' && styles.activeTabLabel
                ]}>
                  Friends
                </Text>
              </View>
            </TouchableOpacity>

            {/* Activity Tab */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Activity' })}
            >
              <View style={styles.iconBadgeContainer}>
                <View style={[
                  styles.iconContainer, 
                  activeTab === 'Activity' && styles.activeIconContainer
                ]}>
                  <Icon 
                    name={activeTab === 'Activity' ? "time" : "time-outline"} 
                    size={22} 
                    color={activeTab === 'Activity' ? "#9061F9" : "#666"} 
                  />
                </View>
                {unreadActivities > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadActivities > 9 ? '9+' : unreadActivities}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.labelBackground}>
                <Text style={[
                  styles.tabLabel, 
                  activeTab === 'Activity' && styles.activeTabLabel
                ]}>
                  Activity
                </Text>
              </View>
            </TouchableOpacity>

            {/* Account Tab */}
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigation.navigate('MainDashboard', { screen: 'Account' })}
            >
              <View style={[
                styles.iconContainer, 
                activeTab === 'Account' && styles.activeIconContainer
              ]}>
                <Icon 
                  name={activeTab === 'Account' ? "person-circle" : "person-circle-outline"} 
                  size={22} 
                  color={activeTab === 'Account' ? "#9061F9" : "#666"} 
                />
              </View>
              <View style={styles.labelBackground}>
                <Text style={[
                  styles.tabLabel, 
                  activeTab === 'Account' && styles.activeTabLabel
                ]}>
                  Account
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 8,
  },
  tabBarBackground: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'android' ? 16 : 10,
    height: Platform.OS === 'android' ? 70 : undefined,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(144, 97, 249, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconBadgeContainer: {
    position: 'relative',
  },
  badge: {
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
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  labelBackground: {
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginTop: Platform.OS === 'android' ? 2 : 0,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: Platform.OS === 'android' ? '500' : '400',
  },
  activeTabLabel: {
    color: '#9061F9',
    fontWeight: '600',
  },
});

export default BottomNavigator;
