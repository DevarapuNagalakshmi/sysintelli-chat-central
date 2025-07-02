import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, Sun, Moon, MessageCircle, Users, Video, Bot } from 'lucide-react';
import { useTheme } from 'next-themes';
import ChatPanel from '@/components/ChatPanel';
import ChannelPanel from '@/components/ChannelPanel';
import MeetingPanel from '@/components/MeetingPanel';
import ChatbotPanel from '@/components/ChatbotPanel';
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
  const [activeTab, setActiveTab] = useState<'chats' | 'channels' | 'meetings' | 'sysintelli'>('chats');
  const [showProfile, setShowProfile] = useState(false);
  const { theme, setTheme } = useTheme();

  const renderContent = () => {
    switch (activeTab) {
      case 'chats':
        return <ChatPanel user={user} />;
      case 'channels':
        return <ChannelPanel user={user} />;
      case 'meetings':
        return <MeetingPanel user={user} />;
      case 'sysintelli':
        return <ChatbotPanel user={user} />;
      default:
        return <ChatPanel user={user} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header - Responsive */}
      <div className="flex items-center justify-between p-4 border-b bg-background z-10 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col space-y-2">
            <Avatar 
              className="h-10 w-10 cursor-pointer" 
              onClick={() => setShowProfile(true)}
            >
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(true)}
              className="p-1 h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold">Let's Connect...</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.name}</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-lg font-semibold">Let's Connect...</h1>
            <p className="text-xs text-muted-foreground">Welcome, {user.name}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="destructive" size="sm" onClick={onLogout} className="hidden sm:flex">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
          <Button variant="destructive" size="sm" onClick={onLogout} className="sm:hidden p-2">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area - Responsive with proper spacing */}
      <div className="flex-1 overflow-hidden pb-20 sm:pb-24">
        <div className="h-full overflow-y-auto">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Navigation - Responsive */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-20">
        <div className="flex justify-around items-center h-16 sm:h-20 max-w-6xl mx-auto px-2 sm:px-4">
          <Button
            variant={activeTab === 'chats' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('chats')}
            className="flex-1 mx-1 flex flex-col items-center justify-center py-2 h-12 sm:h-14 text-xs sm:text-sm"
          >
            <MessageCircle className="h-4 w-4 sm:h-6 sm:w-6 mb-1" />
            <span className="font-medium">Chats</span>
          </Button>
          <Button
            variant={activeTab === 'channels' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('channels')}
            className="flex-1 mx-1 flex flex-col items-center justify-center py-2 h-12 sm:h-14 text-xs sm:text-sm"
          >
            <Users className="h-4 w-4 sm:h-6 sm:w-6 mb-1" />
            <span className="font-medium">Channels</span>
          </Button>
          <Button
            variant={activeTab === 'meetings' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('meetings')}
            className="flex-1 mx-1 flex flex-col items-center justify-center py-2 h-12 sm:h-14 text-xs sm:text-sm"
          >
            <Video className="h-4 w-4 sm:h-6 sm:w-6 mb-1" />
            <span className="font-medium">Meetings</span>
          </Button>
          <Button
            variant={activeTab === 'sysintelli' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('sysintelli')}
            className="flex-1 mx-1 flex flex-col items-center justify-center py-2 h-12 sm:h-14 text-xs sm:text-sm"
          >
            <Bot className="h-4 w-4 sm:h-6 sm:w-6 mb-1" />
            <span className="font-medium">SysIntelli</span>
          </Button>
        </div>
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
