-- Create the missing user manually
-- Run this in your Supabase SQL Editor

-- Insert the missing user
INSERT INTO users (id, email, password_hash, created_at)
VALUES (
  'ebeabec3-d3f3-4bc8-89bd-2749f00dcb80',
  'vbhav.sharma@gmail.com',
  'temp_hash_for_existing_user',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify the user was created
SELECT id, email, created_at FROM users WHERE id = 'ebeabec3-d3f3-4bc8-89bd-2749f00dcb80';

-- Check all users
SELECT id, email, created_at FROM users ORDER BY created_at; 