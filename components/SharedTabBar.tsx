import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from './AuthContext';
import ActivityService from '../services/ActivityService';

type TabBarNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SharedTabBarProps {
  activeTab: 'Home' | 'Groups' | 'Friends' | 'Activity' | 'Profile';
}

const SharedTabBar: React.FC<SharedTabBarProps> = ({ activeTab }) => {
  const navigation = useNavigation<TabBarNavigationProp>();
  const { user } = useAuth();
  const [unreadActivities, setUnreadActivities] = useState(0);

  // Fetch unread activity count
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }
  }, [user, activeTab]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await ActivityService.getUnreadCount(user.uid);
      setUnreadActivities(count);
    } catch (error) {
      console.error('Error fetching unread activity count:', error);
    }
  };

  const handleTabPress = (tab: string) => {
    // If already on the tab, don't navigate again
    if (tab === activeTab) return;

    switch (tab) {
      case 'Home':
        navigation.navigate('MainDashboard', { screen: 'Home' });
        break;
      case 'Groups':
        navigation.navigate('MainDashboard', { screen: 'Groups' });
        break;
      case 'Friends':
        navigation.navigate('MainDashboard', { screen: 'Friends' });
        break;
      case 'Activity':
        navigation.navigate('MainDashboard', { screen: 'Activity' });
        break;
      case 'Account':
        navigation.navigate('MainDashboard', { screen: 'Account' });
        break;
    }
  };

  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress('Home')}
      >
        <Ionicons
          name={activeTab === 'Home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'Home' ? '#0A6EFF' : '#757575'}
        />
        <Text style={[styles.tabLabel, activeTab === 'Home' && styles.activeTabLabel]}>
          Home
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress('Groups')}
      >
        <Ionicons
          name={activeTab === 'Groups' ? 'people' : 'people-outline'}
          size={24}
          color={activeTab === 'Groups' ? '#0A6EFF' : '#757575'}
        />
        <Text style={[styles.tabLabel, activeTab === 'Groups' && styles.activeTabLabel]}>
          Groups
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress('Friends')}
      >
        <Ionicons
          name={activeTab === 'Friends' ? 'person' : 'person-outline'}
          size={24}
          color={activeTab === 'Friends' ? '#0A6EFF' : '#757575'}
        />
        <Text style={[styles.tabLabel, activeTab === 'Friends' && styles.activeTabLabel]}>
          Friends
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress('Activity')}
      >
        <View>
          <Ionicons
            name={activeTab === 'Activity' ? 'time' : 'time-outline'}
            size={24}
            color={activeTab === 'Activity' ? '#0A6EFF' : '#757575'}
          />
          {unreadActivities > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadActivities > 9 ? '9+' : unreadActivities}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'Activity' && styles.activeTabLabel]}>
          Activity
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => handleTabPress('Profile')}
      >
        <Ionicons
          name={activeTab === 'Profile' ? 'settings' : 'settings-outline'}
          size={24}
          color={activeTab === 'Profile' ? '#0A6EFF' : '#757575'}
        />
        <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.activeTabLabel]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    paddingTop: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 80 : 60
  },
  tabItem: {
    flex: 1,
    alignItems: 'center'
  },
  tabLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4
  },
  activeTabLabel: {
    color: '#0A6EFF',
    fontWeight: '500'
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  }
});

export default SharedTabBar;