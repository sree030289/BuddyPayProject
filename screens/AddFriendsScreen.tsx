import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  SafeAreaView,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Contacts from 'expo-contacts';
import { useAuth } from '../components/AuthContext';
import { useNavigation, CommonActions, NavigationProp, RouteProp } from '@react-navigation/native';
import { collection, getDocs, query, where, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import FriendService from '../services/FriendService';

// Define app navigation types
type RootStackParamList = {
  VerifyContactsScreen: {
    selectedContacts: any[];
    userId: string;
    email?: string | null;
  };
  MainDashboard: {
    screen: string;
    params?: any;
  };
  Friends: {
    refresh: boolean;
    toastStatus: string;
  };
};

type AppNavigationProp = NavigationProp<RootStackParamList>;

// Define custom Contact interface that's compatible with Expo Contacts
interface Contact {
  id: string;
  name: string;
  emails?: {email: string}[];
  phoneNumbers?: {number: string}[];
  selected?: boolean;
}

const AddFriendsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  
  // Single contact form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  
  // Multiple contacts state
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'contacts'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [userPhone, setUserPhone] = useState<string | null>(null);
  
  // Country codes with flags
  const countryCodes = [
    { code: '+91', name: 'India 🇮🇳' },
    { code: '+1', name: 'USA/Canada 🇺🇸/🇨🇦' },
    { code: '+44', name: 'UK 🇬🇧' },
    { code: '+86', name: 'China 🇨🇳' },
    { code: '+81', name: 'Japan 🇯🇵' },
    { code: '+82', name: 'South Korea 🇰🇷' },
    { code: '+61', name: 'Australia 🇦🇺' },
    { code: '+49', name: 'Germany 🇩🇪' },
    { code: '+33', name: 'France 🇫🇷' },
    { code: '+7', name: 'Russia 🇷🇺' },
    { code: '+971', name: 'UAE 🇦🇪' },
    { code: '+27', name: 'South Africa 🇿🇦' },
    { code: '+55', name: 'Brazil 🇧🇷' },
    { code: '+52', name: 'Mexico 🇲🇽' },
  ];

  // Fetch user phone number on component mount
  useEffect(() => {
    const fetchUserPhone = async () => {
      if (user?.email) {
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', user.email));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUserPhone(userData.phone || null);
          }
        } catch (error) {
          console.error('Error fetching user phone:', error);
          setError('Could not fetch user profile. Please try again later.');
        }
      }
    };
    
    fetchUserPhone();
  }, [user]);

  // Handle tab switching
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setError(null);
    
    // If switching to contacts tab, request contacts permission
    if (tab === 'contacts' && contactsList.length === 0) {
      loadContacts();
    }
  };

  // Load contacts from device
  const loadContacts = async () => {
    try {
      setLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name, 
            Contacts.Fields.PhoneNumbers, 
            Contacts.Fields.Emails
          ],
          sort: Contacts.SortTypes.FirstName
        });
        
        if (data.length > 0) {
          // Filter out contacts without phone numbers or emails
          const validContactsData = data.filter(contact => 
            (contact.phoneNumbers && contact.phoneNumbers.length > 0) || 
            (contact.emails && contact.emails.length > 0)
          );
          
          // Convert Expo contacts to our Contact interface
          const mappedContacts: Contact[] = validContactsData.map(contact => ({
            id: contact.id,
            name: contact.name || 'Unknown',
            emails: contact.emails,
            phoneNumbers: contact.phoneNumbers,
            selected: false
          }));
          
          setContactsList(mappedContacts);
          setFilteredContacts(mappedContacts);
        } else {
          Alert.alert('No Contacts', 'Your contact list is empty.');
        }
      } else {
        Alert.alert('Permission Required', 'Please grant contacts permission to use this feature.');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoading(false);
      setError('Failed to load contacts. Please try again.');
    }
  };

  // Filter contacts based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContacts(contactsList);
    } else {
      const filtered = contactsList.filter(contact => 
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchTerm, contactsList]);

  // Toggle contact selection
  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, {...contact, selected: true}];
      }
    });
  };

  // Validate single contact form
  const validateSingleContact = () => {
    if (!name.trim()) {
      setError('Friend name is required');
      return false;
    }
    
    if (!email.trim() && !phone.trim()) {
      setError('Please provide either an email or phone number');
      return false;
    }
    
    if (email.trim() && !validateEmail(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 7) {
        setError('Please enter a valid phone number');
        return false;
      }
    }
    
    setError(null);
    return true;
  };
  
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  // Add a single friend
  const handleAddSingleFriend = async () => {
    if (!validateSingleContact()) return;
    
    if (!user) {
      setError('You must be logged in to add friends');
      return;
    }
    
    if (!userPhone) {
      setError('Your profile needs a phone number to add friends');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare full phone number
      const fullPhone = phone.trim() ? `${countryCode}${phone.replace(/\D/g, '')}` : undefined;
      
      // Check if friend already exists
      const { exists, friendData } = await FriendService.checkFriendExists(
        userPhone,
        email.trim() || undefined,
        fullPhone || undefined
      );
      
      if (exists) {
        setError(`${friendData?.name || 'This person'} is already in your friends list`);
        setLoading(false);
        return;
      }
      
      // Add the friend
      const friendId = await FriendService.addFriend(userPhone, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: fullPhone || undefined,
        status: 'pending',
        totalAmount: 0
      });
      
      // Prepare invitation message
      const inviteMessage = `${user.displayName || 'Someone'} has invited you to join BuddyPay. Download the app to split expenses with friends: https://buddypay.app/invite`;
      
      setLoading(false);
      
      if (fullPhone) {
        // Show in-app SMS modal
        setSmsRecipient(fullPhone);
        setSmsMessage(inviteMessage);
        setShowSmsModal(true);
      } else {
        // No phone number, just navigate back
        Alert.alert(
          'Friend Added',
          `${name.trim()} has been added to your friends list.`,
          [{ text: 'OK', onPress: navigateToFriendsScreen }]
        );
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      setError((error as Error)?.message || 'Failed to add friend. Please try again.');
      setLoading(false);
    }
  };

  // Add multiple friends from contacts
  const handleAddMultipleContacts = async () => {
    if (selectedContacts.length === 0) {
      setError('Please select at least one contact');
      return;
    }
    
    if (!user) {
      setError('You must be logged in to add friends');
      return;
    }
    
    if (!userPhone) {
      setError('Your profile needs a phone number to add friends');
      return;
    }
    
    // Navigate to verification screen with selected contacts
    // Convert selectedContacts to the expected format
    const contactsToVerify = selectedContacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      emails: contact.emails,
      phoneNumbers: contact.phoneNumbers,
      selected: true
    }));
    
    navigation.navigate('VerifyContactsScreen', {
      selectedContacts: contactsToVerify,
      userId: user.uid || '',
      email: user.email
    });
  };

  // Send SMS from in-app modal
  const handleSendSms = async () => {
    try {
      // Share API to open share sheet with the message
      await Share.share({
        message: smsMessage,
      });
      
      // Close modal and show success
      setShowSmsModal(false);
      navigateToFriendsScreen();
    } catch (error) {
      console.error('Error sending invitation:', error);
      setShowSmsModal(false);
      navigateToFriendsScreen();
    }
  };

  // Navigation helper
  const navigateToFriendsScreen = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainDashboard',
            state: {
              routes: [{ name: 'Friends', params: { refresh: true, toastStatus: 'Friend added successfully' } }],
              index: 0
            }
          }
        ]
      })
    );
  };

  // Render contact item
  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContacts.some(c => c.id === item.id);
    const contactEmail = item.emails && item.emails.length > 0 ? item.emails[0].email : '';
    const contactPhone = item.phoneNumbers && item.phoneNumbers.length > 0 ? item.phoneNumbers[0].number : '';
    
    return (
      <TouchableOpacity 
        style={[styles.contactItem, isSelected && styles.selectedContactItem]}
        onPress={() => toggleContactSelection(item)}
      >
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {contactPhone && <Text style={styles.contactDetail}>{contactPhone}</Text>}
          {contactEmail && <Text style={styles.contactDetail}>{contactEmail}</Text>}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0A6EFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => switchTab('new')}
        >
          <Ionicons 
            name="person-add-outline" 
            size={20} 
            color={activeTab === 'new' ? "#0A6EFF" : "#888"}
          />
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            Add New
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
          onPress={() => switchTab('contacts')}
        >
          <Ionicons 
            name="people-outline" 
            size={20} 
            color={activeTab === 'contacts' ? "#0A6EFF" : "#888"}
          />
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>
            From Contacts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {/* New Contact Form */}
        {activeTab === 'new' && (
          <View style={styles.form}>
            <Text style={styles.label}>Friend's Name*</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneContainer}>
              <View style={styles.countryCodeContainer}>
                <Picker
                  selectedValue={countryCode}
                  onValueChange={(itemValue) => setCountryCode(itemValue)}
                  style={styles.countryCodePicker}
                >
                  {countryCodes.map(item => (
                    <Picker.Item key={item.code} label={item.name} value={item.code} />
                  ))}
                </Picker>
              </View>
              <View style={styles.phoneInputContainer}>
                <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter phone number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <Text style={styles.infoText}>
              We'll notify your friend about your request, and they'll be able to add you as a friend as well.
            </Text>

            <TouchableOpacity
              style={[styles.addButton, (loading || !name) && styles.disabledButton]}
              onPress={handleAddSingleFriend}
              disabled={loading || !name}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add Friend</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Contacts List */}
        {activeTab === 'contacts' && (
          <View style={styles.contactsContainer}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts"
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Selection Info */}
            <View style={styles.selectionInfoContainer}>
              <Text style={styles.selectionInfoText}>
                {selectedContacts.length === 0 
                  ? 'Select friends to add' 
                  : `${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''} selected`}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A6EFF" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contactsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>
                      {searchTerm ? 'No contacts found' : 'No contacts available'}
                    </Text>
                  </View>
                }
              />
            )}

            {/* Add Button for Contacts */}
            {selectedContacts.length > 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddMultipleContacts}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>
                    Add {selectedContacts.length} Contact{selectedContacts.length > 1 ? 's' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* SMS Modal */}
      <Modal
        visible={showSmsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSmsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Invitation</Text>
            <Text style={styles.modalSubtitle}>Invite {name} to join BuddyPay</Text>
            
            <View style={styles.smsPreviewContainer}>
              <Text style={styles.smsPreviewText}>{smsMessage}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendSms}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setShowSmsModal(false);
                navigateToFriendsScreen();
              }}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 16,
    padding: 4
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabText: {
    color: '#888',
    marginLeft: 8,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#0A6EFF'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12
  },
  errorText: {
    marginLeft: 8,
    color: '#F44336',
    flex: 1
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  form: {
    flex: 1
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  countryCodeContainer: {
    width: '38%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginRight: 10,
    height: 50,
    justifyContent: 'center'
  },
  countryCodePicker: {
    height: 50,
    width: '100%'
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50
  },
  phoneInput: {
    flex: 1,
    height: 50,
    fontSize: 16
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20
  },
  addButton: {
    backgroundColor: '#0A6EFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
    opacity: 0.6
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  // Contacts tab styles
  contactsContainer: {
    flex: 1
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16
  },
  selectionInfoContainer: {
    marginBottom: 12
  },
  selectionInfoText: {
    fontSize: 14,
    color: '#666'
  },
  contactsList: {
    paddingBottom: 100
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8
  },
  selectedContactItem: {
    backgroundColor: '#E3F2FD'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  contactDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 4
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkedBox: {
    backgroundColor: '#0A6EFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 16
  },
  // SMS Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  smsPreviewContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee'
  },
  smsPreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20
  },
  sendButton: {
    backgroundColor: '#0A6EFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16
  },
  skipButton: {
    padding: 12,
    alignItems: 'center'
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14
  }
});

export default AddFriendsScreen;