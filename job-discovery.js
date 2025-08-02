const axios = require('axios');
const cheerio = require('cheerio');
const ComprehensiveJobDiscoveryService = require('./comprehensive-job-discovery');

class JobDiscoveryService {
  constructor() {
    this.comprehensiveService = new ComprehensiveJobDiscoveryService();
    
    this.jobSources = {
      // Job Board APIs
      greenhouse: 'https://boards-api.greenhouse.io/v1/boards',
      lever: 'https://api.lever.co/v0/postings',
      workable: 'https://api.workable.com/spi/v3/jobs',
      
      // Company career pages (will be scraped)
      companyPages: [
        'https://jobs.netflix.com',
        'https://stripe.com/jobs',
        'https://openai.com/careers',
        'https://www.uber.com/careers',
        'https://careers.airbnb.com',
        'https://careers.google.com',
        'https://amazon.jobs',
        'https://careers.microsoft.com',
        'https://jobs.apple.com',
        'https://careers.meta.com'
      ],
      
      // Remote job sites
      remoteSites: [
        'https://remote.co',
        'https://flexjobs.com',
        'https://weworkremotely.com'
      ]
    };
  }

  // Main job discovery method
  async discoverJobs(preferences) {
    const {
      title,
      location,
      experience,
      postedAfter,
      jobBoards,
      remote,
      categories = [],
      countries = ["US", "UK", "CA"]
    } = preferences;

    console.log('Discovering jobs with preferences:', preferences);

    let allJobs = [];

    try {
      // Use comprehensive service for broad job discovery
      if (jobBoards.includes('all') || jobBoards.includes('comprehensive')) {
        console.log('Using comprehensive job discovery service');
        const comprehensiveJobs = await this.comprehensiveService.discoverJobs(preferences);
        allJobs = allJobs.concat(comprehensiveJobs);
      }

      // Fetch from traditional job board APIs
      if (jobBoards.includes('all') || jobBoards.includes('greenhouse')) {
        const greenhouseJobs = await this.fetchGreenhouseJobs(title, location, remote);
        allJobs = allJobs.concat(greenhouseJobs);
      }

      if (jobBoards.includes('all') || jobBoards.includes('lever')) {
        const leverJobs = await this.fetchLeverJobs(title, location, remote);
        allJobs = allJobs.concat(leverJobs);
      }

      if (jobBoards.includes('all') || jobBoards.includes('company_careers')) {
        const companyJobs = await this.fetchCompanyCareerJobs(title, location, remote);
        allJobs = allJobs.concat(companyJobs);
      }

      if (jobBoards.includes('all') || jobBoards.includes('remote_jobs')) {
        const remoteJobs = await this.fetchRemoteJobs(title, location);
        allJobs = allJobs.concat(remoteJobs);
      }

      // Filter by date and experience
      allJobs = this.filterJobsByCriteria(allJobs, {
        postedAfter,
        experience,
        remote
      });

      console.log(`Found ${allJobs.length} jobs matching criteria`);
      return allJobs;

    } catch (error) {
      console.error('Error discovering jobs:', error);
      throw new Error('Failed to discover jobs');
    }
  }

  // Fetch jobs from Greenhouse API
  async fetchGreenhouseJobs(title, location, remote) {
    try {
      const response = await axios.get(`${this.jobSources.greenhouse}/greenhouse/jobs`, {
        params: {
          content: title,
          location: location,
          remote: remote ? 'true' : 'false'
        }
      });

      return response.data.jobs.map(job => ({
        id: `greenhouse_${job.id}`,
        title: job.title,
        company: job.company_name,
        location: job.location.name,
        url: job.absolute_url,
        source: 'Greenhouse',
        postedDate: job.updated_at,
        salary: job.salary_range || null,
        experience: this.extractExperience(job.content)
      }));
    } catch (error) {
      console.error('Error fetching Greenhouse jobs:', error);
      return [];
    }
  }

  // Fetch jobs from Lever API
  async fetchLeverJobs(title, location, remote) {
    try {
      const response = await axios.get(`${this.jobSources.lever}/lever`, {
        params: {
          q: title,
          location: location,
          remote: remote ? 'true' : 'false'
        }
      });

      return response.data.map(job => ({
        id: `lever_${job.id}`,
        title: job.text,
        company: job.categories.team,
        location: job.categories.location,
        url: `https://jobs.lever.co/lever/${job.id}`,
        source: 'Lever',
        postedDate: job.createdAt,
        salary: job.categories.commitment || null,
        experience: this.extractExperience(job.descriptionPlain)
      }));
    } catch (error) {
      console.error('Error fetching Lever jobs:', error);
      return [];
    }
  }

  // Scrape company career pages
  async fetchCompanyCareerJobs(title, location, remote) {
    const jobs = [];
    
    for (const companyUrl of this.jobSources.companyPages) {
      try {
        const companyJobs = await this.scrapeCompanyCareerPage(companyUrl, title, location, remote);
        jobs.push(...companyJobs);
      } catch (error) {
        console.error(`Error scraping ${companyUrl}:`, error);
      }
    }

    return jobs;
  }

