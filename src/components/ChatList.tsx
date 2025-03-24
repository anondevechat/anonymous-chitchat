import React, { useState, useEffect } from "react";
import { Plus, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  time: string | null;
  unread: number;
  online: boolean;
  participants: string[];
}

interface ChatListProps {
  chats: Chat[];
  activeChat: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const ChatList: React.FC<ChatListProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onNewChat,
}) => {
  const navigate = useNavigate();
  const [userNicknames, setUserNicknames] = useState<{ [key: string]: string }>(
    {}
  );
  const { user } = useFirebaseAuth();

  useEffect(() => {
    const fetchNicknames = async () => {
      const nicknamePromises = chats.map(async (chat) => {
        const participantPromises = chat.participants.map(async (userId) => {
          const userDoc = await getDoc(doc(db, "users", userId));
          const userData = userDoc.data();
          return [userId, userData?.nickname || "Anonymous User"];
        });
        const nicknames = await Promise.all(participantPromises);
        return Object.fromEntries(nicknames);
      });
      const allNicknames = await Promise.all(nicknamePromises);
      setUserNicknames(Object.assign({}, ...allNicknames));
    };

    if (chats.length > 0) {
      fetchNicknames();
    }
  }, [chats]);

  const navigateToSettings = () => {
    navigate("/settings");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Chats</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            className="hover:bg-secondary rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 rounded-full bg-secondary border-0"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2 no-scrollbar">
        {chats.map((chat) => {
          const otherParticipant =
            chat.participants.find((p) => p !== user?.uid) || "";
          const displayName =
            userNicknames[otherParticipant] || "Anonymous User";
          return (
            <div
              key={chat.id}
              className={`chat-list-item ${
                activeChat === chat.id ? "chat-list-item-active" : ""
              }`}
              onClick={() => onChatSelect(chat.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`avatar-container h-10 w-10 ${
                    chat.online ? "avatar-online" : ""
                  }`}
                >
                  <span className="text-lg font-semibold">
                    {displayName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium truncate">{displayName}</h3>
                    <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                      {chat.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                    {chat.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center ml-2">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-auto border-t p-4 sticky bottom-0 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <div className="font-medium">
                {user?.displayName || "Anonymous User"}
              </div>
              <div
                className="text-xs text-primary cursor-pointer hover:underline"
                onClick={navigateToSettings}
              >
                Tap to set nickname
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
