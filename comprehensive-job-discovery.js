const axios = require('axios');
const cheerio = require('cheerio');
const ComprehensiveJobSources = require('./comprehensive-job-sources');

class ComprehensiveJobDiscoveryService {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    
    this.requestDelays = {
      government: 3000,    // 3 seconds for government sites
      gig: 2000,          // 2 seconds for gig platforms
      ats: 2500,          // 2.5 seconds for ATS platforms
      niche: 2000,        // 2 seconds for niche boards
      company: 2000       // 2 seconds for company sites
    };
    
    this.maxRetries = 3;
    this.timeout = 20000; // 20 seconds timeout for government sites
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

    console.log('Comprehensive job discovery with preferences:', preferences);

    let allJobs = [];

    try {
      // Determine which sources to scrape based on preferences
      const sourcesToScrape = this.determineSourcesToScrape(jobBoards, categories, countries);

      // Limit to first 3 source types for faster response
      const limitedSources = sourcesToScrape.slice(0, 3);

      // Scrape from each source type
      for (const sourceType of limitedSources) {
        const jobs = await this.scrapeSourceType(sourceType, preferences);
        allJobs = allJobs.concat(jobs);
        
        // Stop if we have enough jobs
        if (allJobs.length >= 20) {
          break;
        }
      }

      // Filter jobs by criteria
      allJobs = this.filterJobsByCriteria(allJobs, {
        postedAfter,
        experience,
        remote,
        location
      });

      console.log(`Found ${allJobs.length} jobs from comprehensive sources`);
      return allJobs;

    } catch (error) {
      console.error('Error in comprehensive job discovery:', error);
      throw new Error('Failed to discover jobs');
    }
  }

  // Determine which sources to scrape based on preferences
  determineSourcesToScrape(jobBoards, categories, countries) {
    const sources = [];

    // If "all" is selected or no specific boards, scrape all relevant sources
    if (jobBoards.includes('all') || jobBoards.length === 0) {
      // Add government sources if any country is selected
      if (countries.some(c => ['US', 'UK', 'CA'].includes(c))) {
        if (countries.includes('US')) sources.push('usGovernment');
        if (countries.includes('UK')) sources.push('ukGovernment');
        if (countries.includes('CA')) sources.push('canadaGovernment');
      }

      // Add gig economy if relevant categories
      if (categories.some(c => ['blue-collar', 'admin'].includes(c))) {
        sources.push('gigEconomy');
      }

      // Add ATS platforms
      sources.push('atsPlatforms');

      // Add niche boards based on categories
      if (categories.includes('blue-collar')) {
        sources.push('blueCollarBoards');
      }
      if (categories.includes('admin')) {
        sources.push('adminBoards');
      }

      // Add regional boards
      sources.push('regionalBoards');

      // Add company career pages
      sources.push('companyCareerPages');
    } else {
      // Map specific job board selections to source types
      const boardToSourceMap = {
        'government': ['usGovernment', 'ukGovernment', 'canadaGovernment'],
        'gig': ['gigEconomy'],
        'ats': ['atsPlatforms'],
        'blue-collar': ['blueCollarBoards'],
        'admin': ['adminBoards'],
        'regional': ['regionalBoards'],
        'company': ['companyCareerPages']
      };

      jobBoards.forEach(board => {
        if (boardToSourceMap[board]) {
          sources.push(...boardToSourceMap[board]);
        }
      });
    }

    return [...new Set(sources)]; // Remove duplicates
  }

  // Scrape from a specific source type
  async scrapeSourceType(sourceType, preferences) {
    const sourceConfig = ComprehensiveJobSources[sourceType];
    if (!sourceConfig) {
      console.log(`Source type ${sourceType} not found`);
      return [];
    }

    console.log(`Scraping from ${sourceConfig.name}`);
    const allJobs = [];

    // Limit to first 3 sources for faster response
    const limitedSources = sourceConfig.sources.slice(0, 3);

    for (const source of limitedSources) {
      try {
        // Check if source matches country preferences
        if (preferences.countries && !preferences.countries.includes(source.country)) {
          continue;
        }

        // Check if source matches category preferences
        if (preferences.categories && !source.categories.some(cat => preferences.categories.includes(cat))) {
          continue;
        }

        const jobs = await this.scrapeJobSource(source, preferences);
        allJobs.push(...jobs);

        // Reduced delay for faster response
        await this.delay(1000); // 1 second instead of 2-3 seconds

      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error.message);
      }
    }

    return allJobs;
  }

  // Scrape from a specific job source
  async scrapeJobSource(source, preferences) {
    try {
      console.log(`Scraping ${source.name} at ${source.url}`);

      const html = await this.scrapeWithRetry(source.url, {
        delay: this.requestDelays[source.type] || this.requestDelays.niche,
        userAgent: this.getRandomUserAgent()
      });

      const $ = cheerio.load(html);
      const jobs = [];

      // Use source-specific selectors
      const selectors = source.scraping.selectors;
      const jobElements = $(selectors.jobs);

      jobElements.each((i, element) => {
        const $element = $(element);
        const jobData = this.extractJobDataFromElement($element, selectors, source);
        
        if (jobData && this.matchesJobPreferences(jobData, preferences)) {
          jobs.push({
            ...jobData,
            id: `${source.name.toLowerCase()}_${i}_${Date.now()}`,
            source: source.name,
            type: source.type,
            country: source.country,
            categories: source.categories,
            postedDate: new Date().toISOString()
          });
        }
      });

      console.log(`Found ${jobs.length} jobs from ${source.name}`);
      return jobs;

    } catch (error) {
      console.error(`Error scraping ${source.name}:`, error.message);
      return [];
    }
  }

  // Extract job data from HTML element
  extractJobDataFromElement($element, selectors, source) {
    const title = $element.find(selectors.title).text().trim();
    const company = $element.find(selectors.company).text().trim() || source.name;
    const location = $element.find(selectors.location).text().trim();
    const salary = $element.find(selectors.salary).text().trim();
    const url = $element.find(selectors.url).attr('href');

    if (!title || !url) {
      return null;
    }

    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url, source.url);

    return {
      title: title,
      company: company,
      location: location || 'Various',
      url: normalizedUrl,
      salary: salary || null,
      experience: this.extractExperienceFromText(title + ' ' + $element.text())
    };
  }

  // Check if job matches user preferences
  matchesJobPreferences(job, preferences) {
    const { title, location, remote, categories } = preferences;

    // Check title match
    if (title && !job.title.toLowerCase().includes(title.toLowerCase())) {
      return false;
    }

    // Check location match
    if (location && !job.location.toLowerCase().includes(location.toLowerCase())) {
      return false;
    }

    // Check remote preference
    if (remote && !job.location.toLowerCase().includes('remote')) {
      return false;
    }

    // Check category match
    if (categories && categories.length > 0) {
      const jobCategories = job.categories || [];
      if (!categories.some(cat => jobCategories.includes(cat))) {
        return false;
      }
    }

    return true;
  }

  // Enhanced scraping with retry logic
  async scrapeWithRetry(url, options = {}) {
    const {
      delay = this.requestDelays.niche,
      retries = this.maxRetries,
      userAgent = this.getRandomUserAgent(),
      timeout = this.timeout
    } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Scraping attempt ${attempt}/${retries}: ${url}`);
        
        // Add delay between attempts
        if (attempt > 1) {
          await this.delay(delay * attempt);
        }

        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'Referer': 'https://www.google.com/'
          },
          timeout: timeout,
          validateStatus: function (status) {
            return status >= 200 && status < 400;
          }
        });

        return response.data;

      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${url}:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${error.message}`);
        }

        // Handle specific error types
        if (error.response) {
          if (error.response.status === 403 || error.response.status === 429) {
            console.log(`Rate limited by ${url}, waiting longer...`);
            await this.delay(this.requestDelays.aggressive || 10000);
          } else if (error.response.status === 404) {
            console.log(`Page not found: ${url}`);
            break; // Don't retry 404 errors
          }
        }
      }
    }
  }

  // Normalize URL (make relative URLs absolute)
  normalizeUrl(url, baseUrl) {
    if (url.startsWith('http')) {
      return url;
    }
    
    try {
      const base = new URL(baseUrl);
      return new URL(url, base).href;
    } catch (error) {
      return url;
    }
  }

  // Extract experience from text
  extractExperienceFromText(text) {
    const experienceRegex = /(\d+)[\s-]+(?:years?|yrs?)/i;
    const match = text.match(experienceRegex);
    
    if (match) {
      return `${match[1]}+ years`;
    }
    
    return null;
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

      // Filter by location
      if (criteria.location && !job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        return false;
      }

      return true;
    });
  }

  // Parse experience string to number
  parseExperience(experience) {
    if (!experience) return 0;
    
    const match = experience.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Get random user agent
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  // Delay function
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get available job categories
  getAvailableCategories() {
    const categories = new Set();
    
    Object.values(ComprehensiveJobSources).forEach(sourceType => {
      sourceType.sources.forEach(source => {
        source.categories.forEach(category => categories.add(category));
      });
    });

    return Array.from(categories);
  }

  // Get available countries
  getAvailableCountries() {
    const countries = new Set();
    
    Object.values(ComprehensiveJobSources).forEach(sourceType => {
      sourceType.sources.forEach(source => {
        countries.add(source.country);
      });
    });

    return Array.from(countries);
  }

  // Get source statistics
  getSourceStatistics() {
    const stats = {
      totalSources: 0,
      byCountry: {},
      byCategory: {},
      byType: {}
    };

    Object.values(ComprehensiveJobSources).forEach(sourceType => {
      sourceType.sources.forEach(source => {
        stats.totalSources++;
        
        // Count by country
        stats.byCountry[source.country] = (stats.byCountry[source.country] || 0) + 1;
        
        // Count by category
        source.categories.forEach(category => {
          stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        });
        
        // Count by type
        stats.byType[source.type] = (stats.byType[source.type] || 0) + 1;
      });
    });

    return stats;
  }
}

module.exports = ComprehensiveJobDiscoveryService; 