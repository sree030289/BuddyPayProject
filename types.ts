// Updated types.ts with fixed type definitions
export type RootStackParamList = {
    // Auth and primary screens
    Splash: undefined;
    WelcomeScreen: undefined;
    Register: undefined;
    OTP: undefined;
    SetPINScreen: undefined;
    PINEntryScreen: undefined; // Added PINEntryScreen
    RegistrationScreen: undefined;
    LoginScreen: undefined;
    
    // Main navigation
    MainDashboard: { 
        status?: string; 
        screen?: string;
        userId?: string;
        email?: string;
        friendName?: string;
        totalOwed?: number;
        groups?: any[];
        refresh?: boolean; 
        hideTabBar?: boolean;
        params?: any;
    };
    
    // Tab screens
    FriendsScreen: {
        userId?: string; 
        email?: string; 
        status?: string;
        refreshTrigger?: number;
        insideTabNavigator?: boolean;
        toastStatus?: string; // Added toastStatus property
    };
    ActivityScreen: {
        insideTabNavigator?: boolean;
    };
    AccountScreen: {
        insideTabNavigator?: boolean;
    };
    
    // Friend-related screens
    AddFriendsScreen: {
        userId?: string;
        email?: string;
        groupId?: string; // Added for group flow
        groupName?: string; // Added for group flow
    };
    VerifyContactsScreen: {
        // For friend flow
        selected?: any[];
        userId?: string;
        email?: string;
        
        // For group flow
        groupId?: string;
        groupName?: string;
        selectedContacts?: any[];
    };
      
    // Group screens
    GroupsScreen: {
        userId?: string;
        email?: string;
        status?: string;
        insideTabNavigator?: boolean;
        toastStatus?: string; // Added toastStatus for consistency
        refreshTrigger?: number; // Added refreshTrigger for consistency
    };
      
    CreateGroupScreen: {};
      
    GroupDashboardScreen: {
        groupId: string;
        groupName: string;
        groupType?: string;
        totalAmount?: number;
        isNewGroup?: boolean;
        refresh?: boolean;
        refreshGroupsOnReturn?: boolean;
    };
      
    AddGroupMembersScreen: {
        groupId: string;
        groupName: string;
    };
      
    GroupSettingsScreen: {
        groupId: string;
        groupName: string;
        groupType: string;
    };
    
    JoinGroupScreen: {
        inviteToken?: string;
    };
    
    FriendsDashboardScreen: {
        friendId: string;
        friendName: string;
        email?: string;
        totalOwed: number;
        groups: {
            id: string;
            name: string;
            image: string;
            amount: number;
            balanceType: string;
            date: string;
        }[];
    };
    FriendSettingsScreen: {
        friendId: string;
        friendName?: string;
        email?: string;
    };
  };
  
  // Update TabParamList to match your tab screens
  export type TabParamList = {
    Friends: { 
        userId?: string; 
        email?: string; 
        status?: string;
        refreshTrigger?: number;
        insideTabNavigator?: boolean;
        toastStatus?: string; // Added toastStatus property
    };
    Groups: {
        userId?: string;
        email?: string;
        status?: string;
        insideTabNavigator?: boolean;
        toastStatus?: string; // Added toastStatus
        refreshTrigger?: number; // Added refreshTrigger
    };
    Activity: {
        insideTabNavigator?: boolean;
    };
    Account: {
        insideTabNavigator?: boolean;
    };
  };