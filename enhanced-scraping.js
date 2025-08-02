const axios = require('axios');
const cheerio = require('cheerio');

class EnhancedScrapingService {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    
    this.requestDelays = {
      default: 2000,    // 2 seconds between requests
      aggressive: 5000,  // 5 seconds for sites that block easily
      conservative: 10000 // 10 seconds for very sensitive sites
    };
    
    this.maxRetries = 3;
    this.timeout = 15000; // 15 seconds timeout
  }

  // Enhanced scraping with better error handling
  async scrapeWithRetry(url, options = {}) {
    const {
      delay = this.requestDelays.default,
      retries = this.maxRetries,
      userAgent = this.getRandomUserAgent(),
      timeout = this.timeout
    } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Scraping attempt ${attempt}/${retries}: ${url}`);
        
        // Add delay between requests
        if (attempt > 1) {
          await this.delay(delay * attempt); // Exponential backoff
        }

        const response = await axios.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          },
          timeout: timeout,
          validateStatus: function (status) {
            return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
          }
        });

        return response.data;

      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${url}:`, error.message);
        
        if (attempt === retries) {
          throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${error.message}`);
        }

        // Check if we're being blocked
        if (error.response && (error.response.status === 403 || error.response.status === 429)) {
          console.log(`Rate limited or blocked by ${url}, waiting longer...`);
          await this.delay(this.requestDelays.aggressive);
        }
      }
    }
  }

  // Scrape job listings with enhanced selectors
  async scrapeJobListings(url, selectors, titleFilter = '') {
    try {
      const html = await this.scrapeWithRetry(url);
      const $ = cheerio.load(html);
      const jobs = [];

      // Try multiple selector strategies
      const jobElements = this.findJobElements($, selectors);
      
      jobElements.each((i, element) => {
        const $element = $(element);
        const jobData = this.extractJobData($element, selectors);
        
        if (jobData && this.matchesFilter(jobData.title, titleFilter)) {
          jobs.push({
            ...jobData,
            id: `scraped_${i}_${Date.now()}`,
            source: this.extractSourceFromUrl(url),
            postedDate: new Date().toISOString()
          });
        }
      });

      console.log(`Found ${jobs.length} jobs from ${url}`);
      return jobs;

    } catch (error) {
      console.error(`Error scraping ${url}:`, error.message);
      return [];
    }
  }

  // Find job elements using multiple strategies
  findJobElements($, selectors) {
    const strategies = [
      // Strategy 1: Common job listing selectors
      '.job-listing, .job-card, .position, .career-opportunity, .job-item',
      
      // Strategy 2: Links containing job-related paths
      'a[href*="/jobs/"], a[href*="/careers/"], a[href*="/positions/"]',
      
      // Strategy 3: Elements with job-related classes
      '[class*="job"], [class*="position"], [class*="career"]',
      
      // Strategy 4: List items in job sections
      'li:has(a[href*="/jobs/"]), li:has(a[href*="/careers/"])',
      
      // Strategy 5: Custom selectors for specific sites
      ...(selectors || [])
    ];

    for (const strategy of strategies) {
      const elements = $(strategy);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements using strategy: ${strategy}`);
        return elements;
      }
    }

    return $(); // Return empty collection if no elements found
  }

  // Extract job data from element
  extractJobData($element, selectors) {
    const titleSelectors = [
      '.job-title', '.position-title', '.title', 'h3', 'h4', 
      '[class*="title"]', 'a', 'span'
    ];

    const companySelectors = [
      '.company', '.employer', '.organization', '[class*="company"]',
      '[class*="employer"]', '.location + .company'
    ];

    const locationSelectors = [
      '.location', '.place', '[class*="location"]', '.job-location'
    ];

    const urlSelectors = [
      'a[href]', '.job-link', '[class*="link"]'
    ];

    const title = this.extractText($element, titleSelectors);
    const company = this.extractText($element, companySelectors);
    const location = this.extractText($element, locationSelectors);
    const url = this.extractUrl($element, urlSelectors);

    if (!title || !url) {
      return null; // Skip if no title or URL found
    }

    return {
      title: title.trim(),
      company: company.trim() || this.extractCompanyFromUrl(url),
      location: location.trim() || 'Various',
      url: this.normalizeUrl(url),
      salary: this.extractSalary($element),
      experience: this.extractExperience($element)
    };
  }

  // Extract text using multiple selectors
  extractText($element, selectors) {
    for (const selector of selectors) {
      const text = $element.find(selector).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  // Extract URL from element
  extractUrl($element, selectors) {
    for (const selector of selectors) {
      const url = $element.find(selector).first().attr('href');
      if (url) return url;
    }
    return '';
  }

  // Normalize URL (make relative URLs absolute)
  normalizeUrl(url) {
    if (url.startsWith('http')) {
      return url;
    }
    // For relative URLs, we'd need the base URL
    return url;
  }

  // Extract salary information
  extractSalary($element) {
    const salarySelectors = [
      '.salary', '.compensation', '.pay', '[class*="salary"]',
      '[class*="compensation"]', '[class*="pay"]'
    ];
    
    return this.extractText($element, salarySelectors);
  }

  // Extract experience requirements
  extractExperience($element) {
    const experienceSelectors = [
      '.experience', '.requirements', '[class*="experience"]',
      '[class*="requirements"]'
    ];
    
    const text = this.extractText($element, experienceSelectors);
    if (text) {
      const match = text.match(/(\d+)[\s-]+(?:years?|yrs?)/i);
      return match ? `${match[1]}+ years` : text;
    }
    return null;
  }

  // Check if job title matches filter
  matchesFilter(title, filter) {
    if (!filter) return true;
    return title.toLowerCase().includes(filter.toLowerCase());
  }

  // Extract source from URL
  extractSourceFromUrl(url) {
    const hostname = new URL(url).hostname;
    const domain = hostname.replace('www.', '');
    
    const sourceMap = {
      'netflix.com': 'Netflix',
      'stripe.com': 'Stripe',
      'openai.com': 'OpenAI',
      'google.com': 'Google',
      'amazon.com': 'Amazon',
      'microsoft.com': 'Microsoft',
      'apple.com': 'Apple',
      'meta.com': 'Meta',
      'remote.co': 'Remote.co',
      'flexjobs.com': 'FlexJobs',
      'weworkremotely.com': 'WeWorkRemotely',
      'angel.co': 'Angel.co',
      'ycombinator.com': 'YCombinator'
    };

    return sourceMap[domain] || 'Company Career Page';
  }

  // Extract company name from URL
  extractCompanyFromUrl(url) {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').replace('.com', '').replace('.co', '');
  }

  // Get random user agent
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  // Delay function
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Batch scraping with rate limiting
  async scrapeMultiple(urls, options = {}) {
    const results = [];
    const { batchSize = 3, delay = this.requestDelays.default } = options;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urls.length/batchSize)}`);
      
      const batchPromises = batch.map(url => 
        this.scrapeJobListings(url, options.selectors, options.titleFilter)
          .catch(error => {
            console.error(`Failed to scrape ${url}:`, error.message);
            return [];
          })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Add delay between batches
      if (i + batchSize < urls.length) {
        await this.delay(delay);
      }
    }

    return results;
  }
}

module.exports = EnhancedScrapingService; 