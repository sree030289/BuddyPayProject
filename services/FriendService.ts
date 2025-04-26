// Improved FriendService.ts with better linking between friends and groups
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';

interface FriendData {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'pending' | 'accepted' | 'blocked';
  groups?: any[];
  totalAmount?: number;
  createdAt?: Timestamp;
}

class FriendService {
  /**
   * Check if a user is already a friend by email or phone number
   * 
   * @param userPhone - Current user's phone number
   * @param friendEmail - Friend's email to check
   * @param friendPhone - Friend's phone to check
   * @returns Promise<{exists: boolean, friendData?: any}> - Whether the friend exists and friend data if found
   */
  async checkFriendExists(
    userPhone: string, 
    friendEmail?: string, 
    friendPhone?: string
  ): Promise<{exists: boolean, friendData?: any}> {
    if (!userPhone || (!friendEmail && !friendPhone)) {
      throw new Error('Either friend email or phone is required');
    }

    try {
      const friendsRef = collection(db, 'users', userPhone, 'friends');
      
      // First check - if the friend is in our friends collection
      if (friendEmail) {
        const emailQuery = query(friendsRef, where('email', '==', friendEmail));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          const friendData = { id: emailSnapshot.docs[0].id, ...emailSnapshot.docs[0].data() };
          return { exists: true, friendData };
        }
      }
      
      if (friendPhone) {
        const phoneQuery = query(friendsRef, where('phone', '==', friendPhone));
        const phoneSnapshot = await getDocs(phoneQuery);
        
        if (!phoneSnapshot.empty) {
          const friendData = { id: phoneSnapshot.docs[0].id, ...phoneSnapshot.docs[0].data() };
          return { exists: true, friendData };
        }
      }
      
      // If we didn't find the friend by direct lookup
      // Try to see if the user exists in the system
      if (friendEmail) {
        const userQuery = query(collection(db, 'users'), where('email', '==', friendEmail));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          // User exists but is not a friend yet
          const userData = userSnapshot.docs[0].data();
          return { exists: false, friendData: userData };
        }
      }
      
