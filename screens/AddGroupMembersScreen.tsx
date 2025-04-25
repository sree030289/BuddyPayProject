// AddGroupMembersScreen.tsx with enhanced UI and features
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  StatusBar,
  SafeAreaView,
  Platform,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { db } from '../services/firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import * as Contacts from 'expo-contacts';

type AddGroupMembersRouteProp = RouteProp<RootStackParamList, 'AddGroupMembersScreen'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  selected: boolean;
  avatar?: string;
  isAppUser?: boolean;
}

const AddGroupMembersScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddGroupMembersRouteProp>();
  const { groupId, groupName } = route.params;
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [buddyPayContacts, setBuddyPayContacts] = useState<Contact[]>([]);
  const [phoneContacts, setPhoneContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]); 
  const [activeTab, setActiveTab] = useState<'buddypay' | 'phone'>('buddypay');
  const [loadingPhoneContacts, setLoadingPhoneContacts] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    fetchBuddyPayContacts();
    fetchExistingMembers();
  }, []);

  const fetchExistingMembers = async () => {
    try {
      setLoading(true);
      console.log('Fetching existing members for group:', groupId);
      
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        if (groupData.members && Array.isArray(groupData.members)) {
          // Extract member emails and phones
          const memberIdentifiers: string[] = [];
          groupData.members.forEach((member: any) => {
            if (member.email) memberIdentifiers.push(member.email);
            if (member.phone) memberIdentifiers.push(member.phone);
          });
          setExistingMembers(memberIdentifiers);
          console.log('Existing members loaded:', memberIdentifiers.length);
        } else {
          console.log('No members found in group data');
        }
      } else {
        console.error('Group not found:', groupId);
        Alert.alert('Error', 'Could not find the group');
      }
    } catch (error) {
      console.error('Error fetching existing members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuddyPayContacts = async () => {
    try {
      console.log('Fetching BuddyPay contacts...');
      
      // Check if current user exists in auth context
      if (!user || !user.email) {
        throw new Error('User not authenticated or missing email');
      }
      
      // Get user document to find friends and contacts
      const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('User account not found');
      }
      
      const userData = userSnapshot.docs[0].data();
      const userPhone = userData.phone;
      
      if (!userPhone) {
        throw new Error('Phone number not set in your profile');
      }
      
      // Get user's friends from Firestore
      const friendsRef = collection(db, 'users', userPhone, 'friends');
      const friendsSnapshot = await getDocs(friendsRef);
      
      // Convert to Contact format
      const contactsList: Contact[] = friendsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unknown',
        email: doc.data().email || undefined,
        phone: doc.data().phone || undefined,
        selected: false,
        isAppUser: true
      }));
      
      // If no friends found, use mock data for development
      if (contactsList.length === 0) {
        console.log('No friends found, using mock data');
        const mockContacts: Contact[] = [
          { id: '1', name: 'Avinash Yamali', email: 'avinash@example.com', selected: false, isAppUser: true },
          { id: '2', name: 'Gayathri', email: 'gayathri@example.com', selected: false, isAppUser: true },
          { id: '3', name: 'Jana Jyothsna', email: 'jana@example.com', selected: false, isAppUser: true },
          { id: '4', name: 'Jagadeesh Mel', phone: '+91987654321', selected: false, isAppUser: true },
          { id: '5', name: 'Sreeram Ind Airtel', phone: '+91739638215', selected: false, isAppUser: true },
          { id: '6', name: 'Ravindra', email: 'ravindra@example.com', selected: false, isAppUser: true },
        ];
        setBuddyPayContacts(mockContacts);
      } else {
        setBuddyPayContacts(contactsList);
      }
      
      console.log('BuddyPay contacts loaded:', contactsList.length);
    } catch (error) {
      console.error('Error fetching BuddyPay contacts:', error);
      Alert.alert('Error', 'Failed to load contacts: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      // Fallback to mock data
      const mockContacts: Contact[] = [
        { id: '1', name: 'Avinash Yamali', email: 'avinash@example.com', selected: false, isAppUser: true },
        { id: '2', name: 'Gayathri', email: 'gayathri@example.com', selected: false, isAppUser: true },
        { id: '3', name: 'Jana Jyothsna', email: 'jana@example.com', selected: false, isAppUser: true },
        { id: '4', name: 'Jagadeesh Mel', phone: '+91987654321', selected: false, isAppUser: true },
        { id: '5', name: 'Sreeram Ind Airtel', phone: '+91739638215', selected: false, isAppUser: true },
        { id: '6', name: 'Ravindra', email: 'ravindra@example.com', selected: false, isAppUser: true },
      ];
      setBuddyPayContacts(mockContacts);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoneContacts = async () => {
    if (phoneContacts.length > 0) return; // Don't fetch again if we already have contacts
    
    setLoadingPhoneContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionDenied(false);
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
          sort: Contacts.SortTypes.FirstName
        });
        
        if (data.length > 0) {
          const formattedContacts: Contact[] = data.map((contact, index) => ({
            id: contact.id || `phone-${index}`,
            name: contact.name || 'Unknown',
            email: contact.emails && contact.emails.length > 0 ? contact.emails[0].email : undefined,
            phone: contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : undefined,
            selected: false,
            isAppUser: false
          })).filter(contact => contact.name && (contact.email || contact.phone)); // Filter out contacts without name and contact info
          
          setPhoneContacts(formattedContacts);
          console.log('Phone contacts loaded:', formattedContacts.length);
        } else {
          console.log('No phone contacts found');
        }
      } else {
        setPermissionDenied(true);
        console.log('Contacts permission denied');
      }
    } catch (error) {
      console.error('Error fetching phone contacts:', error);
      Alert.alert('Error', 'Failed to load phone contacts');
    } finally {
      setLoadingPhoneContacts(false);
    }
  };

  const handleContactSelection = (contact: Contact) => {
    // Check if this contact is already a member
    const isExistingMember = 
      (contact.email && existingMembers.includes(contact.email)) || 
      (contact.phone && existingMembers.includes(contact.phone));
    
    if (isExistingMember) {
      Alert.alert('Already a member', `${contact.name} is already a member of this group.`);
      return;
    }

    // Update the appropriate contacts list
    if (activeTab === 'buddypay') {
      const updatedContacts = buddyPayContacts.map(c => {
        if (c.id === contact.id) {
          return { ...c, selected: !c.selected };
        }
        return c;
      });
      setBuddyPayContacts(updatedContacts);
    } else {
      const updatedContacts = phoneContacts.map(c => {
        if (c.id === contact.id) {
          return { ...c, selected: !c.selected };
        }
        return c;
      });
      setPhoneContacts(updatedContacts);
    }
    
    // Update the selected contacts list
    if (contact.selected) {
      // Remove from selected
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      // Add to selected
      setSelectedContacts([...selectedContacts, { ...contact, selected: true }]);
    }
  };

  const handleAddNewContact = () => {
    // This would navigate to a screen to add a completely new contact
    Alert.alert(
      'Add New Contact',
      'Enter contact details:',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Add',
          onPress: () => {
            Alert.alert('Feature in development', 'Adding new contacts will be available soon');
          }
        }
      ]
    );
  };

  const handleNext = () => {
    if (selectedContacts.length === 0) {
      Alert.alert('No contacts selected', 'Please select at least one contact to add to the group.');
      return;
    }
    
    // Format the contacts in the way VerifyContactsScreen expects them
    const formattedContacts = selectedContacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phoneNumbers: contact.phone ? [{ number: contact.phone }] : [],
      selected: true
    }));
    
    navigation.navigate('VerifyContactsScreen', {
      groupId,
      groupName,
      selectedContacts: formattedContacts,
      userId: user?.uid
    });
  };

  const getColorFromName = (name: string) => {
    const colors = [
      '#4A90E2', '#50C878', '#FF6B81', '#9D65C9', 
      '#FF9642', '#8A2BE2', '#607D8B', '#E91E63'
    ];
    
    // Simple hash function for the name
    const hash = name.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };

  const getFilteredContacts = () => {
    const contacts = activeTab === 'buddypay' ? buddyPayContacts : phoneContacts;
    
    if (!searchQuery) return contacts;
    
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.phone && contact.phone.includes(searchQuery))
    );
  };

  const switchTab = (tab: 'buddypay' | 'phone') => {
    setActiveTab(tab);
    if (tab === 'phone' && phoneContacts.length === 0 && !loadingPhoneContacts) {
      fetchPhoneContacts();
    }
  };

  const filteredContacts = getFilteredContacts();

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
          <Text style={styles.headerTitle}>Add group members</Text>
          <TouchableOpacity 
            style={[styles.nextButton, selectedContacts.length === 0 && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={selectedContacts.length === 0}
          >
            <Text style={[styles.nextText, selectedContacts.length === 0 && styles.nextTextDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or phone"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Icon name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selected contacts chips */}
        {selectedContacts.length > 0 && (
          <View style={styles.selectedContactsContainer}>
            <FlatList
              horizontal
              data={selectedContacts}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.selectedContactChip}
                  onPress={() => handleContactSelection(item)}
                >
                  <Text style={styles.selectedContactName}>{item.name}</Text>
                  <Icon name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.selectedContactsContent}
            />
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'buddypay' && styles.activeTabButton]}
            onPress={() => switchTab('buddypay')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'buddypay' && styles.activeTabText]}>
              Friends on BuddyPay
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'phone' && styles.activeTabButton]}
            onPress={() => switchTab('phone')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'phone' && styles.activeTabText]}>
              Phone Contacts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add new contact button */}
        <TouchableOpacity 
          style={styles.addNewContactButton}
          onPress={handleAddNewContact}
        >
          <View style={styles.contactIconContainer}>
            <Icon name="person-add" size={20} color="#0A6EFF" />
          </View>
          <Text style={styles.addNewContactText}>Add a new contact to BuddyPay</Text>
        </TouchableOpacity>

        {/* Contacts list */}
        {activeTab === 'buddypay' && loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading BuddyPay contacts...</Text>
          </View>
        ) : activeTab === 'phone' && loadingPhoneContacts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A6EFF" />
            <Text style={styles.loadingText}>Loading phone contacts...</Text>
          </View>
        ) : activeTab === 'phone' && permissionDenied ? (
          <View style={styles.emptyContainer}>
            <Icon name="alert-circle-outline" size={40} color="#FF9800" />
            <Text style={styles.emptyText}>
              Contact permission denied. Please enable contact access in your device settings to view your phone contacts.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              // Check if this contact is already a member
              const isExistingMember = 
                (item.email && existingMembers.includes(item.email)) || 
                (item.phone && existingMembers.includes(item.phone));
              
              return (
                <TouchableOpacity 
                  style={[
                    styles.contactItem,
                    item.selected && styles.selectedContactItem
                  ]}
                  onPress={() => !isExistingMember && handleContactSelection(item)}
                  disabled={Boolean(isExistingMember)}
                >
                  <View style={styles.contactAvatarContainer}>
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
                    ) : (
                      <View 
                        style={[
                          styles.contactAvatarPlaceholder,
                          { backgroundColor: getColorFromName(item.name) }
                        ]}
                      >
                        <Text style={styles.contactInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactDetail}>
                      {item.email || item.phone || 'No contact info'}
                      {isExistingMember && ' • Already in group'}
                      {activeTab === 'buddypay' && ' • On BuddyPay'}
                    </Text>
                  </View>
                  {isExistingMember ? (
                    <Icon name="checkmark-circle" size={24} color="#ccc" />
                  ) : (
                    <TouchableOpacity 
                      style={[styles.checkCircle, item.selected && styles.checkedCircle]}
                      onPress={() => handleContactSelection(item)}
                    >
                      {item.selected && <Icon name="checkmark" size={18} color="#fff" />}
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery.length > 0 
                    ? 'No contacts found matching your search' 
                    : activeTab === 'buddypay' 
                      ? 'No BuddyPay contacts available' 
                      : 'No phone contacts available'}
                </Text>
              </View>
            }
          />
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backButton: {
    padding: 4
  },
  cancelText: {
    fontSize: 15,
    color: '#0A6EFF',
    fontWeight: '500'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  nextButton: {
    padding: 4
  },
  nextButtonDisabled: {
    opacity: 0.5
  },
  nextText: {
    fontSize: 15,
    color: '#0A6EFF',
    fontWeight: '600'
  },
  nextTextDisabled: {
    color: '#0A6EFF80'
  },
  searchContainer: {
    padding: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 4
  },
  clearButton: {
    padding: 4
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#0A6EFF'
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#0A6EFF',
    fontWeight: '600'
  },
  addNewContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  contactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  addNewContactText: {
    fontSize: 15,
    color: '#0A6EFF'
  },
  selectedContactsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedContactsContent: {
    paddingHorizontal: 12
  },
  selectedContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8
  },
  selectedContactName: {
    fontSize: 13,
    color: '#333',
    marginRight: 6
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  selectedContactItem: {
    backgroundColor: '#f8f8f8'
  },
  contactAvatarContainer: {
    marginRight: 12
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  contactAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  contactInitial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  contactDetail: {
    fontSize: 13,
    color: '#666'
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkedCircle: {
    backgroundColor: '#0A6EFF',
    borderColor: '#0A6EFF'
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  }
});

export default AddGroupMembersScreen;