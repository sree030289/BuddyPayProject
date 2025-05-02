import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import * as Crypto from 'expo-crypto';

class ActivityService {
  // Log an expense activity
  async logExpenseAdded(
    userId: string,
    userName: string,
    targetId: string, // Either groupId or friendId
    targetName: string, // Group name or friend name
    expenseId: string | null, // Optional expense ID
    description: string,
    amount: number
  ) {
    try {
      // Debug logging
      console.log("ActivityService.logExpenseAdded called with:", {
        userId, userName, targetId, targetName, expenseId, description, amount
      });

      // Validate required fields
      if (!userId || !targetId) {
        console.error("Missing required fields for activity logging:", { userId, targetId });
        return null;
      }

      // Generate a unique ID if none provided
      const activityId = expenseId || 
        await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `expense-${userId}-${targetId}-${Date.now()}`
        );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data according to expected structure
      const activityData = {
        id: activityId,
        type: 'expense_added', // Specific activity type
        userId: userId,
        userName: displayName,
        targetId: targetId,
        targetName: targetName || 'Group/Friend',
        timestamp: serverTimestamp(),
        read: false, // Mark explicitly as unread
        data: {
          description: description || 'Expense',
          amount: amount || 0
        }
      };

      console.log("Saving activity with data:", JSON.stringify(activityData));

      // Add to activities collection
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Activity logged successfully with ID:", docRef.id);
      
      // Create a special copy for group case to ensure all members see it
      if (targetId.startsWith('l') && targetId.length > 10) { // This looks like a group ID
        try {
          const groupRef = doc(db, 'groups', targetId);
          const groupDoc = await getDoc(groupRef);
          
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            
            // Try to get member IDs from group
            let memberIds: string[] = [];
            if (groupData.memberIds && Array.isArray(groupData.memberIds)) {
              memberIds = groupData.memberIds;
            } else if (groupData.members && Array.isArray(groupData.members)) {
              memberIds = groupData.members
                .map((m: any) => m.uid || m.id)
                .filter(Boolean);
            }
            
            console.log("Found group members:", memberIds);
            
            // Create activity copies for other members
            for (const memberId of memberIds) {
              // Skip creating another copy for the expense creator
              if (memberId === userId) continue;
              
              const memberActivity = {
                ...activityData,
                userId: memberId, // Set the target user
                originalCreator: userId // Keep track of who created it
              };
              
              await addDoc(collection(db, 'activities'), memberActivity);
            }
          }
        } catch (err) {
          console.error("Error creating activity copies for group members:", err);
          // Continue even if we fail to create copies
        }
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging expense activity:', error);
      return null;
    }
  }

  // Log a group creation activity
  async logGroupCreated(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string
  ) {
    try {
      // Debug logging
      console.log("ActivityService.logGroupCreated called with:", {
        userId, userName, groupId, groupName
      });

      // Validate required fields
      if (!userId || !groupId) {
        console.error("Missing required fields for group creation activity:", { userId, groupId });
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `group-create-${userId}-${groupId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data according to expected structure
      const activityData = {
        id: activityId,
        type: 'group_created',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'New Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          groupName: groupName || 'New Group'
        }
      };

      console.log("Saving group creation activity with data:", JSON.stringify(activityData));

      // Add to activities collection
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Group creation activity logged successfully with ID:", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error logging group creation activity:', error);
      return null;
    }
  }

  // Log a friend added activity
  async logFriendAdded(
    userId: string,
    userName: string,
    friendId: string,
    friendName: string
  ) {
    try {
      // Debug logging
      console.log("ActivityService.logFriendAdded called with:", {
        userId, userName, friendId, friendName
      });

      // Validate required fields
      if (!userId || !friendId) {
        console.error("Missing required fields for friend added activity:", { userId, friendId });
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `friend-added-${userId}-${friendId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data according to expected structure
      const activityData = {
        id: activityId,
        type: 'friend_added',
        userId: userId,
        userName: displayName,
        targetId: friendId,
        targetName: friendName || 'Friend',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          friendName: friendName || 'Friend'
        }
      };

      console.log("Saving friend added activity with data:", JSON.stringify(activityData));

      // Add to activities collection
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Friend added activity logged successfully with ID:", docRef.id);

      // Create a reciprocal activity for the friend (if they exist)
      try {
        // Create activity from friend's perspective
        const friendActivity = {
          id: activityId + '_reciprocal',
          type: 'friend_added',
          userId: friendId, // Friend is the user for this activity
          userName: friendName || 'Friend',
          targetId: userId,
          targetName: displayName,
          timestamp: serverTimestamp(),
          read: false,
          data: {
            friendName: displayName
          },
          originalCreator: userId // Track who initiated the friendship
        };
        
        await addDoc(collection(db, 'activities'), friendActivity);
        console.log("Created reciprocal friend activity for the other user");
      } catch (err) {
        console.error("Error creating reciprocal activity:", err);
        // Continue even if creating reciprocal activity fails
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging friend added activity:', error);
      return null;
    }
  }

  // Log when a member is added to a group
  async logMemberAdded(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    memberId: string,
    memberName: string
  ) {
    try {
      // Debug logging
      console.log("ActivityService.logMemberAdded called with:", {
        userId, userName, groupId, groupName, memberId, memberName
      });

      // Validate required fields
      if (!userId || !groupId || !memberId) {
        console.error("Missing required fields for member added activity:", { userId, groupId, memberId });
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `member-added-${userId}-${groupId}-${memberId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data according to expected structure
      const activityData = {
        id: activityId,
        type: 'member_added',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          memberId: memberId,
          memberName: memberName || 'New member'
        }
      };

      console.log("Saving member added activity with data:", JSON.stringify(activityData));

      // Add to activities collection
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Member added activity logged successfully with ID:", docRef.id);

      // Create activity for other group members
      try {
        // Get the group document to find all members
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          let memberIds: string[] = [];
          
          // Extract member IDs from the group data
          if (groupData.memberIds && Array.isArray(groupData.memberIds)) {
            memberIds = [...groupData.memberIds];
          } else if (groupData.members && Array.isArray(groupData.members)) {
            memberIds = groupData.members
              .map((m: any) => m.uid || m.id)
              .filter(Boolean);
          }
          
          // Create activity copies for all members (except the one who added and the one who was added)
          for (const gMemberId of memberIds) {
            // Skip the user who performed the action and the member who was added
            if (gMemberId === userId || gMemberId === memberId) continue;
            
            const memberActivity = {
              ...activityData,
              userId: gMemberId,
              originalCreator: userId
            };
            
            await addDoc(collection(db, 'activities'), memberActivity);
          }
          
          // Create an activity for the newly added member as well
          const newMemberActivity = {
            id: activityId + '_new_member',
            type: 'added_to_group',
            userId: memberId,
            userName: memberName || 'You',
            targetId: groupId,
            targetName: groupName || 'Group',
            timestamp: serverTimestamp(),
            read: false,
            data: {
              addedBy: displayName
            },
            originalCreator: userId
          };
          
          await addDoc(collection(db, 'activities'), newMemberActivity);
        }
      } catch (err) {
        console.error('Error creating member added activities for other members:', err);
        // Continue even if distributing the activities fails
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging member added activity:', error);
      return null;
    }
  }

  // Get activities for a user
  async getActivities(userId: string) {
    try {
      console.log(`Fetching activities for user: ${userId}`);
      
      if (!userId) {
        console.error("Missing userId for getActivities");
        return [];
      }

      const q = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} activities`);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle Firestore timestamp conversion
        let timestamp = new Date();
        if (data.timestamp) {
          if (data.timestamp instanceof Timestamp) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp.seconds) {
            // Handle server timestamp format
            timestamp = new Date(data.timestamp.seconds * 1000);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp,
          docId: doc.id // Add document ID for operations like marking as read
        };
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }

  // Get activities without requiring composite index (for when index not yet created)
  async getActivitiesWithoutIndex(userId: string) {
    try {
      console.log(`Fetching activities without index for user: ${userId}`);
      
      if (!userId) {
        console.error("Missing userId for getActivitiesWithoutIndex");
        return [];
      }

      // Simple query without orderBy to avoid needing a composite index
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} activities without index`);
      
      // Process the results and manually sort by timestamp
      const activities = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle Firestore timestamp conversion
        let timestamp = new Date();
        if (data.timestamp) {
          if (data.timestamp instanceof Timestamp) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp.seconds) {
            timestamp = new Date(data.timestamp.seconds * 1000);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp,
          docId: doc.id
        };
      });

      // Sort manually (newest first)
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Error fetching activities without index:', error);
      return [];
    }
  }

  // Alternative fetch method with no query constraints that could require indexes
  async getActivitiesNoOrder(userId: string) {
    try {
      console.log(`Fetching all activities for user: ${userId} without ordering`);
      
      if (!userId) return [];

      // Get all activities
      const allActivitiesSnapshot = await getDocs(collection(db, 'activities'));
      
      // Filter and sort in memory
      const userActivities = allActivitiesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          let timestamp = new Date();
          
          if (data.timestamp) {
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate();
            } else if (data.timestamp.seconds) {
              timestamp = new Date(data.timestamp.seconds * 1000);
            }
          }
          
          return {
            id: doc.id,
            ...data,
            timestamp,
            docId: doc.id
          };
        })
        .filter(activity => activity.userId === userId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log(`Found ${userActivities.length} filtered activities`);
      return userActivities;
    } catch (error) {
      console.error('Error in fallback activity fetch:', error);
      return [];
    }
  }

  // Get all activities for a specific group
  async getGroupActivities(groupId: string) {
    try {
      console.log(`Fetching activities for group: ${groupId}`);
      
      if (!groupId) {
        console.error("Missing groupId for getGroupActivities");
        return [];
      }

      const q = query(
        collection(db, 'activities'),
        where('targetId', '==', groupId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.docs.length} group activities`);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Handle Firestore timestamp conversion
        let timestamp = new Date();
        if (data.timestamp) {
          if (data.timestamp instanceof Timestamp) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp.seconds) {
            timestamp = new Date(data.timestamp.seconds * 1000);
          }
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp
        };
      });
    } catch (error) {
      console.error('Error fetching group activities:', error);
      return [];
    }
  }

  // Get unread activity count for a user
  async getUnreadCount(userId: string) {
    try {
      console.log(`Fetching unread activity count for user: ${userId}`);
      
      if (!userId) {
        console.error("Missing userId for getUnreadCount");
        return 0;
      }

      // Modified query to explicitly filter for unread activities
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const count = snapshot.docs.length;
      
      // Log the activity types to diagnose what's missing
      const activityTypes = snapshot.docs.map(doc => doc.data().type);
      console.log(`Unread activities (${count}) by type:`, activityTypes);
      
      return count;
    } catch (error) {
      console.error('Error fetching unread activity count:', error);
      return 0;
    }
  }

  // Mark an activity as read
  async markActivityAsRead(activityId: string) {
    try {
      console.log(`Marking activity as read: ${activityId}`);
      
      if (!activityId) {
        console.error("Missing activityId for markActivityAsRead");
        return false;
      }
      
      const activityRef = doc(db, 'activities', activityId);
      await updateDoc(activityRef, {
        read: true
      });
      
      console.log(`Activity ${activityId} marked as read`);
      return true;
    } catch (error) {
      console.error('Error marking activity as read:', error);
      return false;
    }
  }

  // Mark all activities as read for a user
  async markAllActivitiesAsRead(userId: string) {
    try {
      console.log(`Marking all activities as read for user: ${userId}`);
      
      if (!userId) {
        console.error("Missing userId for markAllActivitiesAsRead");
        return false;
      }

      // Get all unread activities for this user
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const unreadCount = snapshot.docs.length;
      console.log(`Found ${unreadCount} unread activities to mark as read`);
      
      if (unreadCount === 0) {
        console.log("No unread activities to mark as read");
        return true;
      }
      
      // Update each activity to mark as read
      const updatePromises = snapshot.docs.map(doc => {
        console.log(`Marking activity as read: ${doc.id} (${doc.data().type})`);
        return updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      console.log(`Successfully marked ${updatePromises.length} activities as read`);
      
      return true;
    } catch (error) {
      console.error('Error marking all activities as read:', error);
      return false;
    }
  }

  // Additional function to add any missing activity types
  async logSettlementCreated(
    userId: string,
    userName: string,
    targetId: string, // Either groupId or friendId
    targetName: string,
    amount: number
  ) {
    try {
      console.log("ActivityService.logSettlementCreated called with:", {
        userId, userName, targetId, targetName, amount
      });

      if (!userId || !targetId) {
        console.error("Missing required fields for settlement activity");
        return null;
      }

      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `settlement-${userId}-${targetId}-${Date.now()}`
      );

      // Get user display name if needed
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      const activityData = {
        id: activityId,
        type: 'settlement_added',
        userId: userId,
        userName: displayName,
        targetId: targetId,
        targetName: targetName || 'Group/Friend',
        timestamp: serverTimestamp(),
        read: false, // Explicitly mark as unread
        data: {
          amount: amount || 0
        }
      };

      console.log("Saving settlement activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Settlement activity logged successfully with ID:", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error logging settlement activity:', error);
      return null;
    }
  }

  // Create activity for group updates like changes to group settings
  async logGroupUpdated(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    updateType: string
  ) {
    try {
      // Debug logging
      console.log("ActivityService.logGroupUpdated called with:", {
        userId, userName, groupId, groupName, updateType
      });

      // Validate required fields
      if (!userId || !groupId) {
        console.error("Missing required fields for group update activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `group-update-${userId}-${groupId}-${updateType}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'group_updated',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false, // Explicitly mark as unread
        data: {
          updateType: updateType || 'updated'
        }
      };

      console.log("Saving group update activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Group update activity logged successfully with ID:", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error logging group update activity:', error);
      return null;
    }
  }

  // Log when a group is deleted
  async logGroupDeleted(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string
  ) {
    try {
      console.log("ActivityService.logGroupDeleted called with:", {
        userId, userName, groupId, groupName
      });

      if (!userId || !groupId) {
        console.error("Missing required fields for group deletion activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `group-deleted-${userId}-${groupId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'group_deleted',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          groupName: groupName || 'Group'
        }
      };

      console.log("Saving group deletion activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Group deletion activity logged successfully with ID:", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error logging group deletion activity:', error);
      return null;
    }
  }

  // Log when a friend is removed
  async logFriendRemoved(
    userId: string,
    userName: string,
    friendId: string,
    friendName: string
  ) {
    try {
      console.log("ActivityService.logFriendRemoved called with:", {
        userId, userName, friendId, friendName
      });

      if (!userId || !friendId) {
        console.error("Missing required fields for friend removal activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `friend-removed-${userId}-${friendId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'friend_removed',
        userId: userId,
        userName: displayName,
        targetId: friendId,
        targetName: friendName || 'Friend',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          friendName: friendName || 'Friend'
        }
      };

      console.log("Saving friend removal activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Friend removal activity logged successfully with ID:", docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error logging friend removal activity:', error);
      return null;
    }
  }

  // Log when a user leaves a group
  async logGroupLeft(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string
  ) {
    try {
      console.log("ActivityService.logGroupLeft called with:", {
        userId, userName, groupId, groupName
      });

      if (!userId || !groupId) {
        console.error("Missing required fields for group leave activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `group-left-${userId}-${groupId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'group_left',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          groupName: groupName || 'Group'
        }
      };

      console.log("Saving group left activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Group left activity logged successfully with ID:", docRef.id);

      // Also notify other group members
      try {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          let memberIds: string[] = [];
          
          if (groupData.memberIds && Array.isArray(groupData.memberIds)) {
            memberIds = [...groupData.memberIds];
          } else if (groupData.members && Array.isArray(groupData.members)) {
            memberIds = groupData.members
              .map((m: any) => m.uid || m.id)
              .filter(Boolean);
          }
          
          // Create activity for each member
          for (const memberId of memberIds) {
            // Skip the user who left
            if (memberId === userId) continue;
            
            const memberActivity = {
              ...activityData,
              userId: memberId,
              originalCreator: userId
            };
            
            await addDoc(collection(db, 'activities'), memberActivity);
          }
        }
      } catch (err) {
        console.error("Error creating notifications for other members:", err);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging group left activity:', error);
      return null;
    }
  }

  // Log when a member is promoted to admin
  async logMemberPromoted(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    promotedId: string,
    promotedName: string
  ) {
    try {
      console.log("ActivityService.logMemberPromoted called with:", {
        userId, userName, groupId, groupName, promotedId, promotedName
      });

      if (!userId || !groupId || !promotedId) {
        console.error("Missing required fields for member promotion activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `member-promoted-${userId}-${groupId}-${promotedId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'member_promoted',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          promotedId: promotedId,
          promotedName: promotedName || 'Member'
        }
      };

      console.log("Saving member promotion activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Member promotion activity logged successfully with ID:", docRef.id);

      // Create a notification for the promoted member
      try {
        const promotedActivity = {
          id: activityId + '_promoted',
          type: 'promoted_to_admin',
          userId: promotedId,
          userName: promotedName || 'You',
          targetId: groupId,
          targetName: groupName || 'Group',
          timestamp: serverTimestamp(),
          read: false,
          data: {
            promotedBy: displayName
          },
          originalCreator: userId
        };
        
        await addDoc(collection(db, 'activities'), promotedActivity);
      } catch (err) {
        console.error("Error creating notification for promoted member:", err);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging member promotion activity:', error);
      return null;
    }
  }

  // Log when a member is removed from a group
  async logMemberRemoved(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    removedId: string,
    removedName: string
  ) {
    try {
      console.log("ActivityService.logMemberRemoved called with:", {
        userId, userName, groupId, groupName, removedId, removedName
      });

      if (!userId || !groupId || !removedId) {
        console.error("Missing required fields for member removal activity");
        return null;
      }

      // Generate a unique ID
      const activityId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `member-removed-${userId}-${groupId}-${removedId}-${Date.now()}`
      );

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for activity:", err);
          displayName = 'A user';
        }
      }

      // Format the activity data
      const activityData = {
        id: activityId,
        type: 'member_removed',
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          removedId: removedId,
          removedName: removedName || 'Member'
        }
      };

      console.log("Saving member removal activity with data:", JSON.stringify(activityData));
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log("Member removal activity logged successfully with ID:", docRef.id);

      // Create a notification for the removed member
      try {
        const removedActivity = {
          id: activityId + '_removed',
          type: 'removed_from_group',
          userId: removedId,
          userName: removedName || 'You',
          targetId: groupId,
          targetName: groupName || 'Group',
          timestamp: serverTimestamp(),
          read: false,
          data: {
            removedBy: displayName
          },
          originalCreator: userId
        };
        
        await addDoc(collection(db, 'activities'), removedActivity);
      } catch (err) {
        console.error("Error creating notification for removed member:", err);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error logging member removal activity:', error);
      return null;
    }
  }

  // Completely rewritten function for member demotion to fix notification issues
  async logMemberDemoted(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    demotedId: string,
    demotedName: string
  ) {
    try {
      console.log("=== ADMIN DEMOTION: Starting demotion process ===");
      console.log(`User ${userName} (${userId}) is demoting ${demotedName} (${demotedId}) in group ${groupName}`);

      // Create a unique ID that's clearly for demotion
      const activityId = `demotion-${demotedId}-${groupId}-${Date.now()}`;
      
      // Get proper display name
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for demotion activity:", err);
          displayName = 'A user';
        }
      }

      // Create demotion activity with very explicit type markers
      const demotionActivity = {
        id: activityId,
        actionType: "ADMIN_DEMOTION",  // Additional field to clearly identify this
        activityCategory: "ADMIN_ROLE_CHANGE", // Another identification field
        type: 'member_demoted',        // The primary type identifier
        userId: userId,                // Who did the demotion
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          demotedId: demotedId,        // ID of demoted user
          demotedName: demotedName || 'Member',
          action: 'demoted',
          changeType: 'admin_removal',  // Another explicit marker
          isPromotion: false,           // Explicitly not a promotion
          isDemotion: true              // Explicitly a demotion
        }
      };

      console.log("SAVING DEMOTION ACTIVITY WITH DATA:", JSON.stringify(demotionActivity, null, 2));
      
      const docRef = await addDoc(collection(db, 'activities'), demotionActivity);
      console.log(`Successfully saved demotion activity with ID: ${docRef.id}`);

      // Create notification for the demoted user - with completely different structure
      const notificationActivity = {
        id: `${activityId}-notification`,
        actionType: "ADMIN_DEMOTION_NOTIFICATION",  // Explicit action type
        activityCategory: "ADMIN_ROLE_CHANGE",      // Same category as above
        type: 'demoted_from_admin',                 // Specific type for the recipient
        userId: demotedId,                          // Send to the demoted user
        userName: demotedName || 'You',
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          demotedBy: displayName,                   // Who demoted this user
          demoterId: userId,                        // ID of who demoted
          action: 'demoted',
          changeType: 'admin_removal',
          isPromotion: false,
          isDemotion: true,
          message: `${displayName} removed you as an admin from ${groupName || 'a group'}`
        }
      };

      console.log("SAVING DEMOTION NOTIFICATION WITH DATA:", JSON.stringify(notificationActivity, null, 2));
      
      const notifRef = await addDoc(collection(db, 'activities'), notificationActivity);
      console.log(`Successfully saved demotion notification with ID: ${notifRef.id}`);

      return docRef.id;
    } catch (error) {
      console.error('Error logging demotion activity:', error);
      return null;
    }
  }

  // Log when a member is demoted from admin status - Complete reimplemntation
  async logMemberDemoted(
    userId: string,
    userName: string,
    groupId: string,
    groupName: string,
    demotedId: string,
    demotedName: string
  ) {
    try {
      // Debug logging
      console.log("EXPLICITLY LOGGING MEMBER DEMOTION:", {
        userId, userName, groupId, groupName, demotedId, demotedName
      });

      // Generate a unique ID with DEMOTION in it to avoid any confusion
      const activityId = `DEMOTION-${demotedId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Get user display name if not provided
      let displayName = userName;
      if (!displayName || displayName === 'You') {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            displayName = userDoc.data().name || userDoc.data().displayName || 'A user';
          }
        } catch (err) {
          console.warn("Could not fetch user name for demotion activity:", err);
          displayName = 'A user';
        }
      }

      // The demotion activity for the user who performed the demotion
      const demotionActivity = {
        id: activityId,
        type: 'admin_demotion', // Use a different activity type than member_promoted
        userId: userId,
        userName: displayName,
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          demotedId: demotedId,
          demotedName: demotedName || 'Member',
          actionType: 'demotion',
          isDemotion: true
        }
      };

      console.log("SAVING EXPLICIT DEMOTION ACTIVITY:", JSON.stringify(demotionActivity, null, 2));
      
      const docRef = await addDoc(collection(db, 'activities'), demotionActivity);
      console.log(`Successfully logged demotion activity with ID: ${docRef.id}`);
      
      // Create a notification for the member being demoted - completely separate structure
      // to avoid any chance of misclassification
      const notificationId = `DEMOTION-NOTIFICATION-${demotedId}-${Date.now()}`;
      const notificationActivity = {
        id: notificationId,
        type: 'admin_role_removed', // Different type than promoted_to_admin
        userId: demotedId,
        userName: demotedName || 'You',
        targetId: groupId,
        targetName: groupName || 'Group',
        timestamp: serverTimestamp(),
        read: false,
        data: {
          removedBy: displayName,
          removedById: userId,
          actionType: 'demotion',
          isDemotion: true,
          isPromotion: false
        }
      };
      
      console.log("SAVING EXPLICIT DEMOTION NOTIFICATION:", JSON.stringify(notificationActivity, null, 2));
      
      await addDoc(collection(db, 'activities'), notificationActivity);
      console.log(`Successfully logged demotion notification with ID: ${notificationId}`);
      
      return docRef.id;
    } catch (error) {
      console.error('Error logging explicit demotion activity:', error);
      return null;
    }
  }
}

export default new ActivityService();