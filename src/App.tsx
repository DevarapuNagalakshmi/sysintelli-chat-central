
import React, { useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient();

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  bio?: string;
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    // Mock authentication - Replace with Supabase Auth
    console.log('Authenticating with Supabase:', { email, password });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      name: email.split('@')[0],
      email: email,
      avatar: '',
      phone: '',
      bio: ''
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <div className={isElectron ? 'electron-app' : ''}>
            <Toaster />
            <Sonner />
            
            {!isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              user && <Dashboard user={user} onLogout={handleLogout} />
            )}
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
