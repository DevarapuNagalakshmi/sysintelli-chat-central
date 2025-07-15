
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Users, Video, Bot } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ChatsPage from '@/pages/Chats';
import ChannelsPage from '@/pages/Channels';
import MeetingsPage from '@/pages/Meetings';
import SysIntelliPage from '@/pages/SysIntelli';
import UserProfile from '@/components/UserProfile';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onProfileClick={() => setShowProfile(true)} 
      />

      {/* Main Content Area with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chats" className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b bg-background">
            <div className="max-w-6xl mx-auto">
              <TabsList className="grid w-full grid-cols-4 h-14 bg-transparent rounded-none border-none">
                <TabsTrigger 
                  value="chats" 
                  className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Chats</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="channels"
                  className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Channels</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="meetings"
                  className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden sm:inline">Meetings</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sysintelli"
                  className="flex items-center space-x-2 data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">SysIntelli</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="chats" className="h-full m-0">
              <ChatsPage user={user} />
            </TabsContent>
            <TabsContent value="channels" className="h-full m-0">
              <ChannelsPage user={user} />
            </TabsContent>
            <TabsContent value="meetings" className="h-full m-0">
              <MeetingsPage user={user} />
            </TabsContent>
            <TabsContent value="sysintelli" className="h-full m-0">
              <SysIntelliPage user={user} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile 
          user={user} 
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
