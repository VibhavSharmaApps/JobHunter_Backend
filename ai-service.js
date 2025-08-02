// AI Service for centralized ChatGPT integration
const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.CHATGPT_API_KEY;
    this.baseURL = 'https://api.openai.com/v1/chat/completions';
  }

  // Check if AI service is available
  isAvailable() {
    return !!this.apiKey;
  }

  // Generate AI response for job application questions
  async generateApplicationResponse(jobDescription, userProfile, question) {
    if (!this.isAvailable()) {
      throw new Error('ChatGPT API key not configured');
    }

    try {
      const prompt = this.generatePrompt(jobDescription, userProfile, question);
      
      const response = await axios.post(this.baseURL, {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that writes professional job application responses. Provide relevant, honest, and professional answers based on the user\'s background and the job requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('Invalid response from ChatGPT API');
      }
    } catch (error) {
      console.error('ChatGPT API error:', error.message);
      throw new Error('Failed to generate AI response');
    }
  }

  // Generate comprehensive prompt for job application
  generatePrompt(jobDescription, userProfile, question) {
    return `
You are an AI assistant helping a job applicant fill out a job application form. 

JOB DESCRIPTION:
${jobDescription}

USER PROFILE:
Name: ${userProfile.name}
Email: ${userProfile.email}
Location: ${userProfile.location}
Experience: ${userProfile.experience}
Skills: ${userProfile.skills.join(', ')}
Education: ${userProfile.education}
Summary: ${userProfile.summary}
Work History: ${userProfile.workHistory.map(job => `${job.job_title} at ${job.company} (${job.duration})`).join(', ')}
Certifications: ${userProfile.certifications.join(', ')}
Languages: ${userProfile.languages.join(', ')}
Availability: ${userProfile.availability}
Salary Expectation: ${userProfile.salary}
Remote Preference: ${userProfile.remote ? 'Yes' : 'No'}

APPLICATION QUESTION:
${question.label}

INSTRUCTIONS:
1. Analyze the job description and user profile
2. Provide a relevant, honest, and professional answer
3. Match the user's experience and skills to the job requirements
4. Keep the answer concise but comprehensive
5. Use specific examples from the user's background when appropriate
6. Maintain a professional tone throughout

Please provide a well-crafted answer for this application question:`;
  }

  // Generate fallback answer when AI is not available
  generateFallbackAnswer(question) {
    const fallbackAnswers = {
      'experience': 'I have relevant experience in this field and am excited about this opportunity.',
      'skills': 'I possess the required skills and am eager to contribute to your team.',
      'why': 'I am interested in this position because it aligns with my career goals and offers growth opportunities.',
      'salary': 'I am open to discussing salary based on the role requirements and market standards.',
      'availability': 'I am available to start immediately and can work flexible hours as needed.',
      'background': 'I have a strong background in this field and am confident I can contribute effectively.',
      'qualifications': 'I meet the qualifications for this role and am excited about the opportunity.',
      'motivation': 'I am motivated by the opportunity to grow and contribute to your organization.',
      'fit': 'I believe my background and skills make me a strong fit for this role.',
      'contribute': 'I can contribute through my technical skills, experience, and collaborative approach.'
    };

    const lowerQuestion = question.label.toLowerCase();
    for (const [key, answer] of Object.entries(fallbackAnswers)) {
      if (lowerQuestion.includes(key)) {
        return answer;
      }
    }

    return 'I am excited about this opportunity and believe my background makes me a strong candidate for this role.';
  }

  // Process multiple application questions
  async processApplicationQuestions(jobDescription, userProfile, questions) {
    const results = [];
    
    for (const question of questions) {
      try {
        const answer = await this.generateApplicationResponse(jobDescription, userProfile, question);
        results.push({
          question: question.label,
          answer: answer,
          success: true
        });
      } catch (error) {
        console.error(`Error processing question "${question.label}":`, error);
        const fallbackAnswer = this.generateFallbackAnswer(question);
        results.push({
          question: question.label,
          answer: fallbackAnswer,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Test AI service connectivity
  async testConnection() {
    if (!this.isAvailable()) {
      return {
        available: false,
        error: 'ChatGPT API key not configured'
      };
    }

    try {
      const response = await axios.post(this.baseURL, {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.'
          }
        ],
        max_tokens: 10
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        available: true,
        message: 'ChatGPT API connection successful'
      };
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = AIService; 