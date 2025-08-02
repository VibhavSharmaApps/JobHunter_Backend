-- Complete Reset Script for User Profiles Policies
-- Run this in Supabase SQL editor to completely reset policies

-- Step 1: Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_history DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (using wildcard approach)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies for user_profiles
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON user_profiles';
    END LOOP;
    
    -- Drop all policies for work_history
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'work_history'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON work_history';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;

-- Step 4: Create fresh policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create fresh policies for work_history
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

-- Step 6: Verify policies
SELECT 'Policies created successfully!' as status;
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'work_history')
ORDER BY tablename, policyname; 