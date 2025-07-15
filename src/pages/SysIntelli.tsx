import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, Sparkles, Brain, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
}

interface SysIntelliPageProps {
  user: User;
}

const SysIntelliPage: React.FC<SysIntelliPageProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: 'Hello! I\'m SysIntelli, your AI assistant. I\'m here to help you with any questions or tasks you have. How can I assist you today?',
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateBotResponse = (userMessage: string): string => {
    const responses = [
      "That's an interesting question! Let me help you with that.",
      "I understand what you're asking. Based on my analysis, here's what I can tell you:",
      "Great question! Here's my perspective on that:",
      "I'd be happy to help you with that. Let me break it down for you:",
      "That's a thoughtful inquiry. From my understanding:",
      "I can definitely assist with that. Here's what I recommend:",
      "Excellent point! Let me provide you with some insights:",
      "I appreciate you asking that. Based on my knowledge:",
    ];

    const contextualResponses: { [key: string]: string } = {
      'hello': 'Hello there! It\'s great to meet you. I\'m SysIntelli, and I\'m excited to help you today.',
      'hi': 'Hi! I\'m here and ready to assist you with whatever you need.',
      'help': 'I\'m here to help! I can assist with various tasks like answering questions, providing information, helping with analysis, brainstorming ideas, and much more. What would you like to work on?',
      'weather': 'I don\'t have access to real-time weather data, but I\'d recommend checking a reliable weather service or app for current conditions in your area.',
      'time': `The current time is ${new Date().toLocaleTimeString()}. Is there something time-sensitive I can help you with?`,
      'thank': 'You\'re very welcome! I\'m glad I could help. Feel free to ask me anything else you need assistance with.',
      'bye': 'Goodbye! It was great chatting with you. Feel free to come back anytime you need assistance!',
    };

    const lowerMessage = userMessage.toLowerCase();
    
    for (const [key, response] of Object.entries(contextualResponses)) {
      if (lowerMessage.includes(key)) {
        return response;
      }
    }

    return responses[Math.floor(Math.random() * responses.length)] + " " + 
           "This is a simulated response for demonstration purposes. In a real implementation, this would be connected to an actual AI service.";
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: simulateBotResponse(newMessage),
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const quickPrompts = [
    "What can you help me with?",
    "Explain quantum computing",
    "Write a professional email",
    "Help me brainstorm ideas",
    "Analyze this data",
    "Create a project plan"
  ];

  const handleQuickPrompt = (prompt: string) => {
    setNewMessage(prompt);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="p-6 border-b bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                SysIntelli
              </h1>
              <p className="text-muted-foreground">Your intelligent AI assistant</p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    message.isBot ? 'flex-row' : 'flex-row-reverse'
                  } items-start space-x-3`}
                >
                  <Avatar className="flex-shrink-0">
                    {message.isBot ? (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                    ) : (
                      <>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  
                  <Card className={`${
                    message.isBot 
                      ? 'bg-muted/50 border-muted' 
                      : 'bg-primary text-primary-foreground border-primary'
                  }`}>
                    <CardContent className="p-4">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-2 ${
                        message.isBot ? 'text-muted-foreground' : 'text-primary-foreground/70'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <Avatar className="flex-shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </Avatar>
                  
                  <Card className="bg-muted/50 border-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-muted-foreground">SysIntelli is typing...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-6 pb-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Quick prompts to get started
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="justify-start h-auto p-3 text-left whitespace-normal"
                  >
                    <Zap className="h-3 w-3 mr-2 flex-shrink-0 text-primary" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Input */}
        <div className="p-6 border-t bg-background/80 backdrop-blur-sm">
          <div className="flex space-x-3">
            <Input
              placeholder="Ask SysIntelli anything..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              className="flex-1 min-h-[44px] resize-none"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim() || isTyping}
              className="px-6"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            SysIntelli can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SysIntelliPage;