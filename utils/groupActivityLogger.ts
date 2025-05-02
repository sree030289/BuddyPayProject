import ActivityService from '../services/ActivityService';

/**
 * Utility functions for logging group member activities
 */

// Log when a user leaves a group
export const logGroupLeft = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string
) => {
  try {
    console.log(`Logging group left: ${userName} left ${groupName}`);
    await ActivityService.logGroupLeft(userId, userName, groupId, groupName);
  } catch (error) {
    console.error('Failed to log group left activity:', error);
  }
};

// Log when a member is promoted to admin
export const logMemberPromoted = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  promotedId: string,
  promotedName: string
) => {
  try {
    console.log(`Logging member promotion: ${userName} promoted ${promotedName} in ${groupName}`);
    await ActivityService.logMemberPromoted(
      userId, userName, groupId, groupName, promotedId, promotedName
    );
  } catch (error) {
    console.error('Failed to log member promotion activity:', error);
  }
};

// Log when a member is removed from a group
export const logMemberRemoved = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  removedId: string,
  removedName: string
) => {
  try {
    console.log(`Logging member removal: ${userName} removed ${removedName} from ${groupName}`);
    await ActivityService.logMemberRemoved(
      userId, userName, groupId, groupName, removedId, removedName
    );
  } catch (error) {
    console.error('Failed to log member removal activity:', error);
  }
};

// Log when a member is demoted from admin
export const logMemberDemoted = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  demotedId: string,
  demotedName: string
) => {
  try {
    console.log(`Logging member demotion: ${userName} demoted ${demotedName} in ${groupName}`);
    await ActivityService.logMemberDemoted(
      userId, userName, groupId, groupName, demotedId, demotedName
    );
  } catch (error) {
    console.error('Failed to log member demotion activity:', error);
  }
};

// Generic function to log any group-related action
export const logGroupAction = async (
  action: 'left' | 'promoted' | 'removed' | 'deleted' | 'demoted',
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  targetId?: string,
  targetName?: string
) => {
  try {
    switch (action) {
      case 'left':
        await ActivityService.logGroupLeft(userId, userName, groupId, groupName);
        break;
      case 'promoted':
        if (targetId && targetName) {
          await ActivityService.logMemberPromoted(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        break;
      case 'removed':
        if (targetId && targetName) {
          await ActivityService.logMemberRemoved(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        break;
      case 'deleted':
        await ActivityService.logGroupDeleted(userId, userName, groupId, groupName);
        break;
      case 'demoted':
        if (targetId && targetName) {
          await ActivityService.logMemberDemoted(
            userId, userName, groupId, groupName, targetId, targetName
          );
        }
        break;
      default:
        console.warn(`Unsupported group action: ${action}`);
    }
  } catch (error) {
    console.error(`Failed to log group ${action} activity:`, error);
  }
};

/**
 * Logs changes to a group member's admin status
 * @param action The action being performed (make_admin or remove_admin)
 * @param userId The ID of the user performing the action
 * @param userName The name of the user performing the action
 * @param groupId The ID of the group
 * @param groupName The name of the group
 * @param targetId The ID of the affected member
 * @param targetName The name of the affected member
 */
export const logGroupAdminChange = async (
  action: 'make_admin' | 'remove_admin',
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  targetId: string,
  targetName: string
): Promise<string | null> => {
  console.log(`Logging group admin change: ${action} for ${targetName} in ${groupName}`);
  
  try {
    if (action === 'make_admin') {
      return await ActivityService.logMemberPromoted(
        userId, userName, groupId, groupName, targetId, targetName
      );
    } else if (action === 'remove_admin') {
      return await ActivityService.logMemberDemoted(
        userId, userName, groupId, groupName, targetId, targetName
      );
    } else {
      console.error('Invalid admin change action:', action);
      return null;
    }
  } catch (error) {
    console.error(`Error logging group admin ${action}:`, error);
    return null;
  }
}

/**
 * Other group activity logging functions can go here...
 */
