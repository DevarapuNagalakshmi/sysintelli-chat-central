import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Settings, UserPlus, UserMinus, Copy, Send, Search, Building } from 'lucide-react';
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
  department?: string;
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

const DEPARTMENTS = [
  'General',
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Customer Support',
  'Design',
  'Operations',
  'Legal'
];

const ChannelPanel: React.FC<ChannelPanelProps> = ({ user }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user's channels with simplified approach to avoid RLS recursion
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching channels for user:', user.id);

        // Direct query to get channels where user is a member
        const { data: userChannels, error } = await supabase
          .from('channels')
          .select(`
            id,
            name, 
            description,
            created_by,
            created_at,
            channel_members!inner(
              user_id,
              role
            )
          `)
          .eq('channel_members.user_id', user.id);

        if (error) {
          console.error('Error fetching channels:', error);
          setChannels([]);
          return;
        }

        console.log('Raw channel data:', userChannels);

        if (!userChannels || userChannels.length === 0) {
          console.log('No channels found');
          setChannels([]);
          return;
        }

        // Process channels
        const processedChannels: Channel[] = [];
        
        for (const channelData of userChannels) {
          try {
            // Get member count for this channel
            const { count: memberCount } = await supabase
              .from('channel_members')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', channelData.id);

            // Get user's role in this channel
            const userMember = Array.isArray(channelData.channel_members) 
              ? channelData.channel_members.find((m: any) => m.user_id === user.id)
              : channelData.channel_members;

            const userRole = userMember?.role || 'member';

            processedChannels.push({
              id: channelData.id,
              name: channelData.name,
              description: channelData.description || '',
              memberCount: memberCount || 0,
              isAdmin: userRole === 'admin' || channelData.created_by === user.id,
              department: channelData.description?.includes('Department:') ? 
                channelData.description.split('Department:')[1].split('|')[0].trim() : 'General',
              members: []
            });
          } catch (error) {
            console.error('Error processing channel:', channelData.id, error);
          }
        }

        console.log('Processed channels:', processedChannels);
        setChannels(processedChannels);
      } catch (error) {
        console.error('Error in fetchChannels:', error);
        toast({
          title: "Error",
          description: "Failed to load channels",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [user.id, toast]);

  // Fetch messages for selected channel
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for channel:', selectedChannel.id);

        const { data: channelMessages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', selectedChannel.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        console.log('Fetched messages:', channelMessages);

        const messagesWithSenders: Message[] = [];
        
        for (const msg of channelMessages || []) {
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
              channelId: msg.channel_id,
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
              channelId: msg.channel_id
            });
          }
        }

        setMessages(messagesWithSenders);
      } catch (error) {
        console.error('Error in fetchMessages:', error);
      }
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
        async (payload) => {
          console.log('New channel message received:', payload);
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
            channelId: newMsg.channel_id,
            sender_profile: senderProfile || undefined
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
    if (!newChannelName.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const description = newChannelDescription ? 
        `${newChannelDescription} | Department: ${selectedDepartment || 'General'}` : 
        `Department: ${selectedDepartment || 'General'}`;
      
      console.log('Creating channel:', { name: newChannelName, description });
      
      // Create the channel
      const { data: newChannel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: newChannelName,
          description: description,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      console.log('Channel created:', newChannel);

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: newChannel.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      // Add the new channel to local state
      const channelItem: Channel = {
        id: newChannel.id,
        name: newChannel.name,
        description: newChannelDescription,
        department: selectedDepartment || 'General',
        memberCount: 1,
        isAdmin: true,
        members: [user]
      };

      setChannels(prev => [...prev, channelItem]);
      setNewChannelName('');
      setNewChannelDescription('');
      setSelectedDepartment('');
      setShowCreateChannel(false);

      toast({
        title: "Channel created",
        description: `Successfully created ${newChannelName} for ${selectedDepartment || 'General'} department`,
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
      console.log('Sending message to channel:', selectedChannel.id);
      
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          sender_id: user.id,
          channel_id: selectedChannel.id
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

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || channel.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const channelMessages = messages.filter(msg => msg.channelId === selectedChannel?.id);

  return (
    <div className="h-full flex bg-background p-4 pb-24">
      {/* Channel List */}
      <div className="w-80 border-r bg-card flex flex-col rounded-l-lg">
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
                    placeholder="Channel description (optional)"
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                  />
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateChannel} className="w-full">
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search channels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading channels...</p>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Building className="h-8 w-8 mx-auto mb-2" />
              <p>No channels found</p>
              <p className="text-xs">Create a channel to get started</p>
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`flex items-center p-4 hover:bg-accent cursor-pointer border-b transition-colors ${
                  selectedChannel?.id === channel.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mr-3">
                  <Building className="h-6 w-6 text-primary" />
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
                    {channel.department && (
                      <span className="bg-secondary text-secondary-foreground px-1 rounded text-xs mr-2">
                        {channel.department}
                      </span>
                    )}
                    {channel.description?.split('|')[0].trim() || 'No description'}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {channel.memberCount} members
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Channel Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-r-lg">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg mr-3">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedChannel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannel.department && (
                      <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs mr-2">
                        {selectedChannel.department}
                      </span>
                    )}
                    {selectedChannel.memberCount} members • {selectedChannel.description?.split('|')[0].trim()}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-r-lg">
            <div className="text-center">
              <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Select a channel to start messaging</p>
              <p className="text-sm text-muted-foreground mt-2">Or create a new channel for your department</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Message Input at Bottom */}
      {selectedChannel && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 bg-background border-t p-4 z-10">
          <div className="flex space-x-2 max-w-6xl mx-auto">
            <Input
              placeholder={`Message #${selectedChannel.name}`}
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
      )}
    </div>
  );
};

export default ChannelPanel;
