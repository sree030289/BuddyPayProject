// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    
    if (!notification) return;

    const { tokens, title, body, data } = notification;

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        notificationId: context.params.notificationId,
      },
      tokens, // Array of FCM tokens
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      
      console.log('Successfully sent notification:', response);
      
      // Update notification status
      await snap.ref.update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      
      await snap.ref.update({
        sent: false,
        error: error.message,
      });
    }
  });

// Clean up old notifications
export const cleanupNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const batch = admin.firestore().batch();
    const oldNotifications = await admin
      .firestore()
      .collection('notifications')
      .where('createdAt', '<', thirtyDaysAgo)
      .get();

    oldNotifications.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${oldNotifications.size} old notifications`);
  });