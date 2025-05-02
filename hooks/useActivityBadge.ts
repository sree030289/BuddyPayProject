import { useState, useEffect } from 'react';
import ActivityService from '../services/ActivityService';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export const useActivityBadge = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // First, get the initial count
    const fetchInitialCount = async () => {
      try {
        const count = await ActivityService.getUnreadCount(userId);
        console.log(`Initial unread activity count: ${count}`);
        setUnreadCount(count);
      } catch (error) {
        console.error('Error fetching initial unread count:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialCount();
    
    // Set up real-time listener for unread activities
    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCount = snapshot.docs.length;
      console.log(`Real-time unread activity count update: ${newCount}`);
      setUnreadCount(newCount);
      setLoading(false);
    }, (error) => {
      console.error('Error in activity listener:', error);
      setLoading(false);
    });
    
    // Clean up listener
    return () => unsubscribe();
  }, [userId]);
  
  return { unreadCount, loading };
};
