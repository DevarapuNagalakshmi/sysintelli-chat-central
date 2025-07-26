import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ChannelSidebarProps {
  user: User;
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ user }) => {
  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Channels</h2>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Channel
          </Button>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-white font-medium mb-2">No channels yet</h3>
          <p className="text-slate-400 text-sm">Create or join a channel</p>
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;