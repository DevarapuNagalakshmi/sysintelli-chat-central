import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Video } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MeetingSidebarProps {
  user: User;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({ user }) => {
  return (
    <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Meetings</h2>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        </div>
      </div>

      {/* Meeting List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
            <Video className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-white font-medium mb-2">No meetings scheduled</h3>
          <p className="text-slate-400 text-sm">Schedule a new meeting</p>
        </div>
      </div>
    </div>
  );
};

export default MeetingSidebar;