import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

interface ChatbotPanelProps {
  user: User;
}

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      message: 'Hello! I\'m SysIntelli, your company assistant. I can help you with company policies, procedures, and general information. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Mock RAG responses - Replace with actual RAG implementation
  const getRAGResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('policy') || lowerMessage.includes('policies')) {
      return 'Our company policies cover various areas including:\n\n• Code of Conduct\n• Remote Work Policy\n• Data Security Guidelines\n• Leave and Vacation Policy\n\nWhich specific policy would you like to know more about?';
    }
    
    if (lowerMessage.includes('leave') || lowerMessage.includes('vacation')) {
      return 'Our leave policy allows:\n\n• 20 days of paid vacation per year\n• 10 sick days per year\n• 3 personal days\n• Parental leave available\n\nPlease submit leave requests through the HR portal at least 2 weeks in advance.';
    }
    
    if (lowerMessage.includes('remote') || lowerMessage.includes('work from home')) {
      return 'Our remote work policy includes:\n\n• Flexible work arrangements available\n• Must maintain core hours 10 AM - 3 PM in your timezone\n• Regular check-ins with your manager\n• Secure VPN connection required\n\nContact HR for remote work approval.';
    }
    
    if (lowerMessage.includes('benefits')) {
      return 'Our employee benefits include:\n\n• Health insurance (Medical, Dental, Vision)\n• 401(k) retirement plan with company matching\n• Life insurance\n• Professional development budget\n• Flexible spending accounts\n\nFor detailed information, check the benefits portal or contact HR.';
    }
    
    if (lowerMessage.includes('contact') || lowerMessage.includes('hr')) {
      return 'You can contact HR through:\n\n• Email: hr@company.com\n• Phone: (555) 123-4567\n• In-person: Office 201, 2nd Floor\n• HR Portal: Available in the employee dashboard\n\nOffice hours: Monday-Friday, 9 AM - 5 PM';
    }
    
    if (lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
      return 'For scheduling meetings:\n\n• Use the Meetings tab in this application\n• Select a date and time using the calendar\n• Invite participants from the company directory\n• Video calls are automatically enabled\n\nNeed help with a specific meeting? Let me know!';
    }
    
    return 'I understand you\'re asking about "' + userMessage + '". While I don\'t have specific information about that topic, I can help you with:\n\n• Company policies and procedures\n• Benefits and HR information\n• Remote work guidelines\n• Meeting scheduling\n• General company information\n\nPlease feel free to ask about any of these topics!';
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        message: getRAGResponse(newMessage),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col pb-24">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <CardTitle className="flex items-center">
            <Bot className="h-6 w-6 mr-2 text-primary" />
            SysIntelli Chatbot
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              Your AI Company Assistant
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  {message.sender === 'bot' ? (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-secondary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-accent px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fixed Message Input at Bottom */}
      <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 bg-background border-t p-4 z-10">
        <div className="flex space-x-2 max-w-6xl mx-auto">
          <Input
            placeholder="Ask me about company policies, benefits, procedures..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isTyping}
          />
          <Button onClick={handleSendMessage} disabled={isTyping || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPanel;
