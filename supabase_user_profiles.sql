-- User Profiles Table for AI-powered job applications
-- Run this in your Supabase SQL editor

-- Create user_profiles table
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

-- Create work_history table for detailed job experience
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

-- Create RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;

-- Policy for user_profiles - users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Policy for work_history - users can only access their own work history
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_work_history_profile_id ON work_history(user_profile_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_history_updated_at 
  BEFORE UPDATE ON work_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
-- INSERT INTO user_profiles (user_id, name, email, phone, location, experience, education, summary, skills, availability, salary_expectation, remote_preference) 
-- VALUES (
--   'your-user-id-here',
--   'John Doe',
--   'john.doe@example.com',
--   '+1-555-123-4567',
--   'San Francisco, CA',
--   '5 years',
--   'Bachelor''s in Computer Science',
--   'Experienced software engineer with expertise in React, Node.js, and cloud technologies.',
--   ARRAY['React', 'Node.js', 'JavaScript', 'TypeScript', 'AWS', 'Docker'],
--   '2 weeks notice',
--   '$120,000 - $150,000',
--   true
-- ); 