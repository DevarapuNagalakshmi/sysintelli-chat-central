
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Settings, UserPlus, UserMinus, Copy, Send, Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Chat {
  id: string;
  participants: User[];
  lastMessage?: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  };
  otherParticipant?: User;
}

interface Message {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  created_at: string;
  chat_id: string;
  sender_profile?: {
    full_name: string;
    email: string;
  };
}

interface ChatPanelProps {
  user: User;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ user }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all users for starting new chats
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('Fetching all users...');
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .neq('id', user.id);

        if (error) throw error;

        const formattedUsers: User[] = (profiles || []).map(profile => ({
          id: profile.id,
          name: profile.full_name || profile.email.split('@')[0],
          email: profile.email,
          avatar: profile.avatar_url || ''
        }));

        console.log('Fetched users:', formattedUsers);
        setUsers(formattedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [user.id]);

  // Fetch user's chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching user chats...');
        
        const { data: chatParticipants, error } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching chats:', error);
          return;
        }

        if (!chatParticipants || chatParticipants.length === 0) {
          setChats([]);
          return;
        }

        const userChats: Chat[] = [];
        
        for (const participant of chatParticipants) {
          try {
            // Get all participants for this chat
            const { data: allParticipants } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('chat_id', participant.chat_id);

            if (!allParticipants) continue;

            // Get the other participant (not the current user)
            const otherParticipantId = allParticipants.find(p => p.user_id !== user.id)?.user_id;
            
            if (!otherParticipantId) continue;

            // Get the other participant's profile
            const { data: otherProfile } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url')
              .eq('id', otherParticipantId)
              .single();

            if (!otherProfile) continue;

            const otherUser: User = {
              id: otherProfile.id,
              name: otherProfile.full_name || otherProfile.email.split('@')[0],
              email: otherProfile.email,
              avatar: otherProfile.avatar_url || ''
            };

            userChats.push({
              id: participant.chat_id,
              participants: [user, otherUser],
              otherParticipant: otherUser
            });
          } catch (error) {
            console.error('Error processing chat:', error);
          }
        }

        setChats(userChats);
      } catch (error) {
        console.error('Error in fetchChats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [user.id, user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        const { data: chatMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', selectedChat.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const messagesWithSenders: Message[] = [];
        
        for (const msg of chatMessages || []) {
          try {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', msg.sender_id)
              .single();

            messagesWithSenders.push({
              id: msg.id,
              sender: senderProfile?.full_name || senderProfile?.email?.split('@')[0] || 'Unknown',
              senderId: msg.sender_id,
              content: msg.content,
              created_at: msg.created_at,
              chat_id: msg.chat_id,
              sender_profile: senderProfile || undefined
            });
          } catch (error) {
            console.error('Error fetching sender profile:', error);
            messagesWithSenders.push({
              id: msg.id,
              sender: 'Unknown',
              senderId: msg.sender_id,
              content: msg.content,
              created_at: msg.created_at,
              chat_id: msg.chat_id
            });
          }
        }

        setMessages(messagesWithSenders);
      } catch (error) {
        console.error('Error fetching messages:', error);
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
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Get sender profile for real-time message
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newMsg.sender_id)
            .single();

          const formattedMsg: Message = {
            id: newMsg.id,
            sender: senderProfile?.full_name || senderProfile?.email?.split('@')[0] || 'Unknown',
            senderId: newMsg.sender_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            chat_id: newMsg.chat_id,
            sender_profile: senderProfile || undefined
          };
          
          setMessages(prev => [...prev, formattedMsg]);
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
      
      // Create a new chat
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (chatError) throw chatError;

      // Add both users as participants
      const { error: participant1Error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: newChat.id,
          user_id: user.id
        });

      if (participant1Error) throw participant1Error;

      const { error: participant2Error } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: newChat.id,
          user_id: otherUser.id
        });

      if (participant2Error) throw participant2Error;

      // Add to local state
      const chatItem: Chat = {
        id: newChat.id,
        participants: [user, otherUser],
        otherParticipant: otherUser
      };

      setChats(prev => [...prev, chatItem]);
      setSelectedChat(chatItem);

      toast({
        title: "Chat created",
        description: `Started a conversation with ${otherUser.name}`,
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
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          chat_id: selectedChat.id
        });

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

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !chats.some(chat => chat.otherParticipant?.id === u.id)
  );

  const chatMessages = messages.filter(msg => msg.chat_id === selectedChat?.id);

  return (
    <div className="h-full flex bg-background p-4">
      {/* Chat List */}
      <div className="w-80 border-r bg-card flex flex-col rounded-l-lg">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Chats</h2>
            <Dialog>
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
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredUsers.map((otherUser) => (
                      <div
                        key={otherUser.id}
                        onClick={() => createChatWithUser(otherUser)}
                        className="flex items-center p-3 hover:bg-accent rounded-lg cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={otherUser.avatar} />
                          <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{otherUser.name}</p>
                          <p className="text-sm text-muted-foreground">{otherUser.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading chats...</p>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No chats yet</p>
              <p className="text-xs">Start a new conversation</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center p-4 hover:bg-accent cursor-pointer border-b transition-colors ${
                  selectedChat?.id === chat.id ? 'bg-accent' : ''
                }`}
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={chat.otherParticipant?.avatar} />
                  <AvatarFallback>{chat.otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-medium text-sm truncate">{chat.otherParticipant?.name}</h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {chat.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {chat.lastMessage?.message || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-r-lg">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={selectedChat.otherParticipant?.avatar} />
                  <AvatarFallback>{selectedChat.otherParticipant?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedChat.otherParticipant?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedChat.otherParticipant?.email}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{message.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t mb-16 sm:mb-20">
              <div className="flex space-x-2">
                <Input
                  placeholder={`Message ${selectedChat.otherParticipant?.name}`}
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
              <p className="text-sm text-muted-foreground mt-2">Or start a new conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
