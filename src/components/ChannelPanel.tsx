
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Settings, UserPlus, UserMinus, Copy, Send, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isAdmin: boolean;
  members?: User[];
  lastMessage?: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  };
}

interface Message {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  created_at: string;
  channelId: string;
  sender_profile?: {
    full_name: string;
    email: string;
  };
}

interface ChannelPanelProps {
  user: User;
}

const ChannelPanel: React.FC<ChannelPanelProps> = ({ user }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch available users
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

      setAvailableUsers(users);
    };

    fetchUsers();
  }, [user.id]);

  // Fetch user's channels
  useEffect(() => {
    const fetchChannels = async () => {
      const { data: channelMembers, error } = await supabase
        .from('channel_members')
        .select(`
          role,
          channels!inner(id, name, description, created_by, created_at)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching channels:', error);
        return;
      }

      const userChannels: Channel[] = [];
      
      for (const member of channelMembers) {
        const channel = member.channels;
        
        // Get member count
        const { count } = await supabase
          .from('channel_members')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id);

        userChannels.push({
          id: channel.id,
          name: channel.name,
          description: channel.description || '',
          memberCount: count || 0,
          isAdmin: member.role === 'admin' || channel.created_by === user.id,
          members: []
        });
      }

      setChannels(userChannels);
    };

    fetchChannels();
  }, [user.id]);

  // Fetch messages for selected channel
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      const { data: channelMessages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          channel_id,
          profiles!messages_sender_id_fkey(full_name, email)
        `)
        .eq('channel_id', selectedChannel.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      const formattedMessages: Message[] = (channelMessages || []).map(msg => ({
        id: msg.id,
        sender: msg.profiles?.full_name || msg.profiles?.email.split('@')[0] || 'Unknown',
        senderId: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        channelId: msg.channel_id,
        sender_profile: msg.profiles
      }));

      setMessages(formattedMessages);
    };

    fetchMessages();

    // Set up real-time subscription for channel messages
    const channel = supabase
      .channel('channel-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel.id}`
        },
        (payload) => {
          console.log('New channel message received:', payload);
          const newMsg = payload.new as any;
          const formattedMsg: Message = {
            id: newMsg.id,
            sender: 'Unknown', // Will be updated when we refetch
            senderId: newMsg.sender_id,
            content: newMsg.content,
            created_at: newMsg.created_at,
            channelId: newMsg.channel_id
          };
          setMessages(prev => [...prev, formattedMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannel]);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      // Create the channel
      const { data: newChannel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: newChannelName,
          description: newChannelDescription,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: newChannel.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Add to local state
      const channelItem: Channel = {
        id: newChannel.id,
        name: newChannel.name,
        description: newChannel.description || '',
        memberCount: 1,
        isAdmin: true,
        members: [user]
      };

      setChannels(prev => [...prev, channelItem]);
      setNewChannelName('');
      setNewChannelDescription('');
      setShowCreateChannel(false);

      toast({
        title: "Channel created",
        description: `Successfully created ${newChannelName}`,
      });
    } catch (error: any) {
      console.error('Error creating channel:', error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          channel_id: selectedChannel.id
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

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const channelMessages = messages.filter(msg => msg.channelId === selectedChannel?.id);

  return (
    <div className="h-full flex bg-background">
      {/* Channel List - Fixed width with proper spacing */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Channel name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                  />
                  <Input
                    placeholder="Channel description"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                  />
                  <Button onClick={handleCreateChannel} className="w-full">
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Channel List with proper spacing */}
        <div className="flex-1 overflow-y-auto">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              className={`flex items-center p-4 hover:bg-accent cursor-pointer border-b transition-colors ${
                selectedChannel?.id === channel.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mr-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-sm truncate">{channel.name}</h3>
                  {channel.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {channel.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {channel.lastMessage?.message || channel.description}
                </p>
                <span className="text-xs text-muted-foreground">
                  {channel.memberCount} members
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Chat Area - Flexible width with fixed input */}
      <div className="flex-1 flex flex-col bg-card">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mr-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedChannel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannel.memberCount} members • {selectedChannel.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
              {channelMessages.map((message) => (
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

            {/* Message Input - Fixed at bottom above taskbar */}
            <div className="p-4 border-t mb-16 sm:mb-20">
              <div className="flex space-x-2">
                <Input
                  placeholder={`Message #${selectedChannel.name}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelPanel;
