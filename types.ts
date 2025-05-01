// types.ts
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define the tab navigator param list
export type RootTabParamList = {
  Friends: undefined;
  Groups: undefined;
  Expenses: undefined;
  Profile: undefined;
};

// Define the root stack navigator param list
export type RootStackParamList = {
  // Splash Screens
  Splash: undefined;
  
  // Authentication Screens
  WelcomeScreen: undefined;
  LoginScreen: undefined;
  Register: undefined;
  RegistrationScreen: undefined;
  SetPINScreen: { email: string; password: string; fullName: string };
  PINEntryScreen: undefined;
  RegistrationSuccess: undefined;
  
  // Main Dashboard (contains the tab navigator)
  MainDashboard: NavigatorScreenParams<RootTabParamList>;
  
  // Group-related screens
  CreateGroupScreen: undefined;
  GroupDashboardScreen: { groupId: string };
  AddGroupMembersScreen: { groupId: string };
  GroupSettingsScreen: { groupId: string };
  JoinGroupScreen: undefined;
  
  // Expense-related screens
  AddExpenseScreen: { groupId?: string; friendId?: string };
  
  // Friend-related screens
  AddFriendsScreen: undefined;
  VerifyContactsScreen: undefined;
  FriendsDashboardScreen: { friendId: string };
  FriendSettingsScreen: { friendId: string };
};

// Helper type for accessing screen props
export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

// Helper type for accessing tab screen props
export type RootTabScreenProps<T extends keyof RootTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Type for expense objects
export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
  paidByName: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  participants: {
    userId: string;
    name: string;
    amount: number;
    paid: boolean;
  }[];
  groupId?: string;
  notes?: string;
  receipt?: string;
  category: string;
}

// Type for user objects
export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  profilePicture?: string;
}

// Type for friend objects
export interface Friend {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profilePicture?: string;
  totalOwed: number;
  totalOwedBy: number;
}

// Type for group objects
export interface Group {
  id: string;
  name: string;
  description?: string;
  members: {
    userId: string;
    name: string;
    email: string;
    profilePicture?: string;
  }[];
  expenses: string[]; // Array of expense IDs
  createdBy: string;
  createdAt: string;
  groupPicture?: string;
  inviteCode: string;
}

// App Settings type
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currencyFormat: string;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
}

// Auth context type
export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}