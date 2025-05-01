import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegistrationScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import SetPINScreen from './screens/SetPINScreen';
import PINEntryScreen from './screens/PINEntryScreen';
import CurrencyWheelSplashScreen from './screens/CurrencyWheelSplashScreen'; // Import the new SplashScreen
import RegistrationSuccess from './screens/RegistrationSuccess';
import MainDashboardScreen from './screens/MainDashboardScreen';
import FriendDashboardScreen from './screens/FriendDashboardScreen';
import AddFriendsScreen from './screens/AddFriendsScreen';
import VerifyContactsScreen from './screens/VerifyContactsScreen';
import FriendSettingsScreen from './screens/FriendSettings';
import { StatusBar } from 'react-native';
import { RootStackParamList } from './types';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupDashboardScreen from './screens/GroupDashboardScreen';
import AddGroupMembersScreen from './screens/AddGroupMembersScreen';
import GroupSettingsScreen from './screens/GroupSettingsScreen';
import JoinGroupScreen from './screens/JoinGroupScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import { AuthProvider } from './components/AuthContext';
import * as SplashScreen from 'expo-splash-screen';
import AppInitializationService from './services/AppInitialization'; // Import the initialization service

// Keep the splash screen visible while we initialize resources
SplashScreen.preventAutoHideAsync();

// Fix the TypeScript error by providing a typed Stack
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        // Use our initialization service to perform all initialization tasks
        const { isInitialized, error } = await AppInitializationService.initialize();
        
        if (!isInitialized) {
          // Log the error but still continue to load the app
          console.error('App initialization failed:', error);
          // Optionally show an alert or fallback behavior
          // Alert.alert('Warning', 'Some app features may not work properly.');
        } else {
          console.log('App initialized successfully');
        }
      } catch (e) {
        console.warn('Uncaught error during initialization:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        
        // Hide the native splash screen (this lets our custom splash screen take over)
        await SplashScreen.hideAsync();
      }
    }

    prepareApp();
  }, []);

  if (!appIsReady) {
    return null;
  }


  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          {/* Using our new Currency Wheel Splash Screen */}
          <Stack.Screen name="Splash" component={CurrencyWheelSplashScreen} />
          
          {/* Authentication screens */}
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="SetPINScreen" component={SetPINScreen} />
          <Stack.Screen name="PINEntryScreen" component={PINEntryScreen} />
          <Stack.Screen name="RegistrationScreen" component={RegisterScreen} />
          
          {/* Main Dashboard with TabNavigator */}
          <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
          
          {/* Group screens */}
          <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
          <Stack.Screen name="GroupDashboardScreen" component={GroupDashboardScreen} />
          <Stack.Screen name="AddGroupMembersScreen" component={AddGroupMembersScreen} />
          <Stack.Screen name="GroupSettingsScreen" component={GroupSettingsScreen} />
          <Stack.Screen name="JoinGroupScreen" component={JoinGroupScreen} />
          
          {/* Expense screen */}
          <Stack.Screen name="AddExpenseScreen" component={AddExpenseScreen} />

          {/* Friend-related screens */}
          <Stack.Screen name="AddFriendsScreen" component={AddFriendsScreen} />
          <Stack.Screen name="VerifyContactsScreen" component={VerifyContactsScreen} />
          <Stack.Screen name="FriendsDashboardScreen" component={FriendDashboardScreen} />
          <Stack.Screen name="FriendSettingsScreen" component={FriendSettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}