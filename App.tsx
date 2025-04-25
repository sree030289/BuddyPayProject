import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegistrationScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import SetPINScreen from './screens/SetPINScreen';
import PINEntryScreen from './screens/PINEntryScreen'; // Import the new PINEntryScreen
import SplashScreen from './screens/SplashScreen'; // Import the SplashScreen
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
import { AuthProvider } from './components/AuthContext';

// Fix the TypeScript error by providing a typed Stack
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          {/* Changed initial route to Splash */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          
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