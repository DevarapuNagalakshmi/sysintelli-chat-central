import React from 'react';
import SysIntelliSidebar from '@/components/SysIntelliSidebar';
import { Bot } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface SysIntelliPageProps {
  user: User;
}

const SysIntelliPage: React.FC<SysIntelliPageProps> = ({ user }) => {
  return (
    <div className="h-full flex bg-slate-900">
      <SysIntelliSidebar user={user} />
      <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-6">
          <Bot className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">Select a chat to start messaging</h3>
        <p className="text-slate-400">Or start a new AI conversation</p>
      </div>
    </div>
  );
};

export default SysIntelliPage;