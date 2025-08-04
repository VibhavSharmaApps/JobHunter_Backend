-- Check RLS Policies Status
-- Run this in your Supabase SQL Editor

-- Check what policies exist for user_profiles
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'INSERT' THEN 'CREATE'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    ELSE cmd
  END as operation
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd;

-- Check if RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Count existing profiles (if any)
SELECT COUNT(*) as total_profiles FROM user_profiles; 