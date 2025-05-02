import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ActivityScreen from '../screens/ActivityScreen';
import { useAuth } from '../components/AuthContext';
import { useActivityBadge } from '../hooks/useActivityBadge';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { user } = useAuth();
  const { unreadCount } = useActivityBadge(user?.uid);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'AddExpense') {
            iconName = 'add-circle-outline';
          } else if (route.name === 'Activity') {
            iconName = 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8A2BE2',
        tabBarInactiveTintColor: 'gray',
        tabBarBadge: route.name === 'Activity' && unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: {
          backgroundColor: '#8A2BE2',
          fontSize: 10,
          minWidth: 16,
          minHeight: 16,
          maxHeight: 16,
          borderRadius: 8,
          lineHeight: 14,
          paddingHorizontal: 4,
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="AddExpense" 
        component={AddExpenseScreen} 
        options={{ tabBarLabel: 'Add Expense' }} 
      />
      <Tab.Screen 
        name="Activity" 
        component={ActivityScreen} 
        options={{ tabBarLabel: 'Activity' }} 
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;