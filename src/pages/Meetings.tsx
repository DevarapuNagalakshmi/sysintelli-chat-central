import React from 'react';
import MeetingSidebar from '@/components/MeetingSidebar';
import { Video } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MeetingsPageProps {
  user: User;
}

const MeetingsPage: React.FC<MeetingsPageProps> = ({ user }) => {
  return (
    <div className="h-full flex bg-slate-900">
      <MeetingSidebar user={user} />
      <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-6">
          <Video className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Select a meeting to join</h3>
        <p className="text-slate-400">Or schedule a new meeting</p>
      </div>
    </div>
  );
};

export default MeetingsPage;