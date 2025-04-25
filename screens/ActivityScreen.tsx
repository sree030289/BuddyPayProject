import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook

interface Activity {
  id: string;
  description: string;
}

const ActivityScreen = ({ route }: any) => {
  const { user, isLoading } = useAuth(); // Use auth context
  
  // In a real app, you'd fetch recent activity data from your backend
  const activities: Activity[] = [];

  // Show loading state while auth data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.screenContainer}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Activity</Text>
        </View>

        {activities.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Icon name="bar-chart-outline" size={60} color="#bbb" />
            <Text style={styles.emptyStateTitle}>No recent activity</Text>
            <Text style={styles.emptyStateSubtitle}>
              When you add expenses or settle up with friends, your activity will show here
            </Text>
          </View>
        ) : (
          <FlatList
            data={activities}
            renderItem={({ item }) => <Text>{item.description}</Text>}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }} // Add padding for the tab bar
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A6EFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#888'
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 5
  }
});

export default ActivityScreen;