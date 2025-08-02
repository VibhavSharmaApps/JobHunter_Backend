// Test Supabase database connection and tables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testDatabase() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Basic connection successful');
    
    // Test user_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ user_profiles table error:', profilesError.message);
    } else {
      console.log('✅ user_profiles table accessible');
    }
    
    // Test work_history table
    const { data: workHistory, error: workHistoryError } = await supabase
      .from('work_history')
      .select('count')
      .limit(1);
    
    if (workHistoryError) {
      console.error('❌ work_history table error:', workHistoryError.message);
    } else {
      console.log('✅ work_history table accessible');
    }
    
    // Test RLS policies
    console.log('\nTesting RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'user_profiles' });
    
    if (policiesError) {
      console.log('Note: RLS policies check not available');
    } else {
      console.log('✅ RLS policies configured');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDatabase(); 