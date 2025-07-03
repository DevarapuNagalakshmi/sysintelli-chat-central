
-- Fix the infinite recursion in channel_members policies
DROP POLICY IF EXISTS "Channel admins can manage members" ON channel_members;
DROP POLICY IF EXISTS "Users can view channel members for their channels" ON channel_members;

-- Create corrected policies for channel_members
CREATE POLICY "Users can view channel members for their channels" 
ON channel_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM channel_members cm 
    WHERE cm.channel_id = channel_members.channel_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Channel admins can manage members" 
ON channel_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM channel_members admin_check 
    WHERE admin_check.channel_id = channel_members.channel_id 
    AND admin_check.user_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

-- Fix the infinite recursion in chat_participants policies  
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;

CREATE POLICY "Users can view chat participants for their chats" 
ON chat_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = chat_participants.chat_id 
    AND cp.user_id = auth.uid()
  )
);
