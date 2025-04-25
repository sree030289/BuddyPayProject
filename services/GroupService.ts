// GroupService.ts - Fixed version with proper Firebase imports and default export
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove, 
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export interface GroupMember {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  isAdmin: boolean;
  balance?: number;
}

export interface GroupData {
  id?: string;
  name: string;
  type: string;
  createdBy: string;
  createdAt: any;
  members: GroupMember[];
  totalAmount?: number;
  imageUrl?: string | null;
  simplifyDebts?: boolean;
  defaultSplit?: string;
}

export interface TransactionData {
  id?: string;
  description: string;
  amount: number;
  date: string | Date;
  paidBy: string;
  splitWith: string[];
  type: string;
}

export interface InviteLinkData {
  groupId: string;
  groupName: string;
  createdBy: string;
  createdAt: any;
  expires: Date;
  token: string;
}

class GroupService {
  // Create a new group
  async createGroup(groupData: GroupData): Promise<string> {
    try {
      // Create group in Firestore
      const groupRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdAt: serverTimestamp()
      });
      
      // Add this group to the creator's personal groups collection for quick lookup
      const creatorId = groupData.createdBy;
      const userRef = doc(db, 'users', creatorId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Get user's phone to use as the document path
        const userData = userSnap.data();
        const userPhone = userData.phone;
        
        if (userPhone) {
          // Create a reference in the user's groups subcollection
          const userGroupsCollection = collection(db, 'users', userPhone, 'groups');
          const userGroupDocRef = doc(userGroupsCollection, groupRef.id);
          
          await setDoc(userGroupDocRef, {
            id: groupRef.id,
            name: groupData.name,
            type: groupData.type,
            totalAmount: 0,
            members: groupData.members.length,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      return groupRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }
  
  // Get a single group by ID
  async getGroup(groupId: string): Promise<GroupData | null> {
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (groupDoc.exists()) {
        return { id: groupDoc.id, ...groupDoc.data() } as GroupData;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting group:', error);
      throw error;
    }
  }
  
  // Get all groups for a user
  async getUserGroups(userId: string, userEmail: string): Promise<any[]> {
    try {
      console.log(`Getting groups for user ID: ${userId}, email: ${userEmail}`);
      
      // First approach: Try to find groups by member email in groups collection
      const groupsQuery = query(
        collection(db, 'groups')
      );
      
      const groupsSnapshot = await getDocs(groupsQuery);
      
      const groups: any[] = [];
      
      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        
        // Check if the user is a member of this group
        const isUserMember = groupData.members && 
          Array.isArray(groupData.members) && 
          groupData.members.some((member: any) => 
            member.uid === userId || 
            (member.email && member.email === userEmail)
          );
        
        if (isUserMember) {
          // We found a group the user is a member of
          groups.push({
            id: groupDoc.id,
            name: groupData.name,
            type: groupData.type || 'other',
            totalAmount: groupData.totalAmount || 0,
            members: groupData.members || [],
          });
          
          console.log(`Found group: ${groupData.name} (${groupDoc.id})`);
          
          // Try to find user's phone number to ensure the group is in their collection
          try {
            const userQuery = query(collection(db, 'users'), where('email', '==', userEmail));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              const userPhone = userData.phone;
              
              if (userPhone) {
                // Check if this group is in the user's groups collection
                const userGroupDocRef = doc(db, 'users', userPhone, 'groups', groupDoc.id);
                const userGroupDoc = await getDoc(userGroupDocRef);
                
                // If not, add it
                if (!userGroupDoc.exists()) {
                  console.log(`Adding group ${groupDoc.id} to user's groups collection`);
                  
                  await setDoc(userGroupDocRef, {
                    id: groupDoc.id,
                    name: groupData.name,
                    type: groupData.type || 'other',
                    totalAmount: groupData.totalAmount || 0,
                    members: groupData.members.length,
                    updatedAt: serverTimestamp()
                  });
                }
              }
            }
          } catch (e) {
            console.error('Error syncing user groups collection:', e);
            // Continue even if this fails - we'll still return the groups found
          }
        }
      }
      
      // Now try the second approach - get groups from user's groups collection
      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', userEmail));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          const userPhone = userData.phone;
          
          if (userPhone) {
            // Get groups from user's groups collection
            const userGroupsCollection = collection(db, 'users', userPhone, 'groups');
            const userGroupsSnapshot = await getDocs(userGroupsCollection);
            
            for (const userGroupDoc of userGroupsSnapshot.docs) {
              const userGroupData = userGroupDoc.data();
              
              // Check if we've already added this group
              const existingGroup = groups.find(g => g.id === userGroupData.id);
              
              if (!existingGroup) {
                // We have a group in the user's collection that wasn't found in the first approach
                // Fetch the full group data
                const groupDoc = await getDoc(doc(db, 'groups', userGroupData.id));
                
                if (groupDoc.exists()) {
                  const groupData = groupDoc.data();
                  groups.push({
                    id: groupDoc.id,
                    name: groupData.name,
                    type: groupData.type || 'other',
                    totalAmount: groupData.totalAmount || 0,
                    members: groupData.members || [],
                  });
                  
                  console.log(`Added group from user collection: ${groupData.name} (${groupDoc.id})`);
                } else {
                  console.log(`Group ${userGroupData.id} found in user collection but doesn't exist`);
                  // Group referenced in user collection doesn't exist anymore
                  // We might want to clean this up by removing the reference
                  try {
                    await deleteDoc(doc(db, 'users', userPhone, 'groups', userGroupData.id));
                  } catch (e) {
                    console.error('Error cleaning up non-existent group reference:', e);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error getting groups from user collection:', e);
        // Continue with the groups we've found so far
      }
      
      console.log(`Total groups found: ${groups.length}`);
      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      throw error;
    }
  }
  
  // Add members to a group
  async addMembersToGroup(groupId: string, newMembers: GroupMember[]): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      let currentMembers = groupData.members || [];
      
      // Filter out already existing members by uid or email
      const uniqueNewMembers = newMembers.filter(newMember => 
        !currentMembers.some((member: any) => 
          member.uid === newMember.uid || 
          (member.email && newMember.email && member.email === newMember.email) ||
          (member.phone && newMember.phone && member.phone === newMember.phone)
        )
      );
      
      if (uniqueNewMembers.length === 0) {
        return; // No new members to add
      }
      
      // Add new members to the group
      await updateDoc(groupRef, {
        members: [...currentMembers, ...uniqueNewMembers]
      });
      
      // For each new member, add this group to their groups collection
      for (const member of uniqueNewMembers) {
        if (member.email) {
          // Try to find user by email
          const userQuery = query(collection(db, 'users'), where('email', '==', member.email));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userPhone = userData.phone;
            
            if (userPhone) {
              // Add group to user's group collection
              const userGroupsCollection = collection(db, 'users', userPhone, 'groups');
              const userGroupDocRef = doc(userGroupsCollection, groupId);
              
              await setDoc(userGroupDocRef, {
                id: groupId,
                name: groupData.name,
                type: groupData.type || 'other',
                totalAmount: 0,
                members: currentMembers.length + uniqueNewMembers.length,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error adding members to group:', error);
      throw error;
    }
  }
  
  // Remove a member from a group
  async removeMemberFromGroup(groupId: string, memberUid: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      const members = groupData.members || [];
      
      // Find the member to remove
      const memberToRemove = members.find((m: any) => m.uid === memberUid);
      
      if (!memberToRemove) {
        throw new Error('Member not found in group');
      }
      
      // Check if member has outstanding balances
      const memberBalance = memberToRemove.balance || 0;
      if (Math.abs(memberBalance) > 0) {
        throw new Error('Member has outstanding balances');
      }
      
      // Remove the member from the group
      const updatedMembers = members.filter((m: any) => m.uid !== memberUid);
      
      await updateDoc(groupRef, {
        members: updatedMembers
      });
      
      // Remove this group from the member's groups collection
      if (memberToRemove.email) {
        const userQuery = query(collection(db, 'users'), where('email', '==', memberToRemove.email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          const userPhone = userData.phone;
          
          if (userPhone) {
            // Remove group from user's groups collection
            const userGroupRef = doc(db, 'users', userPhone, 'groups', groupId);
            await deleteDoc(userGroupRef);
          }
        }
      }
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }
  
  // Delete a group
  async deleteGroup(groupId: string): Promise<void> {
    try {
      // Get group data first to find all members
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const members = groupData.members || [];
        
        // Remove this group from each member's groups collection
        for (const member of members) {
          if (member.email) {
            const userQuery = query(collection(db, 'users'), where('email', '==', member.email));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              const userPhone = userData.phone;
              
              if (userPhone) {
                try {
                  const userGroupRef = doc(db, 'users', userPhone, 'groups', groupId);
                  await deleteDoc(userGroupRef);
                } catch (e) {
                  console.error('Error removing group from user collection:', e);
                  // Continue with deletion even if this fails
                }
              }
            }
          }
        }
        
        // Delete all transactions
        const transactionsRef = collection(db, 'groups', groupId, 'transactions');
        const transactionsSnap = await getDocs(transactionsRef);
        
        for (const docSnap of transactionsSnap.docs) {
          await deleteDoc(doc(db, 'groups', groupId, 'transactions', docSnap.id));
        }
        
        // Delete all group invites
        const invitesRef = collection(db, 'groupInvites');
        const invitesQuery = query(invitesRef, where('groupId', '==', groupId));
        const invitesSnap = await getDocs(invitesQuery);
        
        for (const docSnap of invitesSnap.docs) {
          await deleteDoc(doc(db, 'groupInvites', docSnap.id));
        }
        
        // Finally delete the group itself
        await deleteDoc(groupRef);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }
  
  // Update group settings
  async updateGroupSettings(groupId: string, settings: Partial<GroupData>): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, settings);
    } catch (error) {
      console.error('Error updating group settings:', error);
      throw error;
    }
  }
  
  // Make a user an admin
  async makeUserAdmin(groupId: string, userUid: string, isAdmin: boolean = true): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      const members = groupData.members || [];
      
      // Find the member and update admin status
      const updatedMembers = members.map((member: any) => {
        if (member.uid === userUid) {
          return { ...member, isAdmin };
        }
        return member;
      });
      
      await updateDoc(groupRef, {
        members: updatedMembers
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  }
  
  // Create an invite link for a group
  async createGroupInviteLink(groupId: string, creatorUid: string): Promise<string> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      
      // Generate a unique token
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Set expiration to 7 days from now
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      // Create invite record
      const inviteData: InviteLinkData = {
        groupId,
        groupName: groupData.name,
        createdBy: creatorUid,
        createdAt: serverTimestamp(),
        expires,
        token
      };
      
      await addDoc(collection(db, 'groupInvites'), inviteData);
      
      // Return the invite token that can be used in a URL
      return token;
    } catch (error) {
      console.error('Error creating group invite:', error);
      throw error;
    }
  }
  
  // Join a group using an invite token
  async joinGroupWithToken(token: string, userData: GroupMember): Promise<string> {
    try {
      // Find the invite by token
      const invitesRef = collection(db, 'groupInvites');
      const invitesQuery = query(invitesRef, where('token', '==', token));
      const invitesSnap = await getDocs(invitesQuery);
      
      if (invitesSnap.empty) {
        throw new Error('Invalid or expired invite link');
      }
      
      const inviteData = invitesSnap.docs[0].data() as InviteLinkData;
      
      // Check if invite has expired
      const now = new Date();
      const expiryDate = new Date(inviteData.expires);
      
      if (now > expiryDate) {
        throw new Error('Invite link has expired');
      }
      
      // Get the group
      const groupId = inviteData.groupId;
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupSnap.exists()) {
        throw new Error('Group no longer exists');
      }
      
      // Add the user to the group
      await this.addMembersToGroup(groupId, [userData]);
      
      return groupId;
    } catch (error) {
      console.error('Error joining group with token:', error);
      throw error;
    }
  }
  
  // Generate QR code data for a group invite
  generateQRCodeData(token: string): string {
    // Generate a deep link URL or app-specific URL that can be used to join the group
    // This could be a website URL or a custom URL scheme for your app
    return `buddypay://join-group?token=${token}`;
  }
  
  // Send invitation via Firebase Cloud Messaging
  async sendGroupInviteMessage(
    groupId: string, 
    inviterName: string, 
    token: string, 
    recipientPhone: string
  ): Promise<boolean> {
    try {
      // First check if recipient is already registered with the app
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('phone', '==', recipientPhone));
      const userSnap = await getDocs(userQuery);
      
      if (userSnap.empty) {
        // User not registered, will need to send SMS instead (handled in UI)
        return false;
      }
      
      // User exists, get their FCM token
      const userData = userSnap.docs[0].data();
      const fcmToken = userData.fcmToken;
      
      if (!fcmToken) {
        // No FCM token found, cannot send notification
        return false;
      }
      
      // Get group info
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      
      // Create invitation record
      const invitationRef = collection(db, 'notifications');
      await addDoc(invitationRef, {
        type: 'GROUP_INVITE',
        recipientPhone,
        groupId,
        groupName: groupData.name,
        inviterName,
        token,
        status: 'SENT',
        createdAt: serverTimestamp(),
        read: false
      });
      
      // At this point, your server would send the FCM message
      // But since we're mocking this, we'll just return true
      // In a real implementation, you would call a Cloud Function or server endpoint here
      
      return true;
    } catch (error) {
      console.error('Error sending group invite message:', error);
      throw error;
    }
  }
  
  // Get a list of a user's incoming invitations
  async getUserInvitations(userPhone: string): Promise<any[]> {
    try {
      const notifsRef = collection(db, 'notifications');
      const inviteQuery = query(
        notifsRef, 
        where('recipientPhone', '==', userPhone),
        where('type', '==', 'GROUP_INVITE'),
        where('status', '==', 'SENT')
      );
      
      const notifsSnap = await getDocs(inviteQuery);
      
      return notifsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user invitations:', error);
      throw error;
    }
  }
  
  // Get all members of a group
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      return groupData.members || [];
    } catch (error) {
      console.error('Error getting group members:', error);
      throw error;
    }
  }
  
  // Check if a user has outstanding balances in a group
  async hasOutstandingBalances(groupId: string, userUid: string): Promise<boolean> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      const members = groupData.members || [];
      
      const member = members.find((m: any) => m.uid === userUid);
      
      if (!member) {
        return false; // Not a member, no balances
      }
      
      return Math.abs(member.balance || 0) > 0;
    } catch (error) {
      console.error('Error checking outstanding balances:', error);
      throw error;
    }
  }
}

// Export an instance of the service as the default export
const groupService = new GroupService();
export default groupService;