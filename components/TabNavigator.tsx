import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import FriendsScreen from '../screens/FriendsScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AccountScreen from '../screens/AccountScreen';
import { Platform, View } from 'react-native';

// Import any other screens you need

const Tab = createBottomTabNavigator();

interface TabNavigatorProps {
  userId?: string;
  email?: string;
  status?: string;
  refresh?: boolean;
  initialScreen?: 'Groups' | 'Friends' | 'Activity' | 'Account';
  hideTabBar?: boolean;
  route?: any; // Added to capture route params
}

const TabNavigator = ({ 
  userId, 
  email, 
  status,
  refresh = false,
  initialScreen = 'Groups',
  hideTabBar = false,
  route
}: TabNavigatorProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Extract route params if available
  const routeParams = route?.params || {};
  // If hideTabBar is true in either props or route params, hide the tab bar
  const shouldHideTabBar = hideTabBar === true || routeParams.hideTabBar === true;

  // Set refresh trigger when refresh prop changes
  useEffect(() => {
    if (refresh) {
      console.log('Refresh triggered in TabNavigator');
      setRefreshTrigger(prev => prev + 1);
    }
  }, [refresh]);

  // For debugging
  useEffect(() => {
    console.log('TabNavigator tab bar visibility:');
    console.log('- hideTabBar prop:', hideTabBar);
    console.log('- routeParams.hideTabBar:', routeParams.hideTabBar);
    console.log('- Final decision (shouldHideTabBar):', shouldHideTabBar);
    console.log('- Full routeParams:', JSON.stringify(routeParams));
  }, []);

  return (
    <Tab.Navigator
      initialRouteName={initialScreen}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Friends') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Activity') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Account') iconName = focused ? 'person-circle' : 'person-circle-outline';

          // Create a custom tab icon with background when active
          return (
            <View style={{
              width: focused ? 40 : 32,
              height: focused ? 40 : 32,
              borderRadius: 20,
              backgroundColor: focused ? 'rgba(144, 97, 249, 0.15)' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Icon name={iconName as any} size={22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#9061F9',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
        tabBarStyle: shouldHideTabBar ? 
          { display: 'none' } : 
          {
            backgroundColor: '#fff',
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 25 : 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#ddd',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 8,
          }
      })}
    >
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{ title: 'Groups' }}
        initialParams={{ insideTabNavigator: true }}
      />
      
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{ title: 'Friends' }}
        initialParams={{ insideTabNavigator: true }}
      />
      
      <Tab.Screen 
        name="Activity" 
        component={ActivityScreen}
        options={{ title: 'Activity' }}
        initialParams={{ insideTabNavigator: true }}
      />
      
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{ title: 'Account' }}
        initialParams={{ insideTabNavigator: true }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;