
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
    <div className="min-h-screen flex flex-col bg-slate-900">
      {/* Navbar */}
      <Navbar 
        user={user} 
        onLogout={onLogout} 
        onProfileClick={() => setShowProfile(true)} 
      />

      {/* Main Content Area with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chats" className="h-full flex flex-col">
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

          {/* Tab Navigation - Bottom */}
          <div className="border-t bg-slate-800">
            <div className="max-w-6xl mx-auto">
              <TabsList className="grid w-full grid-cols-4 h-16 bg-slate-800 rounded-none border-none">
                <TabsTrigger 
                  value="chats" 
                  className="flex flex-col items-center space-y-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white rounded-md mx-1 py-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-xs">Chats</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="channels"
                  className="flex flex-col items-center space-y-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white rounded-md mx-1 py-2"
                >
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Channels</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="meetings"
                  className="flex flex-col items-center space-y-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white rounded-md mx-1 py-2"
                >
                  <Video className="h-5 w-5" />
                  <span className="text-xs">Meetings</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sysintelli"
                  className="flex flex-col items-center space-y-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 hover:text-white rounded-md mx-1 py-2"
                >
                  <Bot className="h-5 w-5" />
                  <span className="text-xs">SysIntelli</span>
                </TabsTrigger>
              </TabsList>
            </div>
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
