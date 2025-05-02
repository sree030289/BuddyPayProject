import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../components/AuthContext';
import SharedTabBar from '../components/SharedTabBar';

const AccountScreen = ({ route }: any) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isLoading, logout } = useAuth();
  
  // Modal states
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  
  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  // Using optional chaining with type assertion to safely access potential properties
  const [faceIdEnabled, setFaceIdEnabled] = useState((user as any)?.faceIdEnabled || false);
  const [notificationsEnabled, setNotificationsEnabled] = useState((user as any)?.notificationsEnabled || true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get the user's name with fallbacks
  const getUserName = () => {
    if (user?.name) return user.name;
    if (user?.displayName) return user.displayName;
    
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    return 'User';
  };
  
  const userName = getUserName();
  
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              await logout();
              navigation.replace('WelcomeScreen');
              setIsSubmitting(false);
            } catch (error) {
              setIsSubmitting(false);
              Alert.alert('Logout Error', 'An error occurred during logout');
            }
          }
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate inputs
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        setIsSubmitting(false);
        return;
      }
      
      if (!email.trim()) {
        Alert.alert('Error', 'Please enter your email');
        setIsSubmitting(false);
        return;
      }
      
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        setIsSubmitting(false);
        return;
      }
      
      if (phoneNumber && !/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/[\s-]/g, ''))) {
        Alert.alert('Error', 'Please enter a valid phone number');
        setIsSubmitting(false);
        return;
      }
      
      // Mock update profile - in a real app, you would call a service
      setTimeout(() => {
        // Success simulation
        setIsSubmitting(false);
        Alert.alert('Success', 'Profile updated successfully');
        setProfileModalVisible(false);
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate inputs
      if (!currentPassword) {
        Alert.alert('Error', 'Please enter your current password');
        setIsSubmitting(false);
        return;
      }
      
      if (!newPassword) {
        Alert.alert('Error', 'Please enter a new password');
        setIsSubmitting(false);
        return;
      }
      
      if (newPassword.length < 8) {
        Alert.alert('Error', 'New password must be at least 8 characters');
        setIsSubmitting(false);
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        setIsSubmitting(false);
        return;
      }
      
      // Mock password reset - in a real app, you would call a service
      setTimeout(() => {
        // Success simulation
        setIsSubmitting(false);
        Alert.alert('Success', 'Password reset successfully');
        
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    }
  };

  const handleResetPin = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate inputs
      if (!currentPin) {
        Alert.alert('Error', 'Please enter your current PIN');
        setIsSubmitting(false);
        return;
      }
      
      if (!newPin) {
        Alert.alert('Error', 'Please enter a new PIN');
        setIsSubmitting(false);
        return;
      }
      
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        Alert.alert('Error', 'PIN must be 4 digits');
        setIsSubmitting(false);
        return;
      }
      
      if (newPin !== confirmPin) {
        Alert.alert('Error', 'PINs do not match');
        setIsSubmitting(false);
        return;
      }
      
      // Mock PIN reset - in a real app, you would call a service
      setTimeout(() => {
        // Success simulation
        setIsSubmitting(false);
        Alert.alert('Success', 'PIN reset successfully');
        
        // Clear PIN fields
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to reset PIN. Please try again.');
    }
  };

  const handleToggleFaceId = async (value) => {
    try {
      setIsSubmitting(true);
      setFaceIdEnabled(value);
      
      // Mock update face ID settings - in a real app, you would call a service
      setTimeout(() => {
        setIsSubmitting(false);
      }, 500);
    } catch (error) {
      setIsSubmitting(false);
      setFaceIdEnabled(!value); // Revert the toggle
      Alert.alert('Error', 'Failed to update Face ID settings. Please try again.');
    }
  };

  const handleToggleNotifications = async (value) => {
    try {
      setNotificationsEnabled(value);
      
      // Mock update notification settings - in a real app, you would call a service
    } catch (error) {
      setNotificationsEnabled(!value); // Revert the toggle
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }
  };

  const handleSubmitContact = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate inputs
      if (!contactSubject.trim()) {
        Alert.alert('Error', 'Please enter a subject');
        setIsSubmitting(false);
        return;
      }
      
      if (!contactMessage.trim()) {
        Alert.alert('Error', 'Please enter a message');
        setIsSubmitting(false);
        return;
      }
      
      // Mock submit contact form - in a real app, you would call a service
      setTimeout(() => {
        // Success simulation
        setIsSubmitting(false);
        Alert.alert('Success', 'Your message has been sent');
        
        // Clear form fields
        setContactSubject('');
        setContactMessage('');
        setContactModalVisible(false);
      }, 1000);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      // Navigate to subscription screen or open a payment modal
      Alert.alert('Pro Subscription', 'Navigate to subscription screen (to be implemented)');
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription. Please try again.');
    }
  };

  // Profile Edit Modal
  const renderProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
              <Icon name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.avatarEditContainer}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.changePhotoButton}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
            
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
            
            <TouchableOpacity 
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={handleUpdateProfile}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Security Modal
  const renderSecurityModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={securityModalVisible}
      onRequestClose={() => setSecurityModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Security Settings</Text>
            <TouchableOpacity onPress={() => setSecurityModalVisible(false)}>
              <Icon name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.securityModalBody}>
            <View style={styles.securitySection}>
              <Text style={styles.securitySectionTitle}>Reset Password</Text>
              
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry
                autoCapitalize="none"
              />
              
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                autoCapitalize="none"
              />
              
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
              />
              
              <TouchableOpacity 
                style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#9061F9" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.securitySection}>
              <Text style={styles.securitySectionTitle}>Reset PIN</Text>
              
              <Text style={styles.inputLabel}>Current PIN</Text>
              <TextInput
                style={styles.input}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="Enter current PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <Text style={styles.inputLabel}>New PIN</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <Text style={styles.inputLabel}>Confirm New PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
              />
              
              <TouchableOpacity 
                style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}
                onPress={handleResetPin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#9061F9" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Reset PIN</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.securitySection}>
              <Text style={styles.securitySectionTitle}>Biometric Authentication</Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Face ID Login</Text>
                  <Text style={styles.settingDescription}>Use Face ID to login to your account</Text>
                </View>
                <Switch
                  value={faceIdEnabled}
                  onValueChange={handleToggleFaceId}
                  trackColor={{ false: "#ccc", true: "#9061F9" }}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Contact Form Modal
  const renderContactModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={contactModalVisible}
      onRequestClose={() => setContactModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact Support</Text>
            <TouchableOpacity onPress={() => setContactModalVisible(false)}>
              <Icon name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.contactText}>
              Need help or have a question? Send us a message and we'll get back to you as soon as possible.
            </Text>
            
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.input}
              value={contactSubject}
              onChangeText={setContactSubject}
              placeholder="Enter subject"
            />
            
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={contactMessage}
              onChangeText={setContactMessage}
              placeholder="Type your message here..."
              multiline
              numberOfLines={6}
            />
            
            <TouchableOpacity 
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmitContact}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Show loading state while auth data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
        <View style={[styles.screenContainer, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#9061F9" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.screenContainer}>
        <View style={styles.headerSection}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Account</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email available'}</Text>
            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => setProfileModalVisible(true)}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Account Options */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => setSecurityModalVisible(true)}
              >
                <Icon name="shield-checkmark-outline" size={20} color="#9061F9" />
                <Text style={styles.optionTitle}>Security Settings</Text>
                <Icon name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
              
              <View style={styles.optionItem}>
                <Icon name="notifications-outline" size={20} color="#9061F9" />
                <Text style={styles.optionTitle}>Notifications</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: "#ccc", true: "#9061F9" }}
                />
              </View>
            </View>
          </View>
          
          {/* Support Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.optionItem}
                onPress={() => setContactModalVisible(true)}
              >
                <Icon name="mail-outline" size={20} color="#9061F9" />
                <Text style={styles.optionTitle}>Contact Us</Text>
                <Icon name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionItem}>
                <Icon name="help-circle-outline" size={20} color="#9061F9" />
                <Text style={styles.optionTitle}>Help Center</Text>
                <Icon name="chevron-forward" size={16} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Premium Section */}
          <TouchableOpacity 
            style={styles.premiumContainer}
            onPress={handleUpgradeToPro}
          >
            <View style={styles.premiumContent}>
              <Icon name="star" size={22} color="#FFD700" />
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>Upgrade to Pro</Text>
                <Text style={styles.premiumSubtitle}>Unlock premium features</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
          
          {/* Log Out Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={isSubmitting}
              >
                <Icon name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.versionText}>BuddyPay v1.0.0</Text>
        </ScrollView>
        
        {/* Shared Tab Bar Component - will be rendered by the parent navigator */}
        {route?.params?.insideTabNavigator !== true && (
          <SharedTabBar activeTab="Profile" />
        )}
        
        {/* Modals */}
        {renderProfileModal()}
        {renderSecurityModal()}
        {renderContactModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 16 : 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 80, // Add space for bottom tab bar
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 12,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#9061F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  editProfileButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9061F9',
  },
  editProfileText: {
    color: '#9061F9',
    fontWeight: '500',
    fontSize: 13
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  optionTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#333'
  },
  premiumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    padding: 14,
    backgroundColor: '#9061F9',
    borderRadius: 12,
    shadowColor: '#9061F9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTextContainer: {
    marginLeft: 12,
  },
  premiumTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  premiumSubtitle: {
    color: '#fff',
    opacity: 0.9,
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  logoutText: {
    marginLeft: 8,
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '500'
  },
  versionText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#999',
    fontSize: 12
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333'
  },
  modalBody: {
    padding: 16,
  },
  securityModalBody: {
    padding: 16,
    paddingBottom: 40, // Extra padding at the bottom for better scrolling
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 16
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  changePhotoButton: {
    marginTop: 8
  },
  changePhotoText: {
    color: '#9061F9',
    fontWeight: '500',
    fontSize: 13
  },
  inputLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    marginTop: 12
  },
  input: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  primaryButton: {
    backgroundColor: '#9061F9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15
  },
  secondaryButton: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#9061F9'
  },
  secondaryButtonText: {
    color: '#9061F9',
    fontWeight: '600',
    fontSize: 15
  },
  disabledButton: {
    opacity: 0.6
  },
  securitySection: {
    marginBottom: 8
  },
  securitySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2
  },
  settingDescription: {
    fontSize: 12,
    color: '#888'
  },
  contactText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18
  }
});

export default AccountScreen;