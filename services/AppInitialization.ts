// services/AppInitialization.ts
import * as SecureStore from 'expo-secure-store';
import * as Font from 'expo-font';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface InitializationStatus {
  isInitialized: boolean;
  error?: Error;
}

class AppInitializationService {
  // Load fonts
  async loadFonts(): Promise<void> {
    try {
      // Skip font loading for now to prevent the error
      // We'll use system fonts instead (this is safer than trying to load undefined fonts)
      console.log('Font loading skipped - using system fonts');
      return;
      
      /* Commented out until font assets are properly added
      await Font.loadAsync({
        'roboto-regular': require('../assets/fonts/Roboto-Regular.ttf'),
        'roboto-bold': require('../assets/fonts/Roboto-Bold.ttf'),
        'roboto-medium': require('../assets/fonts/Roboto-Medium.ttf'),
      });
      console.log('Fonts loaded successfully');
      */
    } catch (error) {
      console.error('Error loading fonts:', error);
      // Non-critical, so we continue without stopping app initialization
    }
  }

  // Check device capabilities
  async checkDeviceCapabilities(): Promise<void> {
    const deviceType = await Device.getDeviceTypeAsync();
    const isTablet = deviceType === Device.DeviceType.TABLET;
    
    // Store device info for later use if needed
    await SecureStore.setItemAsync('isTablet', JSON.stringify(isTablet));
    
    // More device capability checks could be added here
  }

  // Set up push notifications (if applicable)
  async setupPushNotifications(): Promise<void> {
    if (Constants.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for notification!');
        await SecureStore.setItemAsync('pushNotificationsEnabled', 'false');
        return;
      }
      
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push Notification Token:', token);
        await SecureStore.setItemAsync('pushToken', token);
        await SecureStore.setItemAsync('pushNotificationsEnabled', 'true');
        
        // Configure how notifications appear when the app is in the foreground
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        
        // For Android channel creation
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#9061F9',
          });
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
        await SecureStore.setItemAsync('pushNotificationsEnabled', 'false');
      }
    } else {
      console.log('Must use physical device for Push Notifications');
      await SecureStore.setItemAsync('pushNotificationsEnabled', 'false');
    }
  }

  // Initialize app settings if it's the first run
  async initializeAppSettings(): Promise<void> {
    const hasInitialized = await SecureStore.getItemAsync('hasInitialized');
    
    if (!hasInitialized) {
      // Set default app settings
      const defaultSettings = {
        theme: 'light',
        currencyFormat: 'auto',
        notificationsEnabled: true,
        biometricEnabled: false,
        // Add more default settings as needed
      };
      
      await SecureStore.setItemAsync('appSettings', JSON.stringify(defaultSettings));
      await SecureStore.setItemAsync('hasInitialized', 'true');
      
      console.log('App initialized with default settings');
    }
  }

  // Main initialization method that orchestrates all initialization tasks
  async initialize(): Promise<InitializationStatus> {
    try {
      // Run all initialization tasks concurrently
      await Promise.all([
        this.loadFonts(),
        this.checkDeviceCapabilities(),
        this.setupPushNotifications(),
        this.initializeAppSettings(),
      ]);
      
      return { isInitialized: true };
    } catch (error) {
      console.error('Error during app initialization:', error);
      return { 
        isInitialized: false, 
        error: error instanceof Error ? error : new Error('Unknown initialization error') 
      };
    }
  }
}

export default new AppInitializationService();