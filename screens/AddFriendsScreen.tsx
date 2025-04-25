// Fixed AddFriendsScreen.tsx with TypeScript fixes
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import {
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

// Define proper types for navigation and route
type AddFriendsRouteProp = RouteProp<RootStackParamList, 'AddFriendsScreen'>;
type Navigation = NativeStackNavigationProp<RootStackParamList>;

const AddFriendsScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<AddFriendsRouteProp>();
  
  // Get params with proper type safety
  const userId = route.params?.userId;
  const email = route.params?.email;
  const groupId = route.params?.groupId;
  const groupName = route.params?.groupName;
  
  // Determine flow type (friend or group)
  const isGroupFlow = !!groupId;

  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('AddFriendsScreen mounted with params:', route.params);
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log('Group ID:', groupId);
    console.log('Group Name:', groupName);
    console.log('Flow type:', isGroupFlow ? 'Group Flow' : 'Friend Flow');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          console.log('Contacts permission granted, loading contacts...');
          const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails]
          });
          console.log(`Loaded ${data.length} contacts`);
          setContacts(data);
        } else {
          console.log('Contacts permission denied');
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSelect = (contact: any) => {
    const exists = selected.find((c) => c.id === contact.id);
    if (exists) {
      setSelected(selected.filter((c) => c.id !== contact.id));
    } else {
      setSelected([...selected, contact]);
    }
  };

  const filteredContacts = React.useMemo(() => {
    if (!filter) return contacts;
    return contacts.filter(contact => 
      contact.name?.toLowerCase().includes(filter.toLowerCase()));
  }, [contacts, filter]);

  const navigateToVerifyContacts = () => {
    if (selected.length === 0) {
      Alert.alert('No Contacts Selected', 'Please select at least one contact to add as a friend.');
      return;
    }

    // Add selected field to all contacts to track state in VerifyContactsScreen
    const contactsWithSelectionState = selected.map(contact => ({
      ...contact,
      selected: true
    }));

    // Prepare properly typed navigation params based on flow type
    const navigationParams: any = {
      selectedContacts: contactsWithSelectionState,
      userId,
      email
    };

    // Add group-specific parameters only for group flow
    if (isGroupFlow) {
      navigationParams.groupId = groupId;
      navigationParams.groupName = groupName;
    }

    console.log('Navigating to VerifyContactsScreen with params:', navigationParams);

    navigation.navigate('VerifyContactsScreen', navigationParams);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isGroupFlow ? `Add to ${groupName}` : 'Add Friends'}
        </Text>
        <TouchableOpacity
          onPress={navigateToVerifyContacts}
          disabled={selected.length === 0}
        >
          <Text style={[styles.next, selected.length === 0 && styles.disabled]}>Next</Text>
        </TouchableOpacity>
      </View>

      <TextInput 
        placeholder="Search" 
        style={styles.search} 
        value={filter}
        onChangeText={setFilter}
      />

      {selected.length > 0 && (
        <View style={styles.selectedRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selected.map((item) => (
              <View key={item.id} style={styles.badgeWrapper}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.name?.[0]}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleSelect(item)}
                  style={styles.badgeClose}
                >
                  <Ionicons name="close-circle" size={18} color="#0A6EFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.addManual} onPress={() => setManualModalVisible(true)}>
        <Ionicons name="person-add-outline" size={24} color="#0A6EFF" />
        <Text style={{ marginLeft: 10, color: '#0A6EFF' }}>Add a new contact to BuddyPay</Text>
      </TouchableOpacity>

      {loading ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 16 }}>
          Loading contacts...
        </Text>
      ) : contacts.length === 0 && selected.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 16 }}>
          No contacts available or permission denied.
        </Text>
      ) : (
        <>
          <Text style={styles.section}>Pick from your contacts</Text>
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.contactRow} onPress={() => toggleSelect(item)}>
                <Text>{item.name}</Text>
                {selected.find((c) => c.id === item.id) && (
                  <Ionicons name="checkmark-circle" size={20} color="#0A6EFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {manualModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add New Contact</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={manualName}
              onChangeText={setManualName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Mobile or Email"
              value={manualContact}
              onChangeText={setManualContact}
              keyboardType="default"
            />
            <TouchableOpacity
              style={styles.modalAddButton}
              onPress={() => {
                if (!manualName.trim() || !manualContact.trim()) {
                  Alert.alert('Missing Info', 'Please enter both name and contact.');
                  return;
                }

                const contactValue = manualContact.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^\+?[0-9]{7,15}$/;

                let email, phone;

                if (emailRegex.test(contactValue)) {
                  email = contactValue.toLowerCase();
                } else if (phoneRegex.test(contactValue)) {
                  const defaultCode = Platform.OS === 'ios' ? '+61' : '+91';
                  phone = contactValue.startsWith('+') ? contactValue : `${defaultCode}${contactValue}`;
                } else {
                  Alert.alert('Invalid Format', 'Please enter a valid email or phone number.');
                  return;
                }

                const newContact = {
                  id: Date.now().toString(),
                  name: manualName,
                  email,
                  phoneNumbers: phone ? [{ number: phone }] : [],
                };

                setSelected([...selected, newContact]);
                setManualName('');
                setManualContact('');
                setManualModalVisible(false);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManualModalVisible(false)}>
              <Text style={{ color: '#0A6EFF', fontWeight: '600', textAlign: 'center', marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default AddFriendsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  cancel: { color: '#0A6EFF', fontSize: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  next: { color: '#0A6EFF', fontSize: 16 },
  disabled: { color: '#ccc' },
  addManual: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4
  },
  section: {
    fontWeight: '600',
    marginVertical: 10,
    color: '#333'
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1000
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '85%'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0A6EFF',
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  modalAddButton: {
    backgroundColor: '#0A6EFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  search: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6
  },
  selectedRow: {
    marginTop: 4,
    marginBottom: 12,
    height: 56, // gives room for badge + floating X
    justifyContent: 'center',
  },
  badgeClose: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 9,
  },
  badgeWrapper: {
    width: 48,
    height: 48,
    marginRight: 12,
    marginTop: 4,
    position: 'relative',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A6EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  }
});