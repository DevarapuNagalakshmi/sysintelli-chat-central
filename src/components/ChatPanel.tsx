
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  chat_id: string;
  sender?: {
    full_name: string;
    email: string;
  };
}

interface Chat {
  id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  isOnline: boolean;
}

interface ChatPanelProps {
  user: User;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ user }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();

  // Fetch all users for potential chats
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const users: User[] = profiles.map(profile => ({
        id: profile.id,
        name: profile.full_name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.avatar_url || ''
      }));

      setAllUsers(users);
    };

    fetchUsers();
  }, [user.id]);

  // Fetch user's chats
  useEffect(() => {
    const fetchChats = async () => {
      const { data: chatParticipants, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats!inner(id, created_at)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      // Transform the data into the expected Chat format
      const userChats: Chat[] = [];
      
      for (const participant of chatParticipants) {
        // Get other participants in this chat
        const { data: otherParticipants } = await supabase
          .from('chat_participants')
          .select(`
            user_id
          `)
          .eq('chat_id', participant.chat_id)
          .neq('user_id', user.id);

        if (otherParticipants && otherParticipants.length > 0) {
          // Get the profile of the other user
          const { data: otherUserProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherParticipants[0].user_id)
            .single();

          if (otherUserProfile) {
            userChats.push({
              id: participant.chat_id,
              user: {
                id: otherUserProfile.id,
                name: otherUserProfile.full_name || otherUserProfile.email.split('@')[0],
                email: otherUserProfile.email,
                avatar: otherUserProfile.avatar_url || ''
              },
              unreadCount: 0,
              isOnline: Math.random() > 0.5 // Mock online status
            });
          }
        }
      }

      setChats(userChats);
    };

    fetchChats();
  }, [user.id]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const { data: chatMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          chat_id
        `)
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Get sender profiles for each message
      const messagesWithSenders = await Promise.all(
        (chatMessages || []).map(async (msg) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender: senderProfile
          };
        })
      );

      setMessages(messagesWithSenders);
    };

    fetchMessages();

    // Set up real-time subscription for messages
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}`
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  const createChatWithUser = async (otherUser: User) => {
    try {
      // Create a new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both users as participants
      const { error: participantError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: user.id },
          { chat_id: newChat.id, user_id: otherUser.id }
        ]);

      if (participantError) throw participantError;

      // Add the new chat to our chats list
      const newChatItem: Chat = {
        id: newChat.id,
        user: otherUser,
        unreadCount: 0,
        isOnline: Math.random() > 0.5
      };

      setChats(prev => [...prev, newChatItem]);
      setSelectedChat(newChatItem);

      toast({
        title: "Chat created",
        description: `Started a new chat with ${otherUser.name}`,
      });
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          chat_id: selectedChat.id
        })
        .select()
        .single();

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableUsers = allUsers.filter(u => 
    !chats.some(chat => chat.user.id === u.id) &&
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex bg-background p-4">
      {/* Chat List - Fixed width */}
      <div className="w-80 border-r bg-card rounded-l-lg flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chats or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Existing Chats */}
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`flex items-center p-3 hover:bg-accent cursor-pointer border-b ${
                selectedChat?.id === chat.id ? 'bg-accent' : ''
              }`}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={chat.user.avatar} />
                  <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {chat.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate">{chat.user.name}</h3>
                  {chat.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Available Users to Start Chat With */}
          {searchTerm && availableUsers.length > 0 && (
            <>
              <div className="p-3 text-sm text-muted-foreground border-b">
                Start new chat with:
              </div>
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => createChatWithUser(user)}
                  className="flex items-center p-3 hover:bg-accent cursor-pointer border-b"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="font-medium truncate">{user.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Area - Flexible width with fixed input */}
      <div className="flex-1 flex flex-col bg-card rounded-r-lg">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center bg-card rounded-tr-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedChat.user.avatar} />
                <AvatarFallback>{selectedChat.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h3 className="font-medium">{selectedChat.user.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedChat.isOnline ? 'Online' : 'Last seen recently'}
                </p>
              </div>
            </div>

            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input - Fixed at bottom above taskbar */}
            <div className="p-4 border-t bg-card rounded-br-lg mb-16 sm:mb-20">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-r-lg">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
