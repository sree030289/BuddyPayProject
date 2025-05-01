import { 
    collection,
    doc, 
    addDoc, 
    updateDoc, 
    query, 
    where, 
    getDocs, 
    serverTimestamp,
    Timestamp
  } from 'firebase/firestore';
  import { db } from './firebaseConfig';
  import { ActivityType } from '../screens/ActivityScreen';
  
  // Interface for the data required to create an activity
  interface ActivityData {
    type: ActivityType;
    data: {
      groupId?: string;
      groupName?: string;
      friendId?: string;
      friendName?: string;
      expenseId?: string;
      expenseAmount?: number;
      expenseDescription?: string;
      userId?: string;
      userName?: string;
      settledAmount?: number;
      [key: string]: any; // Allow for additional custom fields
    };
  }
  
  class ActivityService {
    // Create a new activity record for a user
    static async createActivity(userId: string, activityData: ActivityData): Promise<string | null> {
      try {
        // Check if required fields exist based on activity type
        if (!this.validateActivityData(activityData)) {
          console.error('Invalid activity data for type:', activityData.type);
          return null;
        }
        
        // Create activity document
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const activityDoc = await addDoc(activitiesRef, {
          type: activityData.type,
          data: activityData.data,
          timestamp: serverTimestamp(),
          read: false,
          createdAt: serverTimestamp()
        });
        
        return activityDoc.id;
      } catch (error) {
        console.error('Error creating activity:', error);
        return null;
      }
    }
    
    // Mark an activity as read
    static async markActivityAsRead(userId: string, activityId: string): Promise<boolean> {
      try {
        const activityRef = doc(db, 'users', userId, 'activities', activityId);
        await updateDoc(activityRef, {
          read: true,
          readAt: serverTimestamp()
        });
        
        return true;
      } catch (error) {
        console.error('Error marking activity as read:', error);
        return false;
      }
    }
    
    // Mark all activities as read
    static async markAllActivitiesAsRead(userId: string): Promise<boolean> {
      try {
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const unreadQuery = query(activitiesRef, where('read', '==', false));
        const snapshot = await getDocs(unreadQuery);
        
        const updatePromises = snapshot.docs.map(doc => 
          updateDoc(doc.ref, {
            read: true,
            readAt: serverTimestamp()
          })
        );
        
        await Promise.all(updatePromises);
        return true;
      } catch (error) {
        console.error('Error marking all activities as read:', error);
        return false;
      }
    }
    
    // Get unread activity count
    static async getUnreadCount(userId: string): Promise<number> {
      try {
        const activitiesRef = collection(db, 'users', userId, 'activities');
        const unreadQuery = query(activitiesRef, where('read', '==', false));
        const snapshot = await getDocs(unreadQuery);
        
        return snapshot.size;
      } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }
    }
    
    // Helper method to validate activity data based on type
    private static validateActivityData(activityData: ActivityData): boolean {
      const { type, data } = activityData;
      
      switch (type) {
        case ActivityType.GROUP_CREATED:
        case ActivityType.GROUP_JOINED:
        case ActivityType.GROUP_SETTINGS_CHANGED:
          return !!(data.groupId && data.groupName);
          
        case ActivityType.FRIEND_ADDED:
        case ActivityType.FRIEND_INVITED:
        case ActivityType.FRIEND_REMOVED:
          return !!(data.friendId && data.friendName);
          
        case ActivityType.EXPENSE_ADDED:
        case ActivityType.EXPENSE_EDITED:
          return !!(data.groupId && data.groupName && data.expenseId && 
                  data.expenseDescription && data.expenseAmount !== undefined);
          
        case ActivityType.EXPENSE_DELETED:
          return !!(data.groupId && data.groupName && data.expenseDescription);
          
        case ActivityType.MEMBER_ADDED:
          return !!(data.groupId && data.groupName && data.friendId && data.friendName);
          
        case ActivityType.SETTLEMENT:
          return !!(data.friendId && data.friendName && data.settledAmount);
          
        default:
          return false;
      }
    }
    
    // Create different types of activities with simplified parameters
    
    // Group created
    static async logGroupCreated(userId: string, userName: string, groupId: string, groupName: string): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.GROUP_CREATED,
        data: {
          groupId,
          groupName,
          userId,
          userName
        }
      });
    }
    
    // Friend added
    static async logFriendAdded(userId: string, userName: string, friendId: string, friendName: string): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.FRIEND_ADDED,
        data: {
          friendId,
          friendName,
          userId,
          userName
        }
      });
    }
    
    // Expense added
    static async logExpenseAdded(
      userId: string, 
      userName: string, 
      groupId: string, 
      groupName: string, 
      expenseId: string, 
      expenseDescription: string, 
      expenseAmount: number
    ): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.EXPENSE_ADDED,
        data: {
          groupId,
          groupName,
          expenseId,
          expenseDescription,
          expenseAmount,
          userId,
          userName
        }
      });
    }
    
    // Expense deleted
    static async logExpenseDeleted(
      userId: string,
      userName: string,
      groupId: string,
      groupName: string,
      expenseDescription: string
    ): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.EXPENSE_DELETED,
        data: {
          groupId,
          groupName,
          expenseDescription,
          userId,
          userName
        }
      });
    }
    
    // Expense edited
    static async logExpenseEdited(
      userId: string,
      userName: string,
      groupId: string,
      groupName: string,
      expenseId: string,
      expenseDescription: string,
      expenseAmount: number,
      previousAmount: number
    ): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.EXPENSE_EDITED,
        data: {
          groupId,
          groupName,
          expenseId,
          expenseDescription,
          expenseAmount,
          previousAmount,
          userId,
          userName
        }
      });
    }
    
    // Member added to group
    static async logMemberAdded(
      userId: string,
      userName: string,
      groupId: string,
      groupName: string,
      friendId: string,
      friendName: string
    ): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.MEMBER_ADDED,
        data: {
          groupId,
          groupName,
          friendId,
          friendName,
          userId,
          userName
        }
      });
    }
    
    // Settlement created
    static async logSettlement(
      userId: string,
      userName: string,
      friendId: string,
      friendName: string,
      settledAmount: number
    ): Promise<string | null> {
      return this.createActivity(userId, {
        type: ActivityType.SETTLEMENT,
        data: {
          friendId,
          friendName,
          settledAmount,
          userId,
          userName
        }
      });
    }
  }
  
  export default ActivityService;