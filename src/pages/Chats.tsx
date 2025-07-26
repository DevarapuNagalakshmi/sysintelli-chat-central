import React from 'react';
import ChatSidebar from '@/components/ChatSidebar';
import ChatArea from '@/components/ChatArea';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ChatsPageProps {
  user: User;
}

const ChatsPage: React.FC<ChatsPageProps> = ({ user }) => {
  return (
    <div className="h-full flex bg-slate-900">
      <ChatSidebar user={user} />
      <ChatArea user={user} />
    </div>
  );
};

export default ChatsPage;