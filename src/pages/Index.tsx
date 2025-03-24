import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import UserDashboard from '@/components/UserDashboard';
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatList from "@/components/ChatList";
import MobileChatListSidebar from '@/components/MobileChatListSidebar'; // Import MobileChatListSidebar
import DesktopSidebar from '@/components/DesktopSidebar'; // Import DesktopSidebar
import ChatHeader from "@/components/ChatHeader";
import ChatMessageList from "@/components/ChatMessageList";
import MessageInput from "@/components/MessageInput";
import NetworkStatus from "@/components/NetworkStatus";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useFirebaseChat } from "@/hooks/useFirebaseChat";
import { generateFunkyName } from "@/utils/nameGenerator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

// Add interface for chat structure
interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: any; // Firebase Timestamp
  unread: number;
  online: boolean;
  participants: string[];
}

const Index = () => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [userNickname, setUserNickname] = useState<string>(() => {
    const savedNickname = localStorage.getItem("nickname");
    return savedNickname || generateFunkyName();
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Firebase auth
  const { user, loading: authLoading, signIn } = useFirebaseAuth();
  
  // Sign in anonymously if not already signed in
  useEffect(() => {
    if (!authLoading && !user) {
      signIn();
    }
  }, [authLoading, user, signIn]);
  
  // Remove or modify this effect as we're now handling nickname in the initial state
  useEffect(() => {
    if (user && (!localStorage.getItem("nickname") || !userNickname)) {
      const nickname = generateFunkyName();
      setUserNickname(nickname);
      localStorage.setItem("nickname", nickname);
    }
  }, [user]);
  
  // Firebase chat
  const { 
    chats, 
    messages, 
    activeChat, 
    loading: chatLoading,
    setActiveChat, 
    sendMessage,
    startNewChat,
    endChat,
    sendFriendRequest
  } = useFirebaseChat(user?.uid);
  
  // Online status management
  const { isOnline, isOffline } = useOnlineStatus(user?.uid);

  useEffect(() => {
    if (activeChat) {
      setFriendRequestSent(false);
    }
  }, [activeChat]);
  
  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    setMobileMenuOpen(false);
  };
  
  const handleNewChat = async () => {
    toast({
      title: "New Chat",
      description: "Starting a new anonymous chat...",
    });
    
    // Use userNickname directly since it's already synchronized with localStorage
    const chatId = await startNewChat(userNickname);
    if (chatId) {
      setActiveChat(chatId);
    }
  };
  
  const handleEndChat = () => {
    if (activeChat && user?.uid) {
      endChat(activeChat, user.uid);
    }
  };
  
  const handleSendFriendRequest = () => {
    if (activeChat) {
      sendFriendRequest(activeChat);
      setFriendRequestSent(true);
    }
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessage(message, attachmentFile || undefined);
    setMessage("");
    setAttachmentFile(null);
  };

  const handleAttachment = (file: File) => {
    setAttachmentFile(file);
    
    if (file.type.startsWith('image')) {
      // For images, create a preview URL
      const imageUrl = URL.createObjectURL(file);
      navigate("/image-viewer", { state: { imageUrl, isPreview: true } });
    } else if (file.type.startsWith('audio')) {
      // For audio, create a preview URL
      const audioUrl = URL.createObjectURL(file);
      navigate("/voice-player", { state: { audioUrl, isPreview: true } });
    }
  };
  
  const viewAttachment = (attachment: { type: "image" | "voice"; url: string }) => {
    if (attachment.type === "image") {
      navigate("/image-viewer", { state: { imageUrl: attachment.url } });
    } else if (attachment.type === "voice") {
      navigate("/voice-player", { state: { audioUrl: attachment.url } });
    }
  };
  
  // Loading state
  if (authLoading || (user && chatLoading)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 border-4 border-t-primary border-r-primary border-b-primary/30 border-l-primary/30 rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }
  
  // Get current chat
  const currentChat = chats.find(chat => chat.id === activeChat);
  
  // Disable actions when offline
  const isNetworkDisabled = isOffline || !isOnline;

  // Update chat mapping to include participants
  const mappedChats = chats.map(chat => ({
    id: chat.id,
    name: chat.name,
    lastMessage: chat.lastMessage,
    time: chat.lastMessageTime ? chat.lastMessageTime.toDate().toLocaleTimeString() : '',
    unread: chat.unread,
    online: chat.online,
    participants: chat.participants || []
  }));

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile chat list sidebar */}
      <MobileChatListSidebar 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        mappedChats={mappedChats}
        activeChat={activeChat}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />
      
      {/* Desktop sidebar */}
      <DesktopSidebar 
        mappedChats={mappedChats}
        activeChat={activeChat}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
      />
      
      {/* Main chat area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <ChatHeader 
            activeChat={activeChat}
            chatName={currentChat?.name}
            isOnline={currentChat?.online}
            isOffline={isNetworkDisabled}
            onMobileMenuOpen={() => setMobileMenuOpen(true)}
            onEndChat={handleEndChat}
            onSendFriendRequest={handleSendFriendRequest}
            friendRequestSent={friendRequestSent}
            nickname={userNickname}
          />
          
          <ChatMessageList 
            activeChat={activeChat}
            messages={messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp && 'toDate' in msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : 'Just now',
              attachment: msg.attachment
            }))}
            isTyping={false}
            onNewChat={handleNewChat}
            viewAttachment={viewAttachment}
          />
          
          {activeChat && (
            <MessageInput 
              message={message}
              isOffline={isNetworkDisabled}
              onMessageChange={(e) => setMessage(e.target.value)}
              onSendMessage={handleSendMessage}
              onAttachment={handleAttachment}
            />
          )}
        </div>
      </div>
      
      {/* Offline indicator */}
      <NetworkStatus userId={user?.uid} />
    </div>
  );
};

export default Index;
