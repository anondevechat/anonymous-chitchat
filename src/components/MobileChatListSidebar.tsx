import React from 'react';
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatList from "@/components/ChatList";

interface MobileChatListSidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  mappedChats: any[]; // Define a more specific type for mappedChats
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const MobileChatListSidebar: React.FC<MobileChatListSidebarProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  mappedChats,
  activeChat,
  onChatSelect,
  onNewChat,
}) => {
  return (
    <div 
      className={`fixed inset-0 bg-background z-20 md:hidden transform transition-transform ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        <div className="p-4 flex items-center border-b mobile-header">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="rounded-full hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold ml-2">Chats</h1>
        </div>
        
        <div className="flex-1 overflow-auto">
          <ChatList 
            chats={mappedChats}
            activeChat={activeChat}
            onChatSelect={onChatSelect}
            onNewChat={onNewChat}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileChatListSidebar;
