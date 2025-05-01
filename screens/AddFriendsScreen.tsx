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
  Share,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useNavigation, CommonActions, NavigationProp } from '@react-navigation/native';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../components/AuthContext';
import FriendService from '../services/FriendService';
import ActivityService from '../services/ActivityService';

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

// Country code interface
interface CountryCode {
  code: string;
  name: string;
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
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Country codes with flags - FIXED: Simplified and formatted for better display
  const countryCodes: CountryCode[] = [
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

  // Monitor keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Find selected country name
  const getSelectedCountryName = () => {
    const selected = countryCodes.find(item => item.code === countryCode);
    return selected ? selected.name : countryCode;
  };

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
      ActivityService.logFriendAdded(
        user.uid,
        user.displayName || 'You',
        friendId,
        name.trim()
      );
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

  // Render country code item
  const renderCountryCodeItem = ({ item }: { item: CountryCode }) => (
    <TouchableOpacity 
      style={styles.countryCodeItem}
      onPress={() => {
        setCountryCode(item.code);
        setShowCountryCodeModal(false);
      }}
    >
      <Text style={styles.countryCodeItemText}>{item.name}</Text>
      {countryCode === item.code && (
        <Ionicons name="checkmark" size={20} color="#9061F9" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#9061F9" />
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
            color={activeTab === 'new' ? "#9061F9" : "#888"}
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
            color={activeTab === 'contacts' ? "#9061F9" : "#888"}
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

      {/* Main Content with KeyboardAvoidingView */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {/* Tab Content */}
          <View style={styles.contentContainer}>
            {/* New Contact Form */}
            {activeTab === 'new' && (
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer}>
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
                      returnKeyType="next"
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
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.phoneContainer}>
                    <TouchableOpacity 
                      style={styles.countryCodeContainer}
                      onPress={() => setShowCountryCodeModal(true)}
                    >
                      <Text style={styles.countryCodeText}>{countryCode}</Text>
                      <Ionicons name="chevron-down" size={16} color="#999" />
                    </TouchableOpacity>
                    <View style={styles.phoneInputContainer}>
                      <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Enter phone number"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  </View>

                  <Text style={styles.infoText}>
                    We'll notify your friend about your request, and they'll be able to add you as a friend as well.
                  </Text>

                  {/* Add Button - always visible */}
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
              </ScrollView>
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
                    returnKeyType="search"
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
                    <ActivityIndicator size="large" color="#9061F9" />
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

                {/* Add Button for Contacts - always visible, but we'll position it */}
                {selectedContacts.length > 0 && (
                  <View style={styles.floatingButtonContainer}>
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
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Floating keyboard-aware button for mobile tab when keyboard is visible */}
      {activeTab === 'new' && keyboardVisible && (
        <View style={styles.keyboardButtonContainer}>
          <TouchableOpacity 
            style={styles.keyboardDoneButton}
            onPress={() => Keyboard.dismiss()}
          >
            <Text style={styles.keyboardDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Country Code Modal */}
      <Modal
        visible={showCountryCodeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCountryCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.countryCodeModal}>
            <View style={styles.countryCodeModalHeader}>
              <Text style={styles.countryCodeModalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryCodeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={countryCodes}
              renderItem={renderCountryCodeItem}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.countryCodeList}
            />
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
    paddingVertical: 8 // Reduced padding
  },
  backButton: {
    padding: 6
  },
  headerTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: '600',
    color: '#333'
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8, // Reduced from 10
    margin: 12, // Reduced from 16
    padding: 3 // Reduced from 4
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, // Reduced from 8
    borderRadius: 6 // Reduced from 8
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
    marginLeft: 6, // Reduced from 8
    fontWeight: '500',
    fontSize: 13 // Added explicit font size
  },
  activeTabText: {
    color: '#9061F9'
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10, // Reduced from 12
    marginHorizontal: 12, // Reduced from 16
    borderRadius: 8, // Reduced from 10
    marginBottom: 10 // Reduced from 12
  },
  errorText: {
    marginLeft: 8,
    color: '#F44336',
    flex: 1,
    fontSize: 12 // Reduced font size
  },
  // Modified keyboard avoiding container with more appropriate settings
  keyboardAvoidingContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 12 // Reduced from 16
  },
  // ScrollView for form with adjusted padding
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20, // Reduced from 30
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 13, // Reduced from 14
    fontWeight: '500',
    color: '#666',
    marginBottom: 6 // Reduced from 8
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8, // Reduced from 10
    paddingVertical: 8, // Reduced vertical padding 
    paddingHorizontal: 10, // Reduced horizontal padding
    marginBottom: 14 // Reduced from 20
  },
  inputIcon: {
    marginRight: 8, // Reduced from 10
    fontSize: 18 // Explicitly set icon size
  },
  input: {
    flex: 1,
    fontSize: 14, // Reduced from 16
    color: '#333'
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14 // Reduced from 20
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 90, // Reduced from 100
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8, // Reduced from 10
    marginRight: 8, // Reduced from 10
    height: 42, // Reduced from 50
    paddingHorizontal: 10 // Reduced from 12
  },
  countryCodeText: {
    fontSize: 14, // Reduced from 16
    color: '#333'
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8, // Reduced from 10
    paddingHorizontal: 10, // Reduced from 12
    height: 42 // Reduced from 50
  },
  phoneInput: {
    flex: 1,
    height: 42, // Reduced from 50
    fontSize: 14 // Reduced from 16
  },
  infoText: {
    fontSize: 12, // Reduced from 14
    color: '#666',
    marginBottom: 14, // Reduced from 20
    lineHeight: 16 // Reduced from 20
  },
  addButton: {
    backgroundColor: '#9061F9',
    paddingVertical: 12, // Reduced from 14
    borderRadius: 8, // Reduced from 10
    alignItems: 'center',
    marginTop: 8, // Reduced from 10
    marginBottom: 16 // Reduced from 20
  },
  disabledButton: {
    backgroundColor: 'rgba(144, 97, 249, 0.5)',
    opacity: 0.6
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14, // Reduced from 16
    fontWeight: '600'
  },
  // Updated keyboard-aware floating button that stays closer to keyboard
  keyboardButtonContainer: {
    position: 'absolute',
    right: 12,
    bottom: Platform.OS === 'ios' ? 2 : 10, // Adjust bottom position based on platform
    padding: 4,
    borderRadius: 16,
    zIndex: 5, // Ensure it stays above other content
  },
  keyboardDoneButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#9061F9',
    borderRadius: 12,
  },
  keyboardDoneText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12, // Reduced from 14
  },
  // Floating button for contacts tab
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 16, // Reduced from 20
    left: 0,
    right: 0,
    paddingHorizontal: 12, // Reduced from 16
    backgroundColor: 'transparent',
  },
  // Contacts tab styles
  contactsContainer: {
    flex: 1
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8, // Reduced from 10
    paddingHorizontal: 10, // Reduced from 12
    marginBottom: 12 // Reduced from 16
  },
  searchIcon: {
    marginRight: 8 // Reduced from 10
  },
  searchInput: {
    flex: 1,
    height: 42, // Reduced from 50
    fontSize: 14 // Reduced from 16
  },
  selectionInfoContainer: {
    marginBottom: 8 // Reduced from 12
  },
  selectionInfoText: {
    fontSize: 13, // Reduced from 14
    color: '#666'
  },
  contactsList: {
    paddingBottom: 80 // Reduced from 100
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Reduced from 12
    paddingHorizontal: 6, // Reduced from 8
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 6 // Reduced from 8
  },
  selectedContactItem: {
    backgroundColor: 'rgba(144, 97, 249, 0.1)'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: 14, // Reduced from 16
    fontWeight: '500',
    color: '#333'
  },
  contactDetail: {
    fontSize: 12, // Reduced from 13
    color: '#666',
    marginTop: 2 // Reduced from 4
  },
  checkbox: {
    width: 20, // Reduced from 24
    height: 20, // Reduced from 24
    borderRadius: 10, // Reduced from 12
    borderWidth: 1,
    borderColor: '#9061F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkedBox: {
    backgroundColor: '#9061F9'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 6, // Reduced from 8
    color: '#666',
    fontSize: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80 // Reduced from 100
  },
  emptyText: {
    marginTop: 10, // Reduced from 12
    color: '#999',
    fontSize: 14 // Reduced from 16
  },
  // SMS Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16, // Reduced from 20
    borderTopRightRadius: 16, // Reduced from 20
    padding: 16, // Reduced from 20
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: 'bold',
    marginBottom: 6, // Reduced from 8
    textAlign: 'center',
    color: '#333'
  },
  modalSubtitle: {
    fontSize: 14, // Reduced from 16
    color: '#666',
    marginBottom: 16, // Reduced from 20
    textAlign: 'center'
  },
  smsPreviewContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12, // Reduced from 16
    borderRadius: 8, // Reduced from 12
    marginBottom: 16, // Reduced from 20
    borderWidth: 1,
    borderColor: '#eee'
  },
  smsPreviewText: {
    fontSize: 13, // Reduced from 14
    color: '#333',
    lineHeight: 18 // Reduced from 20
  },
  sendButton: {
    backgroundColor: '#9061F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12, // Reduced from 14
    borderRadius: 8, // Reduced from 10
    marginBottom: 10 // Reduced from 12
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6, // Reduced from 8
    fontSize: 14 // Reduced from 16
  },
  skipButton: {
    padding: 10, // Reduced from 12
    alignItems: 'center'
  },
  skipButtonText: {
    color: '#666',
    fontSize: 13 // Reduced from 14
  },
  // Country Code Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  countryCodeModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16, // Reduced from 20
    borderTopRightRadius: 16, // Reduced from 20
    maxHeight: '60%' // Reduced from 70%
  },
  countryCodeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12, // Reduced from 16
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  countryCodeModalTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: 'bold',
    color: '#333'
  },
  countryCodeList: {
    paddingBottom: 16 // Reduced from 20
  },
  countryCodeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12, // Reduced from 16
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  countryCodeItemText: {
    fontSize: 14, // Reduced from 16
    color: '#333'
  }
});

export default AddFriendsScreen;