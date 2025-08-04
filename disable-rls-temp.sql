-- Temporarily disable RLS for testing
-- Run this in your Supabase SQL Editor

-- Disable RLS on user_profiles table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Test insert (optional)
-- INSERT INTO user_profiles (user_id, name, email, location, experience, education, summary, skills, availability) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test User', 'test@example.com', 'Test Location', '1-3', 'Bachelor', 'Test summary', ARRAY['test'], 'Immediate');

-- Note: Remember to re-enable RLS later with:
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY; 