import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Send, Users, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  member_count?: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: User;
}

interface ChannelsPageProps {
  user: User;
}

const ChannelsPage: React.FC<ChannelsPageProps> = ({ user }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false);
  const { toast } = useToast();

  // Fetch user's channels
  useEffect(() => {
    const fetchChannels = async () => {
      setLoading(true);
      
      const { data: channelMembers, error } = await supabase
        .from('channel_members')
        .select(`
          channel_id,
          channels (
            id,
            name,
            description,
            created_at,
            created_by
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching channels:', error);
        setLoading(false);
        return;
      }

      const channelsWithMemberCount = await Promise.all(
        channelMembers.map(async (cm) => {
          const { count } = await supabase
            .from('channel_members')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', cm.channel_id);

          return {
            id: cm.channels.id,
            name: cm.channels.name,
            description: cm.channels.description,
            created_at: cm.channels.created_at,
            created_by: cm.channels.created_by,
            member_count: count || 0
          };
        })
      );

      setChannels(channelsWithMemberCount);
      setLoading(false);
    };

    fetchChannels();
  }, [user.id]);

  // Fetch messages for selected channel and set up real-time subscription
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('channel_id', selectedChannel.id)
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
      .channel('channel_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${selectedChannel.id}`
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
  }, [selectedChannel]);

  const createChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      // Create new channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert({
          name: newChannelName,
          description: newChannelDescription,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelData.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) throw memberError;

      const newChannel: Channel = {
        id: channelData.id,
        name: channelData.name,
        description: channelData.description,
        created_at: channelData.created_at,
        created_by: channelData.created_by,
        member_count: 1
      };

      setChannels(prev => [newChannel, ...prev]);
      setSelectedChannel(newChannel);
      setNewChannelName('');
      setNewChannelDescription('');
      setIsNewChannelOpen(false);
      
      toast({
        title: "Channel created",
        description: `Created channel "${newChannelName}"`,
      });
    } catch (error) {
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
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Channel List */}
      <div className="w-full md:w-1/3 border-r bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Channels
            </h2>
            <Dialog open={isNewChannelOpen} onOpenChange={setIsNewChannelOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Channel Name</label>
                    <Input
                      placeholder="Enter channel name..."
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Input
                      placeholder="Enter channel description..."
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={createChannel} disabled={!newChannelName.trim()}>
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {channels.length === 0 ? (
            <div className="text-center p-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No channels yet</h3>
              <p className="text-muted-foreground mb-4">Create or join a channel to get started</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel?.id === channel.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{channel.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {channel.member_count} {channel.member_count === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Channel Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{selectedChannel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannel.description || `${selectedChannel.member_count} members`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <Avatar className="flex-shrink-0">
                      <AvatarImage src={message.sender?.avatar} />
                      <AvatarFallback>{message.sender?.name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm">{message.sender?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex space-x-2">
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
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Select a channel</h3>
              <p className="text-muted-foreground">Choose a channel to view messages and participate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsPage;