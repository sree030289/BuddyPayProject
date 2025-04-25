// CreateGroupScreen.tsx with AuthContext
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  ActionSheetIOS,
  ActivityIndicator
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../components/AuthContext'; // Import useAuth hook

interface CreateGroupScreenProps {
  navigation: any;
  route?: any;
}

const CreateGroupScreen = ({ navigation, route }: CreateGroupScreenProps) => {
  const { user, isLoading } = useAuth(); // Get user data from AuthContext
  const [groupName, setGroupName] = useState('');
  const [selectedType, setSelectedType] = useState('home');
  const [isCreating, setIsCreating] = useState(false);
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const groupTypes = [
    { id: 'trip', name: 'Trip', icon: 'airplane', color: '#4A90E2' },
    { id: 'home', name: 'Home', icon: 'home', color: '#50C878' },
    { id: 'couple', name: 'Couple', icon: 'heart', color: '#FF6B81' },
    { id: 'friends', name: 'Friends', icon: 'people', color: '#9D65C9' },
    { id: 'flatmate', name: 'Flatmate', icon: 'bed', color: '#FF9642' },
    { id: 'apartment', name: 'Apartment', icon: 'business', color: '#8A2BE2' },
    { id: 'other', name: 'Others', icon: 'list', color: '#607D8B' },
  ];

  const handleImagePicker = async () => {
    if (Platform.OS === 'ios') {
      // For iOS, show an action sheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await takePhoto();
          } else if (buttonIndex === 2) {
            await pickImage();
          }
        }
      );
    } else {
      // For Android, show an Alert with buttons
      Alert.alert(
        'Add Group Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: takePhoto },
          { text: 'Choose from Library', onPress: pickImage },
        ],
        { cancelable: true }
      );
    }
  };

  const takePhoto = async () => {
    // Ask for camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setGroupImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    // Ask for media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Media library permission is required to select photos');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setGroupImage(result.assets[0].uri);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Group name required', 'Please enter a name for your group');
      return;
    }

    // Check if user is authenticated using AuthContext
    if (!user) {
      console.log('User not authenticated');
      Alert.alert(
        'Authentication required', 
        'Please log in to create a group', 
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('PINEntryScreen'),
          }
        ]
      );
      return;
    }

    setIsCreating(true);

    try {
      console.log('Creating group with user:', user.uid);
      
      // Create the group data
      const groupData = {
        name: groupName.trim(),
        type: selectedType,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [
          {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || user.name || 'You',
            isAdmin: true,
          }
        ],
        totalAmount: 0,
        // Add image URL if available (in a real app, you'd upload to storage first)
        imageUrl: groupImage || null
      };

      console.log('Creating group with data:', JSON.stringify(groupData));

      // Create a new group and get the reference
      const groupRef = await addDoc(collection(db, 'groups'), groupData);
      
      // Navigate to the group dashboard with a flag to refresh the groups list when returning
      navigation.replace('GroupDashboardScreen', {
        groupId: groupRef.id,
        groupName: groupName.trim(),
        groupType: selectedType,
        isNewGroup: true,
        refreshGroupsOnReturn: true  // Add this flag
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create the group. Please try again.');
      setIsCreating(false);
    }
  };

  // Show loading indicator while user data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#0A6EFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a group</Text>
          <TouchableOpacity 
            style={[styles.doneButton, !groupName.trim() && styles.doneButtonDisabled]}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || isCreating}
          >
            <Text style={[styles.doneText, !groupName.trim() && styles.doneTextDisabled]}>
              {isCreating ? 'Creating...' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Image & Name */}
          <View style={styles.groupInfoSection}>
            <TouchableOpacity 
              style={styles.groupImagePlaceholder}
              onPress={handleImagePicker}
            >
              {groupImage ? (
                <Image source={{ uri: groupImage }} style={styles.groupImage} />
              ) : (
                <View style={styles.cameraIconContainer}>
                  <Icon name="camera" size={28} color="#0A6EFF" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.nameInputContainer}>
              <Text style={styles.inputLabel}>Group name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Enter group name"
                placeholderTextColor="#aaa"
                value={groupName}
                onChangeText={setGroupName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Group Type Selection */}
          <View style={styles.typeSection}>
            <Text style={styles.sectionTitle}>Type</Text>
            <View style={styles.typeGrid}>
              {groupTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeItem,
                    selectedType === type.id && styles.selectedTypeItem,
                    { borderColor: selectedType === type.id ? type.color : 'transparent' }
                  ]}
                  onPress={() => setSelectedType(type.id)}
                >
                  <View 
                    style={[
                      styles.typeIconContainer,
                      { backgroundColor: type.color + '20' }, // Add transparency
                      selectedType === type.id && { backgroundColor: type.color + '30' } // Darker when selected
                    ]}
                  >
                    
                    <Icon name={type.icon} size={24} color={type.color} />
                  </View>
                  <Text style={styles.typeLabel}>{type.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Optional settings would go here */}
          <View style={styles.optionalSettings}>
            {/* This section is intentionally left empty as specified in requirements */}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backButton: {
    padding: 4
  },
  cancelText: {
    fontSize: 16,
    color: '#0A6EFF',
    fontWeight: '500'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333'
  },
  doneButton: {
    padding: 4
  },
  doneButtonDisabled: {
    opacity: 0.5
  },
  doneText: {
    fontSize: 16,
    color: '#0A6EFF',
    fontWeight: '600'
  },
  doneTextDisabled: {
    color: '#0A6EFF80'
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20
  },
  groupInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30
  },
  groupImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden'
  },
  groupImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16
  },
  cameraIconContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoText: {
    fontSize: 10,
    marginTop: 4,
    color: '#0A6EFF'
  },
  nameInputContainer: {
    flex: 1
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  nameInput: {
    fontSize: 18,
    color: '#333',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  typeSection: {
    marginBottom: 30
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8
  },
  typeItem: {
    width: '25%',
    paddingHorizontal: 8,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 8
  },
  selectedTypeItem: {
    backgroundColor: '#f8f8f8'
  },
  typeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  typeLabel: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center'
  },
  optionalSettings: {
    marginBottom: 40
  }
});

export default CreateGroupScreen;