import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Send, Search, Users, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Chat {
  id: string;
  created_at: string;
  updated_at: string;
  other_user?: User;
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: User;
}

interface ChatsPageProps {
  user: User;
}

const ChatsPage: React.FC<ChatsPageProps> = ({ user }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all users except current user
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .neq('id', user.id);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const mappedUsers = data.map(profile => ({
        id: profile.id,
        name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
        email: profile.email,
        avatar: profile.avatar_url
      }));

      setUsers(mappedUsers);
    };

    fetchUsers();
  }, [user.id]);

  // Fetch user's chats
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      
      const { data: chatParticipants, error } = await supabase
        .from('chat_participants')
        .select(`
          chat_id,
          chats (
            id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching chats:', error);
        setLoading(false);
        return;
      }

      const chatIds = chatParticipants.map(cp => cp.chat_id);
      
      if (chatIds.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

        // Get other participants for each chat
        const chatsWithUsers = await Promise.all(
          chatParticipants.map(async (cp) => {
            const { data: otherParticipants } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('chat_id', cp.chat_id)
              .neq('user_id', user.id);

            let otherUser = null;
            if (otherParticipants && otherParticipants.length > 0) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url')
                .eq('id', otherParticipants[0].user_id)
                .single();
              
              otherUser = profileData;
            }
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', cp.chat_id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            id: cp.chats.id,
            created_at: cp.chats.created_at,
            updated_at: cp.chats.updated_at,
            other_user: otherUser ? {
              id: otherUser.id,
              name: otherUser.full_name || otherUser.email?.split('@')[0] || 'Unknown',
              email: otherUser.email,
              avatar: otherUser.avatar_url
            } : undefined,
            last_message: lastMessage?.[0]?.content,
            last_message_time: lastMessage?.[0]?.created_at
          };
        })
      );

      setChats(chatsWithUsers);
      setLoading(false);
    };

    fetchChats();
  }, [user.id]);

  // Fetch messages for selected chat and set up real-time subscription
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('chat_id', selectedChat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const messagesWithSenders = await Promise.all(
        data.map(async (message) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', message.sender_id)
            .single();

          return {
            id: message.id,
            content: message.content,
            sender_id: message.sender_id,
            created_at: message.created_at,
            sender: senderData ? {
              id: senderData.id,
              name: senderData.full_name || senderData.email?.split('@')[0] || 'Unknown',
              email: senderData.email,
              avatar: senderData.avatar_url
            } : undefined
          };
        })
      );

      setMessages(messagesWithSenders);
    };

    fetchMessages();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}`
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            sender: senderData ? {
              id: senderData.id,
              name: senderData.full_name || senderData.email?.split('@')[0] || 'Unknown',
              email: senderData.email,
              avatar: senderData.avatar_url
            } : undefined
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChat]);

  const createChatWithUser = async (otherUser: User) => {
    try {
      // Create new chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both users as participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: chatData.id, user_id: user.id },
          { chat_id: chatData.id, user_id: otherUser.id }
        ]);

      if (participantsError) throw participantsError;

      const newChat: Chat = {
        id: chatData.id,
        created_at: chatData.created_at,
        updated_at: chatData.updated_at,
        other_user: otherUser
      };

      setChats(prev => [newChat, ...prev]);
      setSelectedChat(newChat);
      setIsNewChatOpen(false);
      
      toast({
        title: "Chat created",
        description: `Started a new chat with ${otherUser.name}`,
      });
    } catch (error) {
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
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          chat_id: selectedChat.id
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Chat List */}
      <div className="w-full md:w-1/3 border-r bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Chats
            </h2>
            <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => createChatWithUser(u)}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <Avatar>
                            <AvatarImage src={u.avatar} />
                            <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="text-center p-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No chats yet</h3>
              <p className="text-muted-foreground mb-4">Start a conversation with someone</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={chat.other_user?.avatar} />
                    <AvatarFallback>{chat.other_user?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{chat.other_user?.name || 'Unknown User'}</p>
                    {chat.last_message && (
                      <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                    )}
                  </div>
                  {chat.last_message_time && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={selectedChat.other_user?.avatar} />
                  <AvatarFallback>{selectedChat.other_user?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedChat.other_user?.name || 'Unknown User'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChat.other_user?.email || 'No email'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Select a chat</h3>
              <p className="text-muted-foreground">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatsPage;