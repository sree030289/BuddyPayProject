import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import FriendsScreen from './FriendsScreen';
import GroupsScreen from './GroupsScreen';
import ActivityScreen from './ActivityScreen';
import AccountScreen from './AccountScreen';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { TabParamList } from '../types';

const Tab = createBottomTabNavigator<TabParamList>();

interface MainDashboardProps {
  route?: { params?: { screen?: string } };
}

export default function MainDashboardScreen({ route }: MainDashboardProps) {
  // Get initial screen from params
  const initialParams = route?.params || {};
  const initialScreen = initialParams.screen || 'Friends';
  
  // Map any screen name discrepancies
  const getValidTabName = (screenName: string) => {
    if (screenName === 'Account' || screenName === 'Settings' || screenName === 'Profile') {
      return 'Account';
    }
    return screenName as keyof TabParamList;
  };
  
  const validInitialScreen = getValidTabName(initialScreen);
  
  // Log when the screen mounts for debugging
  useEffect(() => {
    console.log('MainDashboardScreen mounted with initialScreen:', initialScreen);
    console.log('Using validInitialScreen:', validInitialScreen);
  }, [initialScreen, validInitialScreen]);

  return (
    <Tab.Navigator
      initialRouteName={validInitialScreen}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Friends') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Groups') iconName = focused ? 'people-circle' : 'people-circle-outline';
          else if (route.name === 'Activity') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#90CAF9',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A6EFF',
          height: 60,
          paddingBottom: 5
        },
        tabBarLabelStyle: {
          fontSize: 12
        },
        tabBarItemStyle: {
          paddingTop: 5
        },
        tabBarActiveBackgroundColor: 'rgba(255,255,255,0.1)',
      })}
    >
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          tabBarLabel: 'Friends',
        }}
        initialParams={{ insideTabNavigator: true }}
      />
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
        }}
        initialParams={{ insideTabNavigator: true }}
      />
      <Tab.Screen 
        name="Activity" 
        component={ActivityScreen}
        options={{
          tabBarLabel: 'Activity',
        }}
        initialParams={{ insideTabNavigator: true }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen}
        options={{
          tabBarLabel: 'Account',
        }}
        initialParams={{ insideTabNavigator: true }}
      />
    </Tab.Navigator>
  );
}