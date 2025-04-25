// friendSettings.service.ts
import { 
    collection, 
    doc, 
    getDocs, 
    updateDoc, 
    arrayRemove, 
    arrayUnion, 
    query, 
    where, 
    writeBatch, 
    addDoc, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  
  export interface SharedGroup {
    id: string;
    name: string;
    icon?: string;
  }
  
  /**
   * Check if two users share any groups
   * @param userId Current user's ID
   * @param friendId Friend's ID to check
   * @returns Array of shared groups
   */
  export const checkSharedGroups = async (
    userId: string, 
    friendId: string
  ): Promise<SharedGroup[]> => {
    try {
      // Find groups where the current user is a member
      const groupsRef = collection(db, 'groups');
      const q = query(
        groupsRef,
        where('members', 'array-contains', userId)
      );
      
      const userGroupsSnapshot = await getDocs(q);
      const sharedGroups: SharedGroup[] = [];
      
      // Loop through each group and check if the friend is also a member
      userGroupsSnapshot.forEach((document) => {
        const groupData = document.data();
        if (groupData.members && groupData.members.includes(friendId)) {
          sharedGroups.push({
            id: document.id,
            name: groupData.name || 'Unnamed Group',
            icon: groupData.icon,
          });
        }
      });
      
      return sharedGroups;
    } catch (error) {
      console.error('Error checking shared groups:', error);
      throw new Error('Failed to check shared groups');
    }
  };
  
  /**
   * Remove a friend from the user's friend list
   * @param userId Current user's ID
   * @param friendId Friend ID to remove
   */
  export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
    try {
      // Check for shared groups first
      const sharedGroups = await checkSharedGroups(userId, friendId);
      if (sharedGroups.length > 0) {
        throw new Error('Cannot remove friend while you share groups');
      }
      
      const batch = writeBatch(db);
      
      // Remove friend from user's friends list
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        friends: arrayRemove(friendId)
      });
      
      // Remove user from friend's friends list
      const friendRef = doc(db, 'users', friendId);
      batch.update(friendRef, {
        friends: arrayRemove(userId)
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error removing friend:', error);
      throw error;
    }
  };
  
  /**
   * Block a user
   * @param userId Current user's ID
   * @param blockUserId User ID to block
   */
  export const blockUser = async (userId: string, blockUserId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // 1. Remove from friends list (both ways)
      const userRef = doc(db, 'users', userId);
      const blockUserRef = doc(db, 'users', blockUserId);
      
      batch.update(userRef, {
        friends: arrayRemove(blockUserId)
      });
      
      batch.update(blockUserRef, {
        friends: arrayRemove(userId)
      });
      
      // 2. Add to blocked users list
      batch.update(userRef, {
        blockedUsers: arrayUnion(blockUserId)
      });
      
      // First commit these changes
      await batch.commit();
      
      // 3. Hide expenses and notifications - these need a separate batch
      // Get all expenses where both users are participants
      const expensesRef = collection(db, 'expenses');
      const q = query(
        expensesRef,
        where('participants', 'array-contains', userId)
      );
      
      const expensesSnapshot = await getDocs(q);
      
      // For batching updates to expenses
      const expensesBatch = writeBatch(db);
      let batchCount = 0;
      
      // For each expense, add the blocked user to the hidden list
      for (const document of expensesSnapshot.docs) {
        const expenseData = document.data();
        if (expenseData.participants && expenseData.participants.includes(blockUserId)) {
          const expenseRef = doc(db, 'expenses', document.id);
          expensesBatch.update(expenseRef, {
            hiddenFor: arrayUnion(userId)
          });
          
          batchCount++;
          
          // Firebase has a limit of 500 operations per batch
          if (batchCount >= 450) {
            await expensesBatch.commit();
            batchCount = 0;
          }
        }
      }
      
      // Commit any remaining expense updates
      if (batchCount > 0) {
        await expensesBatch.commit();
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      throw error;
    }
  };
  
  /**
   * Report abuse for a user
   * @param reporterId User ID reporting the abuse
   * @param reportedUserId User ID being reported
   * @param reason Optional reason for report
   */
  export const reportAbuse = async (
    reporterId: string, 
    reportedUserId: string, 
    reason: string = 'abuse'
  ): Promise<void> => {
    try {
      const reportsRef = collection(db, 'reports');
      await addDoc(reportsRef, {
        reportedBy: reporterId,
        reportedUser: reportedUserId,
        reason: reason,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
    } catch (error) {
      console.error('Error reporting abuse:', error);
      throw error;
    }
  };