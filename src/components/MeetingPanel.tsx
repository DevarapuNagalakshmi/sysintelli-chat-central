
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, Clock, Users, Video, VideoOff, Mic, MicOff, PhoneOff, Plus } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Meeting {
  id: string;
  title: string;
  date: Date;
  time: string;
  host: string;
  participants: User[];
  status: 'scheduled' | 'active' | 'ended';
}

interface MeetingPanelProps {
  user: User;
}

const MeetingPanel: React.FC<MeetingPanelProps> = ({ user }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);

  const handleScheduleMeeting = () => {
    if (!meetingTitle.trim() || !meetingTime.trim()) return;

    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: meetingTitle,
      date: selectedDate,
      time: meetingTime,
      host: user.name,
      participants: [user],
      status: 'scheduled'
    };

    setMeetings(prev => [...prev, newMeeting]);
    setMeetingTitle('');
    setMeetingTime('');
    setShowScheduler(false);
    
    console.log('Scheduling meeting in Supabase:', newMeeting);
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setMeetings(prev => 
      prev.map(m => m.id === meeting.id ? { ...m, status: 'active' as const } : m)
    );
  };

  const handleEndMeeting = () => {
    if (activeMeeting) {
      setMeetings(prev => 
        prev.map(m => m.id === activeMeeting.id ? { ...m, status: 'ended' as const } : m)
      );
      setActiveMeeting(null);
    }
  };

  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled');
  const todayMeetings = upcomingMeetings.filter(m => 
    m.date.toDateString() === new Date().toDateString()
  );

  return (
    <div className="h-full p-4">
      {activeMeeting ? (
        // Video Call Interface
        <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
          {/* Video Area */}
          <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Avatar className="w-28 h-28">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-xl font-semibold">{activeMeeting.title}</h3>
              <p className="text-gray-300">Meeting in progress...</p>
            </div>
            
            {/* Participants Grid */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              {activeMeeting.participants.map((participant, index) => (
                <div key={participant.id} className="w-24 h-18 bg-gray-700 rounded-lg flex items-center justify-center">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              ))}
            </div>
          </div>
          
          {/* Meeting Controls */}
          <div className="bg-gray-900 p-4 flex justify-center space-x-4">
            <Button
              variant={isAudioOn ? "default" : "destructive"}
              size="lg"
              onClick={() => setIsAudioOn(!isAudioOn)}
              className="rounded-full w-12 h-12"
            >
              {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant={isVideoOn ? "default" : "destructive"}
              size="lg"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="rounded-full w-12 h-12"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndMeeting}
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      ) : (
        // Meeting Dashboard
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Schedule Meeting</span>
                <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule New Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Meeting title"
                        value={meetingTitle}
                        onChange={(e) => setMeetingTitle(e.target.value)}
                      />
                      <div className="flex space-x-2">
                        <Input
                          type="time"
                          value={meetingTime}
                          onChange={(e) => setMeetingTime(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        className="rounded-md border"
                      />
                      <Button onClick={handleScheduleMeeting} className="w-full">
                        Schedule Meeting
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Today's Meetings */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Today's Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayMeetings.length > 0 ? (
                  todayMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {meeting.time} • Host: {meeting.host}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {meeting.participants.length} participants
                          </p>
                        </div>
                        <Button size="sm" onClick={() => handleJoinMeeting(meeting)}>
                          Join
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No meetings scheduled for today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Meetings */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Upcoming Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeetings.length > 0 ? (
                  upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{meeting.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {meeting.date.toLocaleDateString()} at {meeting.time}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Host: {meeting.host}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {meeting.participants.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No upcoming meetings
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MeetingPanel;
