import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon } from 'lucide-react';
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
    <nav className="h-16 bg-slate-900 text-white flex items-center justify-between px-6">
      {/* Left side - App branding */}
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">a</span>
        </div>
        <div>
          <h1 className="text-xl font-medium text-white">Let's Connect...</h1>
          <p className="text-sm text-slate-300">Welcome back, {user.email}</p>
        </div>
      </div>

      {/* Right side - User actions */}
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-white hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Logout button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;