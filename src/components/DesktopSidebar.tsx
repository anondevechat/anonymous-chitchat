import React from 'react';
import UserDashboard from '@/components/UserDashboard';
import ChatList from "@/components/ChatList";

interface DesktopSidebarProps {
  mappedChats: any[]; // Define a more specific type for mappedChats
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  mappedChats,
  activeChat,
  onChatSelect,
  onNewChat,
}) => {
  return (
    <div className="hidden md:block w-80 lg:w-96 xl:w-1/4 border-r overflow-hidden flex flex-col">
      <UserDashboard />
      <ChatList 
        chats={mappedChats}
        activeChat={activeChat}
        onChatSelect={onChatSelect}
        onNewChat={onNewChat}
      />
    </div>
  );
};

export default DesktopSidebar;
