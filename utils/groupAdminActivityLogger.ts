import ActivityService from '../services/ActivityService';

/**
 * Utility for properly handling admin role changes in groups
 */
export const logAdminRoleChange = async (
  action: 'make_admin' | 'remove_admin',
  userId: string,
  userName: string,
  groupId: string,
  groupName: string,
  targetId: string,
  targetName: string
): Promise<string | null> => {
  console.log(`ADMIN ROLE CHANGE: ${action} for ${targetName} in ${groupName} by ${userName}`);
  
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
      console.error('Invalid admin role change action:', action);
      return null;
    }
  } catch (error) {
    console.error(`Error logging ${action} activity:`, error);
    return null;
  }
};
