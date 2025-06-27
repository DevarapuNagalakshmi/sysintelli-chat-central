
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, Settings, UserPlus, UserMinus, Copy, Send, Search } from 'lucide-react';

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
  lastMessage?: {
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  };
}

interface ChannelPanelProps {
  user: User;
}

const ChannelPanel: React.FC<ChannelPanelProps> = ({ user }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');

  // Mock data - Replace with Supabase integration
  useEffect(() => {
    const mockChannels: Channel[] = [
      {
        id: '1',
        name: 'General',
        description: 'General company discussions',
        memberCount: 25,
        isAdmin: true,
        lastMessage: {
          id: '1',
          sender: 'John Doe',
          message: 'Welcome everyone to the new communication platform!',
          timestamp: new Date()
        }
      },
      {
        id: '2',
        name: 'Development Team',
        description: 'Development discussions and updates',
        memberCount: 8,
        isAdmin: false,
        lastMessage: {
          id: '2',
          sender: 'Jane Smith',
          message: 'The new feature is ready for testing',
          timestamp: new Date()
        }
      }
    ];
    setChannels(mockChannels);
  }, []);

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;

    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelName,
      description: newChannelDescription,
      memberCount: 1,
      isAdmin: true
    };

    setChannels(prev => [...prev, newChannel]);
    setNewChannelName('');
    setNewChannelDescription('');
    setShowCreateChannel(false);
    
    // Here you would create in Supabase
    console.log('Creating channel in Supabase:', newChannel);
  };

  const handleCloneChannel = (channel: Channel) => {
    const clonedChannel: Channel = {
      ...channel,
      id: Date.now().toString(),
      name: `${channel.name} (Copy)`,
      memberCount: 1,
      isAdmin: true
    };

    setChannels(prev => [...prev, clonedChannel]);
    console.log('Cloning channel:', clonedChannel);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return;

    const message = {
      id: Date.now().toString(),
      sender: user.name,
      message: newMessage,
      timestamp: new Date(),
      channelId: selectedChannel.id
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Here you would send to Supabase
    console.log('Sending channel message to Supabase:', message);
  };

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Channel List */}
      <div className="w-1/3 border-r">
        <div className="p-4">
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
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              className={`flex items-center p-3 hover:bg-accent cursor-pointer ${
                selectedChannel?.id === channel.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{channel.name}</h3>
                  {channel.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {channel.lastMessage.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">
                    {channel.lastMessage?.message || channel.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {channel.memberCount} members
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3">
                  <h3 className="font-medium">{selectedChannel.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedChannel.memberCount} members • {selectedChannel.description}
                  </p>
                </div>
              </div>
              
              {selectedChannel.isAdmin && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCloneChannel(selectedChannel)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm">{message.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{message.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
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
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a channel to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelPanel;
