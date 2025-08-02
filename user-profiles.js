// User Profiles Service for AI-powered job applications
const { createClient } = require('@supabase/supabase-js');

class UserProfileService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  // Get user profile by user ID
  async getUserProfile(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select(`
          *,
          work_history (
            id,
            job_title,
            company,
            duration,
            location,
            description,
            start_date,
            end_date,
            is_current
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  // Create or update user profile
  async upsertUserProfile(userId, profileData) {
    try {
      // Check if profile exists
      const { data: existingProfile } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await this.supabase
          .from('user_profiles')
          .update({
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            location: profileData.location,
            experience: profileData.experience,
            education: profileData.education,
            summary: profileData.summary,
            skills: profileData.skills,
            availability: profileData.availability,
            salary_expectation: profileData.salary_expectation,
            remote_preference: profileData.remote_preference,
            languages: profileData.languages,
            certifications: profileData.certifications,
            linkedin_url: profileData.linkedin_url,
            github_url: profileData.github_url,
            portfolio_url: profileData.portfolio_url,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await this.supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            location: profileData.location,
            experience: profileData.experience,
            education: profileData.education,
            summary: profileData.summary,
            skills: profileData.skills,
            availability: profileData.availability,
            salary_expectation: profileData.salary_expectation,
            remote_preference: profileData.remote_preference,
            languages: profileData.languages,
            certifications: profileData.certifications,
            linkedin_url: profileData.linkedin_url,
            github_url: profileData.github_url,
            portfolio_url: profileData.portfolio_url
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      // Handle work history
      if (profileData.work_history && profileData.work_history.length > 0) {
        await this.updateWorkHistory(result.id, profileData.work_history);
      }

      return result;
    } catch (error) {
      console.error('Error in upsertUserProfile:', error);
      throw error;
    }
  }

  // Update work history for a user profile
  async updateWorkHistory(profileId, workHistory) {
    try {
      // Delete existing work history
      await this.supabase
        .from('work_history')
        .delete()
        .eq('user_profile_id', profileId);

      // Insert new work history
      if (workHistory.length > 0) {
        const workHistoryData = workHistory.map(job => ({
          user_profile_id: profileId,
          job_title: job.job_title,
          company: job.company,
          duration: job.duration,
          location: job.location,
          description: job.description,
          start_date: job.start_date,
          end_date: job.end_date,
          is_current: job.is_current || false
        }));

        const { error } = await this.supabase
          .from('work_history')
          .insert(workHistoryData);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error in updateWorkHistory:', error);
      throw error;
    }
  }

  // Get user profile for AI form filling
  async getUserProfileForAI(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        return null;
      }

      // Format profile for AI consumption
      return {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        experience: profile.experience,
        education: profile.education,
        summary: profile.summary,
        skills: profile.skills || [],
        workHistory: profile.work_history || [],
        certifications: profile.certifications || [],
        languages: profile.languages || [],
        availability: profile.availability,
        salary: profile.salary_expectation,
        remote: profile.remote_preference,
        linkedin: profile.linkedin_url,
        github: profile.github_url,
        portfolio: profile.portfolio_url
      };
    } catch (error) {
      console.error('Error in getUserProfileForAI:', error);
      return null;
    }
  }

  // Validate profile data
  validateProfileData(profileData) {
    const errors = [];

    if (!profileData.name || profileData.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!profileData.email || profileData.email.trim() === '') {
      errors.push('Email is required');
    }

    if (!profileData.location || profileData.location.trim() === '') {
      errors.push('Location is required');
    }

    if (!profileData.experience || profileData.experience.trim() === '') {
      errors.push('Experience is required');
    }

    if (!profileData.education || profileData.education.trim() === '') {
      errors.push('Education is required');
    }

    if (!profileData.summary || profileData.summary.trim() === '') {
      errors.push('Professional summary is required');
    }

    if (!profileData.skills || profileData.skills.length === 0) {
      errors.push('At least one skill is required');
    }

    if (!profileData.availability || profileData.availability.trim() === '') {
      errors.push('Availability is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Note: ChatGPT API key is now managed centrally on the backend
  // and accessed via environment variables
}

module.exports = UserProfileService; 