  // Scrape individual company career page
  async scrapeCompanyCareerPage(companyUrl, title, location, remote) {
    try {
      // 1. HTTP Request to company website
      const response = await axios.get(companyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobHunter/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        timeout: 10000
      });
      
      // 2. Parse HTML with Cheerio
      const $ = cheerio.load(response.data);
      
      // 3. Find job listings using CSS selectors
      $('a[href*="/jobs/"], a[href*="/careers/"], .job-listing').each((i, element) => {
        const $element = $(element);
        const jobTitle = $element.find('.job-title, h3, h4').text().trim();
        const jobUrl = $element.attr('href');
        
        // 4. Filter by job title
        if (jobTitle.toLowerCase().includes(title.toLowerCase())) {
          jobs.push({
            id: `company_${i}_${Date.now()}`,
            title: jobTitle,
            company: this.extractCompanyName(companyUrl),
            url: jobUrl,
            source: 'Company Career Page',
            postedDate: new Date().toISOString()
          });
        }
      });
      
      return jobs;
    } catch (error) {
      console.error(`Error scraping ${companyUrl}:`, error);
      return [];
    }
  }

  // Fetch remote jobs
  async fetchRemoteJobs(title, location) {
    const jobs = [];
    
    for (const remoteSite of this.jobSources.remoteSites) {
      try {
        const remoteJobs = await this.scrapeRemoteJobSite(remoteSite, title, location);
        jobs.push(...remoteJobs);
      } catch (error) {
        console.error(`Error scraping ${remoteSite}:`, error);
      }
    }

    return jobs;
  }

  // Scrape remote job sites
  async scrapeRemoteJobSite(siteUrl, title, location) {
    try {
      const response = await axios.get(siteUrl);
      const $ = cheerio.load(response.data);
      const jobs = [];

      // Look for remote job listings
      $('.job-listing, .remote-job, .position').each((i, element) => {
        const $element = $(element);
        const jobTitle = $element.find('.job-title, .title, h3').text().trim();
        const jobUrl = $element.find('a').attr('href');
        
        if (jobTitle.toLowerCase().includes(title.toLowerCase())) {
          jobs.push({
            id: `remote_${i}_${Date.now()}`,
            title: jobTitle,
            company: $element.find('.company, .employer').text().trim() || 'Remote Company',
            location: 'Remote',
            url: jobUrl.startsWith('http') ? jobUrl : `${siteUrl}${jobUrl}`,
            source: 'Remote Job Site',
            postedDate: new Date().toISOString(),
            salary: $element.find('.salary, .compensation').text().trim() || null,
            experience: null
          });
        }
      });

      return jobs;
    } catch (error) {
      console.error(`Error scraping ${siteUrl}:`, error);
      return [];
    }
  }

  // Filter jobs by criteria
  filterJobsByCriteria(jobs, criteria) {
    return jobs.filter(job => {
      // Filter by date
      if (criteria.postedAfter) {
        const jobDate = new Date(job.postedDate);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(criteria.postedAfter));
        
        if (jobDate < cutoffDate) return false;
      }

      // Filter by experience
      if (criteria.experience && job.experience) {
        const jobExp = this.parseExperience(job.experience);
        const requiredExp = this.parseExperience(criteria.experience);
        
        if (jobExp < requiredExp) return false;
      }

      // Filter by remote preference
      if (criteria.remote && !job.location.toLowerCase().includes('remote')) {
        return false;
      }

      return true;
    });
  }

  // Extract experience from job description
  extractExperience(content) {
    if (!content) return null;
    
    const experienceRegex = /(\d+)[\s-]+(?:years?|yrs?)/i;
    const match = content.match(experienceRegex);
    
    if (match) {
      return `${match[1]}+ years`;
    }
    
    return null;
  }

  // Parse experience string to number
  parseExperience(experience) {
    if (!experience) return 0;
    
    const match = experience.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Extract company name from URL
  extractCompanyName(url) {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').replace('.com', '').replace('.co', '');
  }

  // Search jobs using Google Jobs API (if available)
  async searchGoogleJobs(query, location) {
    try {
      // Note: Google Jobs API requires API key and has usage limits
      const response = await axios.get('https://jobs.googleapis.com/v1/jobs/search', {
        params: {
          query: query,
          location: location,
          maxResults: 50
        },
        headers: {
          'Authorization': `Bearer ${process.env.GOOGLE_JOBS_API_KEY}`
        }
      });

      return response.data.jobs.map(job => ({
        id: `google_${job.id}`,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.applicationUrl,
        source: 'Google Jobs',
        postedDate: job.postingDate,
        salary: job.salary || null,
        experience: null
      }));
    } catch (error) {
      console.error('Error searching Google Jobs:', error);
      return [];
    }
  }
}

module.exports = JobDiscoveryService; 