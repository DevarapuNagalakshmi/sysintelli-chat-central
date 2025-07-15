import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onProfileClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onProfileClick }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background z-10 flex-shrink-0">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col space-y-2">
          <Avatar 
            className="h-10 w-10 cursor-pointer" 
            onClick={onProfileClick}
          >
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="sm"
            onClick={onProfileClick}
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
  );
};

export default Navbar;