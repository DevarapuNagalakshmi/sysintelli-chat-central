
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats table for direct messages
CREATE TABLE public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat participants table (many-to-many relationship)
CREATE TABLE public.chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- Create channels table
CREATE TABLE public.channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channel members table
CREATE TABLE public.channel_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Create messages table (for both chats and channels)
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT messages_target_check CHECK (
    (chat_id IS NOT NULL AND channel_id IS NULL) OR 
    (chat_id IS NULL AND channel_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in" ON public.chats FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = chats.id AND user_id = auth.uid()));

CREATE POLICY "Users can create chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view chat participants for their chats" ON public.chat_participants FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()));

CREATE POLICY "Users can add themselves to chats" ON public.chat_participants FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for channels
CREATE POLICY "Users can view channels they are members of" ON public.channels FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.channel_members WHERE channel_id = channels.id AND user_id = auth.uid()));

CREATE POLICY "Users can create channels" ON public.channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Channel creators can update their channels" ON public.channels FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- RLS Policies for channel_members
CREATE POLICY "Users can view channel members for their channels" ON public.channel_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = channel_members.channel_id AND cm.user_id = auth.uid()));

CREATE POLICY "Users can join channels" ON public.channel_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Channel admins can manage members" ON public.channel_members FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.channel_members WHERE channel_id = channel_members.channel_id AND user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their chats" ON public.messages FOR SELECT TO authenticated
USING (
  (chat_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid())) OR
  (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members WHERE channel_id = messages.channel_id AND user_id = auth.uid()))
);

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE TO authenticated 
USING (auth.uid() = sender_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for other tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;

ALTER TABLE public.channel_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
