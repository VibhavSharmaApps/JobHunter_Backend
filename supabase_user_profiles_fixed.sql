-- User Profiles Table for AI-powered job applications
-- Run this in your Supabase SQL editor
-- This script handles existing tables and policies

-- Create user_profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  location VARCHAR(255),
  experience VARCHAR(100),
  education TEXT,
  summary TEXT,
  skills TEXT[], -- Array of skills
  availability VARCHAR(100),
  salary_expectation VARCHAR(100),
  remote_preference BOOLEAN DEFAULT false,
  languages TEXT[], -- Array of languages
  certifications TEXT[], -- Array of certifications
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create work_history table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS work_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  duration VARCHAR(100),
  location VARCHAR(255),
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own work history" ON work_history;
DROP POLICY IF EXISTS "Users can insert own work history" ON work_history;
DROP POLICY IF EXISTS "Users can update own work history" ON work_history;
DROP POLICY IF EXISTS "Users can delete own work history" ON work_history;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for work_history
CREATE POLICY "Users can view own work history" ON work_history
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM user_profiles WHERE id = work_history.user_profile_id
    )
  );

CREATE POLICY "Users can insert own work history" ON work_history
  FOR INSERT WITH CHECK (
    auth.uid() = (
      SELECT user_id FROM user_profiles WHERE id = work_history.user_profile_id
    )
  );

CREATE POLICY "Users can update own work history" ON work_history
  FOR UPDATE USING (
    auth.uid() = (
      SELECT user_id FROM user_profiles WHERE id = work_history.user_profile_id
    )
  );

CREATE POLICY "Users can delete own work history" ON work_history
  FOR DELETE USING (
    auth.uid() = (
      SELECT user_id FROM user_profiles WHERE id = work_history.user_profile_id
    )
  );

-- Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_work_history_profile_id ON work_history(user_profile_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_work_history_updated_at ON work_history;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_history_updated_at 
  BEFORE UPDATE ON work_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'User profiles tables and policies created successfully!' as message; 