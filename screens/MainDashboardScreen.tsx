import React from 'react';
import { View } from 'react-native';
import TabNavigator from '../components/TabNavigator';
import { useAuth } from '../components/AuthContext';

interface MainDashboardProps {
  route?: { params?: { screen?: string, params?: any } };
}

export default function MainDashboardScreen({ route }: MainDashboardProps) {
  const { user } = useAuth();
  
  // Get initial screen from params
  const initialParams = route?.params || {};
  const initialScreen = initialParams.screen || 'Groups'; // Default to Groups
  
  // Log when the screen mounts for debugging
  React.useEffect(() => {
    console.log('MainDashboardScreen mounted with initialScreen:', initialScreen);
  }, [initialScreen]);

  return (
    <View style={{ flex: 1 }}>
      <TabNavigator 
        initialScreen={initialScreen as any}
        userId={user?.uid}
        email={user?.email}
        route={route}
      />
    </View>
  );
}