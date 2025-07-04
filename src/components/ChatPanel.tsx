import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Search, MessageCircle, Plus } from 'lucide-react';
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
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all users for potential chats
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching all users...');
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
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

        console.log('Fetched users:', users);
        setAllUsers(users);
      } catch (error) {
        console.error('Error in fetchUsers:', error);
      }
    };

    fetchUsers();
  }, [user.id]);

  // Fetch user's existing chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching user chats...');
        
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

        console.log('Chat participants:', chatParticipants);
        const userChats: Chat[] = [];
        
        for (const participant of chatParticipants || []) {
          // Get other participants in this chat
          const { data: otherParticipants, error: participantError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', participant.chat_id)
            .neq('user_id', user.id);

          if (participantError) {
            console.error('Error fetching other participants:', participantError);
            continue;
          }

          if (otherParticipants && otherParticipants.length > 0) {
            // Get the profile of the other user
            const { data: otherUserProfile, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', otherParticipants[0].user_id)
              .single();

            if (profileError) {
              console.error('Error fetching user profile:', profileError);
              continue;
            }

            if (otherUserProfile) {
              // Get last message for this chat
              const { data: lastMessage } = await supabase
                .from('messages')
                .select('id, content, created_at, sender_id')
                .eq('chat_id', participant.chat_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              userChats.push({
                id: participant.chat_id,
                user: {
                  id: otherUserProfile.id,
                  name: otherUserProfile.full_name || otherUserProfile.email.split('@')[0],
                  email: otherUserProfile.email,
                  avatar: otherUserProfile.avatar_url || ''
                },
                lastMessage: lastMessage || undefined,
                unreadCount: 0,
                isOnline: Math.random() > 0.5 // Mock online status
              });
            }
          }
        }

        console.log('Processed chats:', userChats);
        setChats(userChats);
      } catch (error) {
        console.error('Error in fetchChats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [user.id]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for chat:', selectedChat.id);
        
        const { data: chatMessages, error } = await supabase
          .from('messages')
          .select('id, content, sender_id, created_at, chat_id')
          .eq('chat_id', selectedChat.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        console.log('Fetched messages:', chatMessages);
        
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
      } catch (error) {
        console.error('Error in fetchMessages:', error);
      }
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
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            id: newMsg.id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            chat_id: newMsg.chat_id
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  const createChatWithUser = async (otherUser: User) => {
    try {
      console.log('Creating chat with user:', otherUser);
      
      // Check if chat already exists between these users
      const { data: existingParticipants } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (existingParticipants) {
        for (const participant of existingParticipants) {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id, chat_id')
            .eq('chat_id', participant.chat_id)
            .eq('user_id', otherUser.id)
            .maybeSingle();

          if (otherParticipant) {
            // Chat already exists, select it
            const existingChatItem = chats.find(c => c.id === participant.chat_id);
            if (existingChatItem) {
              setSelectedChat(existingChatItem);
              setShowAllUsers(false);
              return;
            }
          }
        }
      }

      // Create a new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      console.log('Created new chat:', newChat);

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
      setShowAllUsers(false);

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
      console.log('Sending message:', newMessage);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          chat_id: selectedChat.id
        });

      if (error) throw error;

      setNewMessage('');
      console.log('Message sent successfully');
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
      {/* Chat List */}
      <div className="w-80 border-r bg-card rounded-l-lg flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Direct Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowAllUsers(!showAllUsers)}
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading chats...</p>
            </div>
          ) : showAllUsers ? (
            <>
              <div className="p-3 text-sm text-muted-foreground border-b flex justify-between items-center">
                <span>Start New Chat</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowAllUsers(false)}
                >
                  Cancel
                </Button>
              </div>
              {(searchTerm ? availableUsers : allUsers).map((availableUser) => (
                <div
                  key={availableUser.id}
                  onClick={() => createChatWithUser(availableUser)}
                  className="flex items-center p-3 hover:bg-accent cursor-pointer border-b"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={availableUser.avatar} />
                    <AvatarFallback>{availableUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <h3 className="font-medium truncate">{availableUser.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">Start conversation</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {filteredChats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No chats yet</p>
                  <p className="text-xs">Click "New Chat" to start messaging</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
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
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
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

            {/* Messages */}
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

            {/* Message Input */}
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
              <p className="text-sm text-muted-foreground mt-2">Or click "New Chat" to start a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
