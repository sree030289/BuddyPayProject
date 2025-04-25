import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons as Icon } from '@expo/vector-icons';
import FriendsScreen from '../screens/FriendsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/AccountScreen';

// Import any other screens you need

const Tab = createBottomTabNavigator();

interface TabNavigatorProps {
  userId?: string;
  email?: string;
  status?: string;
  refresh?: boolean;
  initialScreen?: 'Friends' | 'Activity' | 'Settings';
  hideTabBar?: boolean;
  route?: any; // Added to capture route params
}

const TabNavigator = ({ 
  userId, 
  email, 
  status,
  refresh = false,
  initialScreen = 'Friends',
  hideTabBar = false,
  route
}: TabNavigatorProps) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Extract route params if available
  const routeParams = route?.params || {};
  // If hideTabBar is true in either props or route params, hide the tab bar
  const shouldHideTabBar = hideTabBar === true || routeParams.hideTabBar === true;  
  // Set refresh trigger when refresh prop changes

    // Log for debugging
    useEffect(() => {
      console.log('TabNavigator tab bar visibility:');
      console.log('- hideTabBar prop:', hideTabBar);
      console.log('- routeParams.hideTabBar:', routeParams.hideTabBar);
      console.log('- Final decision (shouldHideTabBar):', shouldHideTabBar);
      console.log('- Full routeParams:', JSON.stringify(routeParams));
    }, []);

  useEffect(() => {
    if (refresh) {
      console.log('Refresh triggered in TabNavigator');
      setRefreshTrigger(prev => prev + 1);
    }
  }, [refresh]);

   // Log for debugging
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

          if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Activity') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }
          return <Icon name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0A6EFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        // This is the key change: completely hide the tab bar based on the hideTabBar prop
        tabBarStyle: shouldHideTabBar ? { display: 'none' } : undefined
      })}>
      <Tab.Screen 
        name="Friends" 
        options={{ title: 'Friends' }}
      >
        {(props) => (
          <FriendsScreen 
            {...props} 
            userId={userId || routeParams.userId} 
            email={email || routeParams.email}
            toastStatus={status || routeParams.status}
            refreshTrigger={refreshTrigger || (routeParams.refresh ? 1 : 0)}
            insideTabNavigator={true} // Tell FriendsScreen it's inside the TabNavigator
          />
        )}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Activity" 
        component={ActivityScreen} 
        options={{ title: 'Activity' }}
      />
      
      <Tab.Screen 
        name="Settings" 
        component={ProfileScreen} 
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;