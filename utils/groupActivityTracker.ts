import ActivityService from '../services/ActivityService';

/**
 * Utility functions for tracking group-related activities
 */

/**
 * Log when a group is deleted
 * @param userId - The ID of the user who deleted the group
 * @param userName - The name of the user who deleted the group
 * @param groupId - The ID of the deleted group
 * @param groupName - The name of the deleted group
 */
export const trackGroupDeleted = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string
): Promise<void> => {
  try {
    console.log(`Tracking group deletion: ${groupName} (${groupId}) by ${userName}`);
    
    // Call the ActivityService method directly to ensure it works
    const activityId = await ActivityService.logGroupDeleted(
      userId,
      userName,
      groupId,
      groupName
    );
    
    console.log(`Successfully logged group deletion activity with ID: ${activityId}`);
  } catch (error) {
    console.error('Error logging group deletion activity:', error);
  }
};

/**
 * Log when a group is left
 */
export const trackGroupLeft = async (
  userId: string,
  userName: string,
  groupId: string,
  groupName: string
): Promise<void> => {
  try {
    console.log(`Tracking group left: ${groupName} (${groupId}) by ${userName}`);
    
    const activityId = await ActivityService.logGroupLeft?.(
      userId,
      userName,
      groupId,
      groupName
    );
    
    console.log(`Successfully logged group left activity with ID: ${activityId}`);
  } catch (error) {
    console.error('Error logging group left activity:', error);
  }
};
