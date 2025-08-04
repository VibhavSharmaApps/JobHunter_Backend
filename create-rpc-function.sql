-- Create RPC function to bypass RLS for profile operations
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id UUID,
  p_name VARCHAR(255),
  p_email VARCHAR(255),
  p_phone VARCHAR(50),
  p_location VARCHAR(255),
  p_experience VARCHAR(100),
  p_education TEXT,
  p_summary TEXT,
  p_skills TEXT[],
  p_availability VARCHAR(100),
  p_salary_expectation VARCHAR(100),
  p_remote_preference BOOLEAN,
  p_languages TEXT[],
  p_certifications TEXT[],
  p_linkedin_url VARCHAR(500),
  p_github_url VARCHAR(500),
  p_portfolio_url VARCHAR(500)
) RETURNS JSON AS $$
DECLARE
  existing_profile RECORD;
  result_profile RECORD;
BEGIN
  -- Check if profile exists
  SELECT * INTO existing_profile 
  FROM user_profiles 
  WHERE user_id = p_user_id;
  
  IF existing_profile IS NOT NULL THEN
    -- Update existing profile
    UPDATE user_profiles SET
      name = p_name,
      email = p_email,
      phone = p_phone,
      location = p_location,
      experience = p_experience,
      education = p_education,
      summary = p_summary,
      skills = p_skills,
      availability = p_availability,
      salary_expectation = p_salary_expectation,
      remote_preference = p_remote_preference,
      languages = p_languages,
      certifications = p_certifications,
      linkedin_url = p_linkedin_url,
      github_url = p_github_url,
      portfolio_url = p_portfolio_url,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO result_profile;
  ELSE
    -- Create new profile
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
      portfolio_url
    ) VALUES (
      p_user_id,
      p_name,
      p_email,
      p_phone,
      p_location,
      p_experience,
      p_education,
      p_summary,
      p_skills,
      p_availability,
      p_salary_expectation,
      p_remote_preference,
      p_languages,
      p_certifications,
      p_linkedin_url,
      p_github_url,
      p_portfolio_url
    )
    RETURNING * INTO result_profile;
  END IF;
  
  -- Return the profile as JSON
  RETURN json_build_object(
    'id', result_profile.id,
    'user_id', result_profile.user_id,
    'name', result_profile.name,
    'email', result_profile.email,
    'phone', result_profile.phone,
    'location', result_profile.location,
    'experience', result_profile.experience,
    'education', result_profile.education,
    'summary', result_profile.summary,
    'skills', result_profile.skills,
    'availability', result_profile.availability,
    'salary_expectation', result_profile.salary_expectation,
    'remote_preference', result_profile.remote_preference,
    'languages', result_profile.languages,
    'certifications', result_profile.certifications,
    'linkedin_url', result_profile.linkedin_url,
    'github_url', result_profile.github_url,
    'portfolio_url', result_profile.portfolio_url,
    'created_at', result_profile.created_at,
    'updated_at', result_profile.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_profile TO anon; 