import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useOnlineStatus(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOffline, setIsOffline] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]); // Initialize onlineUsers state
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOffline(false);
      if (userId) {
        updateUserStatus(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsOffline(true);
      toast({
        title: "Connection Lost",
        description: "We're having trouble connecting to the server. Reconnecting...",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up presence system and active users count
    let unsubscribeOnlineUsers: () => void | undefined;

    if (userId) {
      updateUserStatus(true);

      const onlineUsersQuery = query(collection(db, 'users'), where('available', '==', true));
      unsubscribeOnlineUsers = onSnapshot(onlineUsersQuery, (snapshot) => {
        const fetchedOnlineUsers = snapshot.docs.map(doc => doc.data()); // Map to user data
        console.log("Available Users Data:", fetchedOnlineUsers);
        setOnlineUsers(fetchedOnlineUsers); // Set onlineUsers state
        setActiveUsersCount(snapshot.size);
      });
    }

    const handleBeforeUnload = () => {
      if (userId) {
        updateUserStatus(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeOnlineUsers) {
        unsubscribeOnlineUsers(); // Unsubscribe from snapshot listener
      }
      // Clean up presence
      if (userId) {
        updateUserStatus(false); // Set offline status on component unmount
      }
    };
  }, [userId, toast]);

  const updateUserStatus = async (online: boolean) => {
    if (!userId) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        online,
        available: online,
        lastSeen: serverTimestamp()
      });
      if (online) {
        toast({
          title: "Connected",
          description: "You're back online!",
        });
      }
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  return { isOnline, isOffline, activeUsersCount, onlineUsers }; // Return onlineUsers
}
