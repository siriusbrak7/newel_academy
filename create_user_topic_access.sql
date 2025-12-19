-- Create user_topic_access table
CREATE TABLE IF NOT EXISTS user_topic_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_topic_access_user_id ON user_topic_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_access_topic_id ON user_topic_access(topic_id);
