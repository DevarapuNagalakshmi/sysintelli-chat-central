import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Video, Plus, Calendar, Clock, Users, Phone, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduled_time: string;
  duration: number;
  status: 'scheduled' | 'ongoing' | 'completed';
  participants: User[];
  meeting_link?: string;
}

interface MeetingsPageProps {
  user: User;
}

const MeetingsPage: React.FC<MeetingsPageProps> = ({ user }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: '1',
      title: 'Team Standup',
      description: 'Daily team sync meeting',
      scheduled_time: new Date(Date.now() + 3600000).toISOString(),
      duration: 30,
      status: 'scheduled',
      participants: [
        { id: '1', name: 'John Doe', email: 'john@sysintelli.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@sysintelli.com' }
      ],
      meeting_link: 'https://meet.sysintelli.com/room/standup'
    },
    {
      id: '2',
      title: 'Project Review',
      description: 'Weekly project review and planning',
      scheduled_time: new Date(Date.now() + 86400000).toISOString(),
      duration: 60,
      status: 'scheduled',
      participants: [
        { id: '1', name: 'John Doe', email: 'john@sysintelli.com' },
        { id: '3', name: 'Bob Wilson', email: 'bob@sysintelli.com' }
      ],
      meeting_link: 'https://meet.sysintelli.com/room/review'
    }
  ]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDescription, setNewMeetingDescription] = useState('');
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const { toast } = useToast();

  const createMeeting = () => {
    if (!newMeetingTitle.trim()) return;

    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: newMeetingTitle,
      description: newMeetingDescription,
      scheduled_time: new Date(Date.now() + 3600000).toISOString(),
      duration: 30,
      status: 'scheduled',
      participants: [user],
      meeting_link: `https://meet.sysintelli.com/room/${Date.now()}`
    };

    setMeetings(prev => [newMeeting, ...prev]);
    setNewMeetingTitle('');
    setNewMeetingDescription('');
    setIsNewMeetingOpen(false);
    
    toast({
      title: "Meeting scheduled",
      description: `Created meeting "${newMeetingTitle}"`,
    });
  };

  const joinMeeting = (meeting: Meeting) => {
    if (meeting.meeting_link) {
      window.open(meeting.meeting_link, '_blank');
    } else {
      toast({
        title: "Meeting not available",
        description: "This meeting doesn't have a valid link",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: Meeting['status']) => {
    switch (status) {
      case 'ongoing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) > new Date();
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Video className="mr-3 h-7 w-7 text-primary" />
              Meetings
            </h1>
            <p className="text-muted-foreground mt-1">Manage your video conferences and meetings</p>
          </div>
          <Dialog open={isNewMeetingOpen} onOpenChange={setIsNewMeetingOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Meeting Title</label>
                  <Input
                    placeholder="Enter meeting title..."
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Input
                    placeholder="Enter meeting description..."
                    value={newMeetingDescription}
                    onChange={(e) => setNewMeetingDescription(e.target.value)}
                  />
                </div>
                <Button onClick={createMeeting} disabled={!newMeetingTitle.trim()}>
                  Schedule Meeting
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Instant Meeting</h3>
                <p className="text-sm text-muted-foreground">Start a meeting right now</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Phone className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Join by ID</h3>
                <p className="text-sm text-muted-foreground">Enter meeting ID to join</p>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center space-x-4 p-6">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Schedule Later</h3>
                <p className="text-sm text-muted-foreground">Plan future meetings</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meetings List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Meetings</h2>
          
          {meetings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <VideoOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No meetings scheduled</h3>
                <p className="text-muted-foreground mb-6">Create your first meeting to get started</p>
                <Button onClick={() => setIsNewMeetingOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">{meeting.title}</h3>
                          <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                            {meeting.status}
                          </Badge>
                        </div>
                        
                        {meeting.description && (
                          <p className="text-muted-foreground mb-3">{meeting.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatTime(meeting.scheduled_time)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>{meeting.duration} minutes</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>{meeting.participants.length} participants</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {meeting.participants.slice(0, 3).map((participant) => (
                            <Avatar key={participant.id} className="h-6 w-6">
                              <AvatarImage src={participant.avatar} />
                              <AvatarFallback className="text-xs">
                                {participant.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.participants.length > 3 && (
                            <div className="text-sm text-muted-foreground">
                              +{meeting.participants.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {isUpcoming(meeting.scheduled_time) && meeting.status === 'scheduled' && (
                          <Button
                            onClick={() => joinMeeting(meeting)}
                            variant="default"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join
                          </Button>
                        )}
                        {meeting.status === 'ongoing' && (
                          <Button
                            onClick={() => joinMeeting(meeting)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Join Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingsPage;