-- Create a test profile for the user
-- Run this in your Supabase SQL Editor

-- First, verify the user exists
SELECT id, email FROM users WHERE id = 'ebeabec3-d3f3-4bc8-89bd-2749f00dcb80';

-- Create a test profile
INSERT INTO user_profiles (
  user_id,
  name,
  email,
  phone,
  location,
  experience,
  education,
  summary,
  skills,
  availability,
  salary_expectation,
  remote_preference,
  languages,
  certifications,
  linkedin_url,
  github_url,
  portfolio_url,
  created_at,
  updated_at
) VALUES (
  'ebeabec3-d3f3-4bc8-89bd-2749f00dcb80',
  'Vbhav Sharma',
  'vbhav.sharma@gmail.com',
  '+1-555-123-4567',
  'New York, NY',
  '3-5',
  'Bachelor of Science',
  'Experienced software developer with expertise in modern web technologies.',
  ARRAY['JavaScript', 'React', 'Node.js', 'Python'],
  'Immediate',
  '$80,000 - $120,000',
  true,
  ARRAY['English', 'Hindi'],
  ARRAY['AWS Certified Developer'],
  'https://linkedin.com/in/vbhav',
  'https://github.com/vbhav',
  'https://vbhav.dev',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  location = EXCLUDED.location,
  experience = EXCLUDED.experience,
  education = EXCLUDED.education,
  summary = EXCLUDED.summary,
  skills = EXCLUDED.skills,
  availability = EXCLUDED.availability,
  salary_expectation = EXCLUDED.salary_expectation,
  remote_preference = EXCLUDED.remote_preference,
  languages = EXCLUDED.languages,
  certifications = EXCLUDED.certifications,
  linkedin_url = EXCLUDED.linkedin_url,
  github_url = EXCLUDED.github_url,
  portfolio_url = EXCLUDED.portfolio_url,
  updated_at = NOW();

-- Verify the profile was created
SELECT 
  user_id,
  name,
  email,
  location,
  experience,
  skills
FROM user_profiles 
WHERE user_id = 'ebeabec3-d3f3-4bc8-89bd-2749f00dcb80';

-- Check all profiles
SELECT COUNT(*) as total_profiles FROM user_profiles; 