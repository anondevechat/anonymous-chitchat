import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { 
  runTransaction,
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  Timestamp,
  getDoc,
  FieldValue
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

export interface Attachment {
  type: "image" | "voice";
  url: string;
}

export interface Message {
  id: string;
  content: string;
  sender: "me" | "them";
  timestamp: Timestamp;
  attachment?: Attachment;
  status?: "sent" | "delivered" | "read";
}

export interface FirebaseChat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Timestamp;
  unread: number;
  online: boolean;
  participants: string[];
}

export function useFirebaseChat(userId: string | undefined) {
  const [chats, setChats] = useState<FirebaseChat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData: FirebaseChat[] = [];
      snapshot.forEach((doc) => {
        chatData.push({ id: doc.id, ...doc.data() } as FirebaseChat);
      });
      setChats(chatData);
      console.log("Fetched chats:", chatData); // ADDED CONSOLE LOG
      setLoading(false);
    }, (err) => {
      setError(err.message);
      console.error("Error fetching chats:", err.message); // ADDED CONSOLE LOG
      setLoading(false);
      toast({
        title: "Error fetching chats",
        description: err.message,
        variant: "destructive"
      });
    });

    return () => unsubscribe();
  }, [userId, toast]);

  useEffect(() => {
    if (!activeChat || !userId) return;

    const q = query(
      collection(db, "chats", activeChat, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messageData.push({
          id: doc.id,
          content: data.content,
          sender: data.senderId === userId ? "me" : "them",
          timestamp: data.timestamp,
          attachment: data.attachment,
          status: data.status
        });
      });
      setMessages(messageData);
    }, (err) => {
      setError(err.message);
      toast({
        title: "Error fetching messages",
        description: err.message,
        variant: "destructive"
      });
    });

    markMessagesAsRead(activeChat, userId);

    return () => unsubscribe();
  }, [activeChat, userId, toast]);

  const markMessagesAsRead = async (chatId: string, userId: string) => {
    try {
      const q = query(
        collection(db, "chats", chatId, "messages"),
        where("senderId", "!=", userId)
      );
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(async (document) => {
        const message = document.data();
        if (message.status !== "read") { // Filter in code
          await updateDoc(doc(db, "chats", chatId, "messages", document.id), {
            status: "read"
          });
        }
      });

      await updateDoc(doc(db, "chats", chatId), {
        unread: 0
      });
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  const sendMessage = async (content: string, attachment?: File) => {
    if (!activeChat || !userId || !content.trim()) return;

    try {
      let attachmentData: Attachment | undefined;

      if (attachment) {
        const storageRef = ref(storage, `chat-attachments/${activeChat}/${Date.now()}_${attachment.name}`);
        await uploadBytes(storageRef, attachment);
        const downloadUrl = await getDownloadURL(storageRef);
        
        const fileType = attachment.type.startsWith('image') ? 'image' : 'voice';
        attachmentData = {
          type: fileType as "image" | "voice",
          url: downloadUrl
        };
      }

      const messageData = {
        content,
        senderId: userId,
        timestamp: serverTimestamp(),
        status: "sent",
        ...(attachmentData && { attachment: attachmentData })
      };

      await addDoc(collection(db, "chats", activeChat, "messages"), messageData);

      await updateDoc(doc(db, "chats", activeChat), {
        lastMessage: content,
        lastMessageTime: serverTimestamp()
      });

      setTimeout(async () => {
        const q = query(
          collection(db, "chats", activeChat, "messages"),
          where("senderId", "==", userId),
          orderBy("timestamp", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          await updateDoc(doc(db, "chats", activeChat, "messages", querySnapshot.docs[0].id), {
            status: "delivered"
          });
        }
      }, 1000);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Error sending message",
          description: err.message,
          variant: "destructive"
        });
      }
    }
  };

  const startNewChat = async (userNickname: string) => {
    if (!userId) return null;

    try {
      return await runTransaction(db, async (transaction) => {
        // Get the current user's data
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);
        const userData = userDoc.data();
        const nickname = userData?.nickname || userNickname;

        const chatQueueRef = collection(db, "chat-queue");
        const queueQuery = query(chatQueueRef);
        const queueSnapshot = await getDocs(queueQuery);

        console.log("startNewChat: queueSnapshot is empty:", queueSnapshot.empty); // Log querySnapshot.empty

        if (!queueSnapshot.empty) {
          // Match with user from queue
          const partnerDoc = queueSnapshot.docs[0]; // Get the first user in the queue
          const partnerId = partnerDoc.id;
          console.log("startNewChat: Partner found in queue:", partnerId);

          if (partnerId === userId) {
              //remove self from queue if in queue
              transaction.delete(doc(db, "chat-queue", userId));
              toast({
                  title: "No users in queue",
                  description: "You were the only one in queue. Please wait."
              });
              return null;
          }


          // Remove partner from queue
          transaction.delete(partnerDoc.ref);
          // Remove current user from queue if they are in it (in case of retries)
          transaction.delete(doc(db, "chat-queue", userId));


          const chatRef = doc(collection(db, "chats")); // Generate new chat document with auto-ID
          transaction.set(chatRef, {
            participants: [userId, partnerId],
            lastMessage: "Chat started",
            lastMessageTime: serverTimestamp(),
            unread: 0,
         online: true,
          name: "Anonymous Chat" // Set generic chat name
        });


        const messageRef = collection(db, "chats", chatRef.id, "messages");
        transaction.set(doc(messageRef), {
          content: "You're now chatting with a random stranger. Say hi!",
          senderId: partnerId,
          timestamp: serverTimestamp(),
          status: "read"
        });
          toast({
            title: "Searching for partner...",
            description: "Please wait, searching for a partner."
          });
          return chatRef.id; // Indicate waiting for partner - return chat id here
        } else {
          // Add user to queue
          console.log("startNewChat: Adding user to queue:", userId);
          transaction.set(doc(db, "chat-queue", userId), {
            userId: userId,
            nickname: userNickname, // Save nickname to queue
            timestamp: serverTimestamp()
          });
          toast({
            title: "Searching for partner...",
            description: "Please wait, searching for a partner."
          });
          return null; // Indicate waiting for partner
        }
      });
    } catch (error) { // Renamed err to error for better error handling
      if (error instanceof Error) {
        setError(error.message);
        toast({
          title: "Error starting chat",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.error("An unexpected error occurred:", error); // Log unexpected errors
        setError("An unexpected error occurred.");
        toast({
          title: "Error starting chat",
          description: "An unexpected error occurred.",
          variant: "destructive"
        });
      }
  return null;
    }
  };

  const cancelChatSearch = async (userId: string) => {
    if (!userId) return;
    try {
      await runTransaction(db, async (transaction) => {
        const userInQueueRef = doc(db, "chat-queue", userId);
        const userInQueueSnap = await transaction.get(userInQueueRef);

        if (userInQueueSnap.exists()) {
          transaction.delete(userInQueueRef);
          toast({
            title: "Search cancelled",
            description: "You have cancelled the search for a chat partner."
          });
        } else {
          toast({
            title: "Not in queue",
            description: "You are not currently in the queue."
          });
        }
      });
    } catch (error) {
      console.error("Error cancelling chat search:", error);
      toast({
        title: "Error cancelling search",
        description: "Failed to cancel the search. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteChat = async (chatId: string, userId: string) => {
    if (!chatId || !userId) return;

    try {
      await runTransaction(db, async (transaction) => {
        // Delete the chat document
        const chatRef = doc(db, "chats", chatId);
        transaction.delete(chatRef);

        // Optionally, update the UI immediately by removing the chat from the local state
        setChats(currentChats => currentChats.filter(c => c.id !== chatId));

        toast({
          title: "Chat Deleted",
          description: "Chat has been deleted from your end."
        });
        setActiveChat(null);
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
      toast({
        title: "Error deleting chat",
        description: "Failed to delete the chat. Please try again.",
        variant: "destructive"
      });
    }
  };

  const endChat = async (chatId: string, userId: string) => {
    if (!chatId || !userId) return;

    try {
      await deleteChat(chatId, userId);
    } catch (error) {
      console.error("Error ending chat:", error);
      toast({
        title: "Error ending chat",
        description: "Failed to end the chat. Please try again.",
        variant: "destructive"
      });
    }
  };


  const sendFriendRequest = async (chatId: string) => {
    if (!chatId || !userId) return;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        content: "You sent a friend request to this stranger. They'll need to accept it to add you to their contacts.",
        senderId: "system",
        timestamp: serverTimestamp(),
        status: "read"
      });
      
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const partnerId = chatData.participants.find((id: string) => id !== userId);
        
        await setDoc(doc(db, "friendRequests", `${userId}_${partnerId}`), {
          senderId: userId,
          receiverId: partnerId,
          status: "pending",
          timestamp: serverTimestamp(),
          chatId: chatId
        });
      }
      
      toast({
        title: "Friend Request Sent",
        description: "Friend request sent to this stranger."
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast({
          title: "Error sending friend request",
          description: err.message,
          variant: "destructive"
        });
      }
    }
  };

  return {
    chats,
    messages,
    activeChat,
    loading,
    error,
    setActiveChat,
    sendMessage,
    startNewChat,
    cancelChatSearch, // Added cancelChatSearch to the returned object
    endChat, // Modified endChat to call deleteChat
    sendFriendRequest
  };
}
