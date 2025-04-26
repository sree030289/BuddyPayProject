// Updated GroupService.ts with automatic friend request creation
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
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import FriendService from './FriendService';

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

  // Add members to a group and establish friend relationships
  async addMembersToGroup(groupId: string, newMembers: GroupMember[], currentUser: any): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupSnap.data();
      let currentMembers = groupData.members || [];
      
      // Find current user's phone number
      const currentUserQuery = query(collection(db, 'users'), where('email', '==', currentUser.email));
      const currentUserSnapshot = await getDocs(currentUserQuery);
      
      let currentUserPhone = '';
      let currentUserName = currentUser.displayName || 'User';
      if (!currentUserSnapshot.empty) {
        const userData = currentUserSnapshot.docs[0].data();
        currentUserPhone = userData.phone || '';
        currentUserName = userData.displayName || userData.name || currentUserName;
      }
      
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
      
      // Send friend requests and add to groups for new members
      for (const newMember of uniqueNewMembers) {
        // Try to find the new member's phone or email
        let newMemberPhone = newMember.phone;
        let newMemberEmail = newMember.email;
        
        if (!newMemberPhone && newMemberEmail) {
          // Find phone by email if not provided
          const memberQuery = query(collection(db, 'users'), where('email', '==', newMemberEmail));
          const memberSnapshot = await getDocs(memberQuery);
          
          if (!memberSnapshot.empty) {
            const memberData = memberSnapshot.docs[0].data();
            newMemberPhone = memberData.phone;
          }
        }
        
        // Send friend request if possible
        if (currentUserPhone && (newMemberPhone || newMemberEmail)) {
          try {
            // Check if friendship already exists
            const { exists } = await FriendService.checkFriendExists(
              currentUserPhone,
              newMemberEmail,
              newMemberPhone
            );
            
            if (!exists) {
              // Add as friend with pending status
              await FriendService.addFriend(currentUserPhone, {
                name: newMember.name,
                phone: newMemberPhone,
                email: newMemberEmail,
                status: 'pending', // Initial status is pending
                groups: [{
                  id: groupId,
                  name: groupData.name,
                  type: groupData.type || 'other'
                }],
                totalAmount: 0
              });
              
              console.log(`Friend request sent to ${newMember.name}`);
            } else {
              // Update existing friend relationship to include this group
              await FriendService.addGroupToFriendRelationship(
                currentUserPhone,
                newMemberPhone || '',
                {
                  id: groupId,
                  name: groupData.name,
                  image: groupData.imageUrl || undefined
                }
              );
              
              console.log(`Group added to existing friendship with ${newMember.name}`);
            }
          } catch (error) {
            console.warn('Could not establish friendship:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error adding members to group:', error);
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
          groups.push({
            id: groupDoc.id,
            name: groupData.name,
            type: groupData.type || 'other',
            totalAmount: groupData.totalAmount || 0,
            members: groupData.members || [],
          });
        }
      }
      
      console.log(`Total groups found: ${groups.length}`);
      return groups;
    } catch (error) {
      console.error('Error getting user groups:', error);
      throw error;
    }
  }
  
  // Create a group invite link with token
  async createGroupInviteLink(groupId: string, creatorId: string): Promise<string> {
    try {
      // Get group details
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupDoc.data();
      
      // Create expiration date - 7 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      
      // Generate a token (in a real app, use a secure method)
      const token = `group_${groupId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Store the invite link
      const inviteData: InviteLinkData = {
        groupId,
        groupName: groupData.name,
        createdBy: creatorId,
        createdAt: serverTimestamp(),
        expires: expiryDate,
        token
      };
      
      await addDoc(collection(db, 'groupInvites'), inviteData);
      
      return token;
    } catch (error) {
      console.error('Error creating group invite link:', error);
      throw error;
    }
  }
  
  // Check if a user has outstanding balances in a group
  async hasOutstandingBalances(groupId: string, userId: string): Promise<boolean> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }
      
      const groupData = groupDoc.data();
      
      // Check if the user has any balance in the group members array
      if (groupData.members && Array.isArray(groupData.members)) {
        const member = groupData.members.find((m: any) => m.uid === userId);
        
        if (member && member.balance) {
          return Math.abs(member.balance) > 0;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking balances:', error);
      throw error;
    }
  }
  
  // Make a user an admin for a group
  async makeUserAdmin(groupId: string, userId: string, isAdmin: boolean): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      
      await runTransaction(db, async (transaction) => {
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) {
          throw new Error('Group not found');
        }
        
        const groupData = groupDoc.data();
        const members = groupData.members || [];
        
        // Find and update the member's admin status
        const updatedMembers = members.map((member: any) => {
          if (member.uid === userId) {
            return { ...member, isAdmin };
          }
          return member;
        });
        
        transaction.update(groupRef, { members: updatedMembers });
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  }
  
  // Remove a member from a group
  async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      
      // First check for balances
      const hasBalances = await this.hasOutstandingBalances(groupId, userId);
      if (hasBalances) {
        throw new Error('Cannot remove member with outstanding balances');
      }
      
      await runTransaction(db, async (transaction) => {
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) {
          throw new Error('Group not found');
        }
        
        const groupData = groupDoc.data();
        const members = groupData.members || [];
        
        // Filter out the member to remove
        const updatedMembers = members.filter((member: any) => member.uid !== userId);
        
        // Check if we're removing the last member
        if (updatedMembers.length === 0) {
          // If it's the last member, delete the group
          transaction.delete(groupRef);
        } else {
          // Otherwise just update the members array
          transaction.update(groupRef, { members: updatedMembers });
        }
      });
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  }
  
  // Delete an entire group
  async deleteGroup(groupId: string): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }
      
      // Check if any member has outstanding balances
      const groupData = groupDoc.data();
      const members = groupData.members || [];
      
      for (const member of members) {
        if (member.balance && Math.abs(member.balance) > 0) {
          throw new Error('Cannot delete group with outstanding balances');
        }
      }
      
      // Use a batch to delete the group and related data
      const batch = writeBatch(db);
      
      // Delete the group document
      batch.delete(groupRef);
      
      // Delete group invites
      const invitesQuery = query(collection(db, 'groupInvites'), where('groupId', '==', groupId));
      const invitesSnapshot = await getDocs(invitesQuery);
      
      invitesSnapshot.forEach((inviteDoc) => {
        batch.delete(doc(db, 'groupInvites', inviteDoc.id));
      });
      
      // Delete transactions subcollection if it exists
      const transactionsQuery = collection(db, 'groups', groupId, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      transactionsSnapshot.forEach((transactionDoc) => {
        batch.delete(doc(db, 'groups', groupId, 'transactions', transactionDoc.id));
      });
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  }
  
  // Update group settings
  async updateGroupSettings(groupId: string, settings: any): Promise<void> {
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, settings);
    } catch (error) {
      console.error('Error updating group settings:', error);
      throw error;
    }
  }

  // Method to check and handle friend relationships when creating a group
  async handleGroupFriendRelationships(
    groupId: string, 
    currentUserPhone: string, 
    members: GroupMember[], 
    groupName: string
  ): Promise<void> {
    try {
      // Iterate through members and establish friend relationships
      for (const member of members) {
        if (member.phone && member.phone !== currentUserPhone) {
          try {
            // First check if they're already friends
            const { exists } = await FriendService.checkFriendExists(
              currentUserPhone,
              member.email,
              member.phone
            );
            
            if (!exists) {
              // If not friends, add them with pending status
              await FriendService.addFriend(currentUserPhone, {
                name: member.name,
                phone: member.phone,
                email: member.email,
                status: 'pending',
                groups: [{
                  id: groupId,
                  name: groupName
                }],
                totalAmount: 0
              });
            } else {
              // If already friends, just add the group to the relationship
              await FriendService.addGroupToFriendRelationship(
                currentUserPhone,
                member.phone,
                {
                  id: groupId,
                  name: groupName
                }
              );
            }
          } catch (error) {
            console.warn(`Error adding group to friend relationship:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error handling group friend relationships:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const groupService = new GroupService();
export default groupService;