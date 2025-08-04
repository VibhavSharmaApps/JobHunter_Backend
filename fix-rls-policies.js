// Fix RLS Policies for User Profiles
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies...');
  
  try {
    // First, let's check if RLS is enabled
    console.log('1. Checking RLS status...');
    
    // Check if user_profiles table exists and has RLS enabled
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_profiles');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.error('❌ user_profiles table not found');
      return;
    }
    
    console.log('✅ user_profiles table exists');
    
    // Check current policies
    console.log('2. Checking current policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'user_profiles');
    
    if (policiesError) {
      console.log('Note: Could not check existing policies');
    } else {
      console.log('Current policies:', policies?.length || 0);
      policies?.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    // Try to create a test user profile to see the exact error
    console.log('3. Testing profile creation...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Test UUID
    const testProfile = {
      user_id: testUserId,
      name: 'Test User',
      email: 'test@example.com',
      location: 'Test Location',
      experience: '1-3',
      education: 'Bachelor',
      summary: 'Test summary',
      skills: ['test'],
      availability: 'Immediate',
      remote_preference: false,
      languages: [],
      certifications: []
    };
    
    try {
      const { data: insertResult, error: insertError } = await supabase
        .from('user_profiles')
        .insert(testProfile)
        .select();
      
      if (insertError) {
        console.log('❌ Insert test failed (expected):', insertError.message);
        
        // If it's an RLS error, let's try to fix the policies
        if (insertError.message.includes('row-level security policy')) {
          console.log('4. Attempting to fix RLS policies...');
          
          // Try to disable RLS temporarily to test
          console.log('   Temporarily disabling RLS for testing...');
          
          // Note: This would require admin privileges
          console.log('   ⚠️  RLS policy fix requires admin access to Supabase');
          console.log('   Please run the SQL script in Supabase SQL Editor:');
          console.log('');
          console.log('   -- Run this in Supabase SQL Editor:');
          console.log('   DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;');
          console.log('   CREATE POLICY "Users can insert own profile" ON user_profiles');
          console.log('     FOR INSERT WITH CHECK (auth.uid() = user_id);');
          console.log('');
          console.log('   DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;');
          console.log('   CREATE POLICY "Users can update own profile" ON user_profiles');
          console.log('     FOR UPDATE USING (auth.uid() = user_id);');
          console.log('');
          console.log('   DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;');
          console.log('   CREATE POLICY "Users can view own profile" ON user_profiles');
          console.log('     FOR SELECT USING (auth.uid() = user_id);');
        }
      } else {
        console.log('✅ Insert test succeeded');
        
        // Clean up test data
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', testUserId);
      }
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
  }
}

fixRLSPolicies(); 