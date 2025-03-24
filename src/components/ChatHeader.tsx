import React, { useState, useEffect } from "react";
import { Menu, MessageSquare, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/firebase"; // Assuming you have a firebase config file

interface ChatHeaderProps {
  activeChat: string | null;
  chatName: string | undefined;
  isOnline: boolean | undefined;
  isOffline: boolean;
  onMobileMenuOpen: () => void;
  onEndChat: () => void;
  onSendFriendRequest: () => void;
  friendRequestSent: boolean;
  isFriend?: boolean;
  nickname?: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeChat,
  chatName,
  isOnline,
  isOffline,
  onMobileMenuOpen,
  onEndChat,
  onSendFriendRequest,
  friendRequestSent,
  isFriend,
  nickname
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [partnerNickname, setPartnerNickname] = useState("Anonymous User");

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Anonymous Chat',
        text: 'Join me for an anonymous chat!',
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    }
  };

  useEffect(() => {
    const fetchPartnerNickname = async () => {
      if (!activeChat) return;
      
      const partnerId = activeChat; // Assuming activeChat is the partner's ID
      const userDoc = await getDoc(doc(db, "users", partnerId));
      const userData = userDoc.data();
      setPartnerNickname(userData?.nickname || "Anonymous User");
    };

    fetchPartnerNickname();
  }, [activeChat]);

  return (
    <div className="p-4 border-b mobile-header flex items-center">
      <Button variant="ghost" size="icon" className="md:hidden mr-2 rounded-full" onClick={onMobileMenuOpen}>
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 flex items-center">
        <div className={`avatar-container h-10 w-10 ${isOnline ? "avatar-online" : ""}`}>
          <MessageSquare className="h-5 w-5" />
        </div>
        <div className="ml-3 min-w-0">
          <div className="font-medium truncate">
            {activeChat ? partnerNickname : "Start Chatting"}
          </div>
          <div className="text-xs text-muted-foreground">
            {isOffline 
              ? "Reconnecting..." 
              : (activeChat && isOnline 
                ? "Online now" 
                : "Offline")}
          </div>
        </div>
      </div>
      
      {activeChat ? (
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowActionMenu(!showActionMenu)} className="rounded-full hover:bg-secondary">
            <span className="sr-only">Chat actions</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </Button>
          
          {showActionMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 glass-panel w-56 py-1 text-sm">
              <button 
                className="flex w-full items-center px-4 py-3 hover:bg-secondary/70 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={onSendFriendRequest}
                disabled={friendRequestSent}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {friendRequestSent ? "Friend Request Sent" : "Send Friend Request"}
              </button>
              <div className="h-px bg-border my-1"></div>
              <button 
                className="flex w-full items-center px-4 py-3 text-destructive hover:bg-secondary/70"
                onClick={onEndChat}
              >
                <X className="h-4 w-4 mr-2" />
                End Chat
              </button>
            </div>
          )}
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleShare} 
          className="rounded-full hover:bg-secondary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </Button>
      )}
    </div>
  );
};

export default ChatHeader;
