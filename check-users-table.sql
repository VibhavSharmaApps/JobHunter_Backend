-- Check users table structure
-- Run this in your Supabase SQL Editor

-- Check if users table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing users
SELECT id, email, created_at FROM users LIMIT 5;

-- Check if there are any users at all
SELECT COUNT(*) as total_users FROM users; 