      if (friendPhone) {
        const userQuery = query(collection(db, 'users'), where('phone', '==', friendPhone));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          // User exists but is not a friend yet
          const userData = userSnapshot.docs[0].data();
          return { exists: false, friendData: userData };
        }
      }
      
      // Friend doesn't exist at all
      return { exists: false };
    } catch (error) {
      console.error('Error checking if friend exists:', error);
      throw error;
    }
  }

  /**
   * Add a new friend
   * 
   * @param userPhone - Current user's phone number
   * @param friendData - Friend data to add
   * @returns Promise<string> - ID of the added friend
   */
  async addFriend(userPhone: string, friendData: FriendData): Promise<string> {
    if (!userPhone) {
      throw new Error('User phone is required');
    }
    
    try {
      // First check if this friend already exists
      const { exists } = await this.checkFriendExists(
        userPhone, 
        friendData.email, 
        friendData.phone
      );
      
      if (exists) {
        throw new Error('This person is already in your friends list');
      }
      
      // Add the friend to the user's friends collection
      const friendsRef = collection(db, 'users', userPhone, 'friends');
      const newFriendRef = await addDoc(friendsRef, {
        ...friendData,
        createdAt: serverTimestamp(),
        groups: friendData.groups || []
      });
      
      // If the friend has a phone number, add the current user to their friends list
      if (friendData.phone) {
        try {
          // Get current user's data
          const userQuery = query(collection(db, 'users'), where('phone', '==', userPhone));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            
            // Add current user to friend's friends collection with pending status
            const friendFriendsRef = collection(db, 'users', friendData.phone, 'friends');
            await addDoc(friendFriendsRef, {
              name: userData.displayName || userData.name || 'User',
              email: userData.email,
              phone: userPhone,
              status: 'pending', // Friend needs to accept
              createdAt: serverTimestamp(),
              groups: [] // Initialize with empty groups array
            });
          }
        } catch (err) {
          console.warn('Friend might not be a registered user yet:', err);
          // Continue anyway, as the friend might not be registered yet
        }
      }
      
      return newFriendRef.id;
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }
  
  /**
   * Accept a friend request
   * 
   * @param userPhone - Current user's phone number
   * @param friendId - ID of the friend to accept
   */
  async acceptFriendRequest(userPhone: string, friendId: string): Promise<void> {
    if (!userPhone || !friendId) {
      throw new Error('User phone and friend ID are required');
    }
    
    try {
      // Update the friend's status to 'accepted'
      const friendRef = doc(db, 'users', userPhone, 'friends', friendId);
      await updateDoc(friendRef, {
        status: 'accepted'
      });
      
      // Also find the user in the friend's friends collection and update status
      const friendDoc = await getDoc(friendRef);
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        
        if (friendData.phone) {
          // Find current user in friend's collection
          const friendFriendsRef = collection(db, 'users', friendData.phone, 'friends');
          const userQuery = query(friendFriendsRef, where('phone', '==', userPhone));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userFriendDoc = userSnapshot.docs[0];
            await updateDoc(doc(db, 'users', friendData.phone, 'friends', userFriendDoc.id), {
              status: 'accepted'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }
  
  /**
   * Block a friend
   * 
   * @param userPhone - Current user's phone number
   * @param friendId - ID of the friend to block
   */
  async blockFriend(userPhone: string, friendId: string): Promise<void> {
    if (!userPhone || !friendId) {
      throw new Error('User phone and friend ID are required');
    }
    
    try {
      // Update the friend's status to 'blocked'
      const friendRef = doc(db, 'users', userPhone, 'friends', friendId);
      await updateDoc(friendRef, {
        status: 'blocked'
      });
    } catch (error) {
      console.error('Error blocking friend:', error);
      throw error;
    }
  }
  
  /**
   * Remove a friend and properly clean up all references
   * 
   * @param userPhone - Current user's phone number
   * @param friendId - ID of the friend to remove
   */
  async removeFriend(userPhone: string, friendId: string): Promise<void> {
    if (!userPhone || !friendId) {
      throw new Error('User phone and friend ID are required');
    }
    
    try {
      // Start a batch for atomic operations
      const batch = writeBatch(db);
      
      // Get friend data before removing
      const friendRef = doc(db, 'users', userPhone, 'friends', friendId);
      const friendDoc = await getDoc(friendRef);
      
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        
        // Check if we share any groups with this friend
        if (friendData.groups && friendData.groups.length > 0) {
          throw new Error('You share groups with this friend. Remove them from shared groups first.');
        }
        
        // Delete friend from user's collection
        batch.delete(friendRef);
        
        // Also delete user from friend's collection if possible
        if (friendData.phone) {
          try {
            const friendFriendsRef = collection(db, 'users', friendData.phone, 'friends');
            const userQuery = query(friendFriendsRef, where('phone', '==', userPhone));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              batch.delete(doc(db, 'users', friendData.phone, 'friends', userSnapshot.docs[0].id));
            }
          } catch (err) {
            console.warn('Could not remove user from friend\'s list:', err);
            // Continue with our own deletion anyway
          }
        }
        
        // Commit all the batch operations
        await batch.commit();
      } else {
        throw new Error('Friend not found');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  }
  
  /**
   * Get all friends for a user
   * 
   * @param userPhone - Current user's phone number
   * @param status - Optional status filter ('accepted', 'pending', 'blocked')
   * @returns Promise<FriendData[]> - List of friends
   */
  // Modified FriendService function
async getFriends(userId: string, status?: string): Promise<FriendData[]> {
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  try {
    // Query by UID instead of phone
    const friendsRef = collection(db, 'users', userId, 'friends');
    let friendsQueryRef;
    
    if (status) {
      friendsQueryRef = query(friendsRef, where('status', '==', status));
    } else {
      friendsQueryRef = friendsRef;
    }
    
    const friendsSnapshot = await getDocs(friendsQueryRef);
    
    return friendsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FriendData[];
  } catch (error) {
    console.error('Error getting friends:', error);
    throw error;
  }
}
  
  /**
   * Add a group to a friend's list of shared groups, updating both sides of the relationship
   * 
   * @param userPhone - Current user's phone
   * @param friendPhone - Friend's phone
   * @param groupData - Group data to add to the relationship
   */
  async addGroupToFriendRelationship(
    userPhone: string, 
    friendPhone: string, 
    groupData: { id: string, name: string, image?: string }
  ): Promise<void> {
    if (!userPhone || !friendPhone) {
      throw new Error('Both user phone and friend phone are required');
    }
    
    try {
      // First, find the friend in the user's friends collection
      const userFriendsRef = collection(db, 'users', userPhone, 'friends');
      const friendQuery = query(userFriendsRef, where('phone', '==', friendPhone));
      const friendSnapshot = await getDocs(friendQuery);
      
      if (friendSnapshot.empty) {
        // Friend not found in user's list - we'll create a new friend entry
        console.log('Friend not in user\'s list, creating new entry');
        
        // Find the friend's user record to get their name
        const friendUserQuery = query(collection(db, 'users'), where('phone', '==', friendPhone));
        const friendUserSnapshot = await getDocs(friendUserQuery);
        
        let friendName = 'Unknown User';
        if (!friendUserSnapshot.empty) {
          const friendUserData = friendUserSnapshot.docs[0].data();
          friendName = friendUserData.displayName || friendUserData.name || 'Unknown User';
        }
        
        // Add as a new friend with the shared group
        await addDoc(userFriendsRef, {
          name: friendName,
          phone: friendPhone,
          status: 'pending',
          createdAt: serverTimestamp(),
          groups: [groupData]
        });
      } else {
        // Friend exists, update their groups list
        const friendDoc = friendSnapshot.docs[0];
        const friendData = friendDoc.data();
        
        // Get current groups array or initialize empty array
        const currentGroups = friendData.groups || [];
        
        // Check if group is already in the list
        const groupExists = currentGroups.some((g: any) => g.id === groupData.id);
        
        if (!groupExists) {
          // Add the new group to the list
          await updateDoc(doc(userFriendsRef, friendDoc.id), {
            groups: [...currentGroups, groupData]
          });
        }
      }
      
      // Now do the same for the friend's side - add the current user to their friends with shared group
      try {
        // Find the current user in the friend's friends collection
        const friendFriendsRef = collection(db, 'users', friendPhone, 'friends');
        const userQuery = query(friendFriendsRef, where('phone', '==', userPhone));
        const userSnapshot = await getDocs(userQuery);
        
        // Get current user data
        const userRef = query(collection(db, 'users'), where('phone', '==', userPhone));
        const userDataSnapshot = await getDocs(userRef);
        
        let userName = 'Unknown User';
        if (!userDataSnapshot.empty) {
          const userData = userDataSnapshot.docs[0].data();
          userName = userData.displayName || userData.name || 'Unknown User';
        }
        
        if (userSnapshot.empty) {
          // User not in friend's list, create new entry
          await addDoc(friendFriendsRef, {
            name: userName,
            phone: userPhone,
            status: 'pending',
            createdAt: serverTimestamp(),
            groups: [groupData]
          });
        } else {
          // User exists in friend's list, update groups
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          const currentGroups = userData.groups || [];
          
          // Check if group is already in the list
          const groupExists = currentGroups.some((g: any) => g.id === groupData.id);
          
          if (!groupExists) {
            // Add the new group to the list
            await updateDoc(doc(friendFriendsRef, userDoc.id), {
              groups: [...currentGroups, groupData]
            });
          }
        }
      } catch (err) {
        console.warn('Could not update friend\'s side of relationship:', err);
        // Continue anyway as the friend might not be a registered user yet
      }
    } catch (error) {
      console.error('Error adding group to friend relationship:', error);
      throw error;
    }
  }
  
  /**
   * Remove a group from a friend relationship, updating both sides
   * 
   * @param userPhone - Current user's phone
   * @param friendPhone - Friend's phone
   * @param groupId - ID of the group to remove
   */
  async removeGroupFromFriendRelationship(
    userPhone: string, 
    friendPhone: string, 
    groupId: string
  ): Promise<void> {
    if (!userPhone || !friendPhone || !groupId) {
      throw new Error('User phone, friend phone, and group ID are all required');
    }
    
    try {
      // First, find the friend in the user's friends collection
      const userFriendsRef = collection(db, 'users', userPhone, 'friends');
      const friendQuery = query(userFriendsRef, where('phone', '==', friendPhone));
      const friendSnapshot = await getDocs(friendQuery);
      
      if (!friendSnapshot.empty) {
        const friendDoc = friendSnapshot.docs[0];
        const friendData = friendDoc.data();
        
        // Get current groups array
        const currentGroups = friendData.groups || [];
        
        // Filter out the group to remove
        const updatedGroups = currentGroups.filter((g: any) => g.id !== groupId);
        
        // Update the document with the new groups array
        await updateDoc(doc(userFriendsRef, friendDoc.id), {
          groups: updatedGroups
        });
      }
      
      // Now update the friend's side - remove the group from their friend entry for current user
      try {
        const friendFriendsRef = collection(db, 'users', friendPhone, 'friends');
        const userQuery = query(friendFriendsRef, where('phone', '==', userPhone));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          const currentGroups = userData.groups || [];
          
          // Filter out the group to remove
          const updatedGroups = currentGroups.filter((g: any) => g.id !== groupId);
          
          // Update the document with the new groups array
          await updateDoc(doc(friendFriendsRef, userDoc.id), {
            groups: updatedGroups
          });
        }
      } catch (err) {
        console.warn('Could not update friend\'s side of relationship:', err);
        // Continue anyway as the friend might not be a registered user yet
      }
    } catch (error) {
      console.error('Error removing group from friend relationship:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const friendService = new FriendService();
export default friendService;