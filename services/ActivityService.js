import ActivityService from '../services/ActivityService';
import { Platform } from 'react-native'; // Add this import

/**
 * Comprehensive logger for all user activities in the app
 */

/**
 * Log group management activities
 */
export const logGroupActivity = async (
  actionType: 'create' | 'delete' | 'leave' | 'add_member' | 'remove_member' | 'make_admin' | 'remove_admin',
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  targetId?: string,
  targetName?: string
) => {
  try {
    console.log(`Logging group activity: ${actionType} for group ${groupName} (${groupId})`);
    
    switch (actionType) {
      case 'create':
        return await ActivityService.logGroupCreated(userId, userName, groupId, groupName);
        
      case 'delete':
        return await ActivityService.logGroupDeleted(userId, userName, groupId, groupName);
        
      case 'leave':
        return await ActivityService.logGroupLeft(userId, userName, groupId, groupName);
        
      case 'add_member':
        if (targetId && targetName) {
          return await ActivityService.logMemberAdded(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        console.error('Missing target info for add_member activity');
        break;
        
      case 'remove_member':
        if (targetId && targetName) {
          return await ActivityService.logMemberRemoved(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        console.error('Missing target info for remove_member activity');
        break;
        
      case 'make_admin':
        if (targetId && targetName) {
          return await ActivityService.logMemberPromoted(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        console.error('Missing target info for make_admin activity');
        break;
      case 'remove_admin':
        if (targetId && targetName) {
            return await ActivityService.logMemberPromoted(
            userId, userName, groupId, groupName, targetId, targetName
            );
        }
        console.error('Missing target info for make_admin activity');
        break;
      default:
        console.warn(`Unknown group action type: ${actionType}`);
    }
  } catch (error) {
    console.error(`Error logging group activity (${actionType}):`, error);
    return null;
  }
};

/**
 * Log friend management activities
 */
export const logFriendActivity = async (
  actionType: 'add' | 'remove',
  userId: string,
  userName: string,
  friendId: string,
  friendName: string
) => {
  try {
    console.log(`Logging friend activity: ${actionType} for friend ${friendName} (${friendId})`);
    
    switch (actionType) {
      case 'add':
        return await ActivityService.logFriendAdded(userId, userName, friendId, friendName);
        
      case 'remove':
        return await ActivityService.logFriendRemoved(userId, userName, friendId, friendName);
        
      default:
        console.warn(`Unknown friend action type: ${actionType}`);
    }
  } catch (error) {
    console.error(`Error logging friend activity (${actionType}):`, error);
    return null;
  }
};

/**
 * Log expense activities
 */
export const logExpenseActivity = async (
  userId: string,
  userName: string,
  targetId: string, // Either groupId or friendId
  targetName: string,
  expenseId: string | null,
  description: string,
  amount: number
) => {
  try {
    console.log(`Logging expense activity for ${targetName} (${targetId}): ${description} - $${amount}`);
    
    return await ActivityService.logExpenseAdded(
      userId,
      userName,
      targetId,
      targetName,
      expenseId,
      description,
      amount
    );
  } catch (error) {
    console.error('Error logging expense activity:', error);
    return null;
  }
};

/**
 * Log settlement activities
 */
export const logSettlementActivity = async (
  userId: string,
  userName: string,
  targetId: string,
  targetName: string,
  amount: number
) => {
  try {
    console.log(`Logging settlement activity for ${targetName} (${targetId}): $${amount}`);
    
    return await ActivityService.logSettlementCreated(
      userId,
      userName,
      targetId,
      targetName,
      amount
    );
  } catch (error) {
    console.error('Error logging settlement activity:', error);
    return null;
  }
};

// Update or add this method to properly capture member name
export const logMemberPromoted = async (
  userId,
  userName,
  groupId,
  groupName,
  targetId,
  targetName
) => {
  try {
    const activityData = {
      type: 'member_promoted',
      userId,
      userName,
      targetId: groupId,
      targetName: groupName,
      timestamp: new Date(),
      isRead: false,
      data: {
        groupId,
        groupName,
        targetId,
        targetName,
        promotedBy: userName,
        memberName: targetName // Ensure member name is included
      }
    };

    // Add to user's activity feed
    await addActivity(userId, activityData);

    // Also add to target user's feed if it's not the same person
    if (targetId !== userId) {
      const promotedActivity = {
        ...activityData,
        type: 'promoted_to_admin',
        userId: targetId,
        userName: targetName,
      };
      await addActivity(targetId, promotedActivity);
    }

    console.log(`Logged member_promoted activity for user ${userName} and target ${targetName}`);
    return true;
  } catch (error) {
    console.error('Error logging member promoted activity:', error);
    return false;
  }
};

export const logMemberDemoted = async (
  userId,
  userName,
  groupId,
  groupName,
  targetId,
  targetName
) => {
  try {
    const activityData = {
      type: 'member_demoted',
      userId,
      userName,
      targetId: groupId,
      targetName: groupName,
      timestamp: new Date(),
      isRead: false,
      data: {
        groupId,
        groupName,
        targetId,
        targetName,
        demotedBy: userName,
        memberName: targetName // Ensure member name is included
      }
    };

    // Add to user's activity feed
    await addActivity(userId, activityData);

    // Also add to target user's feed if it's not the same person
    if (targetId !== userId) {
      const demotedActivity = {
        ...activityData,
        type: 'demoted_from_admin',
        userId: targetId,
        userName: targetName,
      };
      await addActivity(targetId, demotedActivity);
    }

    console.log(`Logged member_demoted activity for user ${userName} and target ${targetName}`);
    return true;
  } catch (error) {
    console.error('Error logging member demoted activity:', error);
    return false;
  }
};