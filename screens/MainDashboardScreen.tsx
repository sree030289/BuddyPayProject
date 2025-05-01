import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
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
  const initialScreen = initialParams.screen || 'Groups'; // Changed default to Groups
  
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
          if (route.name === 'Groups') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Friends') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Activity') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Account') iconName = focused ? 'person-circle' : 'person-circle-outline';

          // Create a custom tab icon with background when active
          return (
            <View style={{
              width: focused ? 40 : 32, // Slightly larger for better visibility
              height: focused ? 40 : 32, // Slightly larger for better visibility
              borderRadius: 20,
              backgroundColor: focused ? 'rgba(144, 97, 249, 0.15)' : 'transparent', // Slightly darker background
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name={iconName as any} size={22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#9061F9', // Purple for active tab
        tabBarInactiveTintColor: '#666',  // Darker gray for inactive tab (was #888)
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#ddd', // Darker border for better visibility
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08, // Increased shadow opacity
          shadowRadius: 4, // Increased shadow radius
          elevation: 8, // Increased elevation for Android
        },
        tabBarLabelStyle: {
          fontSize: 12, // Slightly larger font
          fontWeight: '600', // Bolder text
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
        },
      })}
    >
      <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
        }}
        initialParams={{ insideTabNavigator: true }}
      />
      <Tab.Screen 
        name="Friends" 
        component={FriendsScreen}
        options={{
          tabBarLabel: 'Friends',
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