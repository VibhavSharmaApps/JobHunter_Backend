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
        
        // Add timeout and limit for faster response
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Job discovery timeout')), 30000) // 30 second timeout
        );
        
        try {
          const comprehensiveJobs = await Promise.race([
            this.comprehensiveService.discoverJobs(preferences),
            timeoutPromise
          ]);
          
          // Limit results to first 20 jobs for faster response
          const limitedJobs = comprehensiveJobs.slice(0, 20);
          allJobs = allJobs.concat(limitedJobs);
          
        } catch (error) {
          console.log('Comprehensive search failed, trying Google search:', error.message);
          
          // Use performance-optimized search for large website lists
          console.log('Comprehensive search failed, using performance-optimized search');
          
          try {
            // Use optimized search that handles large website lists efficiently
            const optimizedJobs = await this.searchWithPerformanceOptimization(preferences, 50);
            allJobs = allJobs.concat(optimizedJobs);
            console.log(`Found ${optimizedJobs.length} jobs via optimized search`);
          } catch (error) {
            console.log('Optimized search also failed:', error.message);
            allJobs = [];
          }
        }
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

  // Search only 100% compliant sources (no TOS violations)
  async searchCompliantSources(preferences) {
    const jobs = [];
    const { title, location } = preferences;
    
    try {
      // Parallel execution for speed
      const [governmentJobs, rssJobs, apiJobs] = await Promise.all([
        this.searchGovernmentJobs(title, location),
        this.searchRSSFeeds(title, location),
        this.searchPublicAPIs(title, location)
      ]);
      
      jobs.push(...governmentJobs, ...rssJobs, ...apiJobs);
      
    } catch (error) {
      console.error('Error searching compliant sources:', error);
    }
    
    return jobs;
  }

  // Search government job boards (100% compliant - public data)
  async searchGovernmentJobs(query, location) {
    const jobs = [];
    
    // Government job boards explicitly allow public access
    const governmentSources = [
      {
        name: 'USAJOBS',
        url: `https://www.usajobs.gov/Search/Results?Keyword=${encodeURIComponent(query)}&LocationName=${encodeURIComponent(location)}`,
        apiUrl: `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(query)}&LocationName=${encodeURIComponent(location)}`
      },
      {
        name: 'NYC Jobs',
        url: `https://a127-jobs.nyc.gov/search/?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
        apiUrl: `https://a127-jobs.nyc.gov/api/jobs?q=${encodeURIComponent(query)}`
      }
    ];
    
    for (const source of governmentSources) {
      try {
        // Government APIs are explicitly public and allow access
        const response = await axios.get(source.apiUrl, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (response.data.SearchResult && response.data.SearchResult.SearchResultItems) {
          const governmentJobs = response.data.SearchResult.SearchResultItems.map(job => ({
            id: `gov_${job.MatchedObjectId}`,
            title: job.MatchedObjectDescriptor.PositionTitle,
            company: job.MatchedObjectDescriptor.OrganizationName,
            location: job.MatchedObjectDescriptor.PositionLocationDisplay,
            url: job.MatchedObjectDescriptor.PositionURI,
            source: source.name,
            postedDate: job.MatchedObjectDescriptor.PublicationStartDate,
            salary: job.MatchedObjectDescriptor.PositionRemuneration?.[0]?.MinimumRange || null,
            experience: null
          }));
          
          jobs.push(...governmentJobs);
        }
        
      } catch (error) {
        console.error(`Error searching ${source.name}:`, error.message);
      }
    }
    
    return jobs;
  }

  // Search RSS feeds (explicitly public and meant for aggregation)
  async searchRSSFeeds(query, location) {
    const jobs = [];
    
    // RSS feeds are explicitly public and meant for aggregation
    const rssFeeds = [
      {
        name: 'Remote.co RSS',
        url: `https://remote.co/feed/?s=${encodeURIComponent(query)}`
      },
      {
        name: 'WeWorkRemotely RSS',
        url: `https://weworkremotely.com/categories/remote-jobs.rss`
      },
      {
        name: 'Craigslist NYC Jobs RSS',
        url: `https://newyork.craigslist.org/search/jjj?format=rss&query=${encodeURIComponent(query)}`
      },
      {
        name: 'Craigslist NYC Gigs RSS',
        url: `https://newyork.craigslist.org/search/ggg?format=rss&query=${encodeURIComponent(query)}`
      }
    ];
    
    for (const feed of rssFeeds) {
      try {
        const response = await axios.get(feed.url, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': 'application/rss+xml, application/xml'
          },
          timeout: 10000
        });
        
        // Parse RSS feed (simplified - in production use proper RSS parser)
        const rssJobs = this.parseRSSFeed(response.data, feed.name, query, location);
        jobs.push(...rssJobs);
        
      } catch (error) {
        console.error(`Error searching RSS feed ${feed.name}:`, error.message);
      }
    }
    
    return jobs;
  }

  // Parse RSS feed for job listings
  parseRSSFeed(xmlContent, source, query, location) {
    const jobs = [];
    
    // Simple regex-based RSS parsing (in production use proper XML parser)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title>([^<]*)<\/title>/i;
    const linkRegex = /<link>([^<]*)<\/link>/i;
    const descriptionRegex = /<description>([^<]*)<\/description>/i;
    const dateRegex = /<pubDate>([^<]*)<\/pubDate>/i;
    
    let match;
    let jobCount = 0;
    
    while ((match = itemRegex.exec(xmlContent)) !== null && jobCount < 10) {
      const itemContent = match[1];
      
      const titleMatch = titleRegex.exec(itemContent);
      const linkMatch = linkRegex.exec(itemContent);
      const descMatch = descriptionRegex.exec(itemContent);
      const dateMatch = dateRegex.exec(itemContent);
      
      if (titleMatch && linkMatch) {
        const title = titleMatch[1];
        const url = linkMatch[1];
        const description = descMatch ? descMatch[1] : '';
        const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
        
        // For Craigslist, be more lenient with filtering since it's location-specific
        const isRelevant = source.includes('Craigslist') ? 
          true : // Include all Craigslist jobs since they're location-filtered
          (title.toLowerCase().includes(query.toLowerCase()) || 
           description.toLowerCase().includes(query.toLowerCase()));
        
        if (isRelevant) {
          const job = {
            id: `rss_${Date.now()}_${jobCount}`,
            title: title,
            company: this.extractCompanyFromTitle(title),
            location: location,
            url: url,
            source: source,
            postedDate: pubDate,
            salary: this.extractSalaryFromTitle(title),
            experience: null
          };
          
          jobs.push(job);
          jobCount++;
        }
      }
    }
    
    return jobs;
  }

  // Search public APIs that explicitly allow access
  async searchPublicAPIs(query, location) {
    const jobs = [];
    
    // Only use APIs that explicitly allow public access
    const publicAPIs = [
      {
        name: 'GitHub Jobs API',
        url: `https://jobs.github.com/positions.json?search=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`
      }
    ];
    
    for (const api of publicAPIs) {
      try {
        const response = await axios.get(api.url, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        if (Array.isArray(response.data)) {
          const apiJobs = response.data.map(job => ({
            id: `api_${job.id}`,
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url,
            source: api.name,
            postedDate: job.created_at,
            salary: null,
            experience: null
          }));
          
          jobs.push(...apiJobs);
        }
        
      } catch (error) {
        console.error(`Error searching ${api.name}:`, error.message);
      }
    }
    
    return jobs;
  }

  // Extract company name from job title
  extractCompanyFromTitle(title) {
    // Simple extraction - in production use more sophisticated parsing
    const companyPatterns = [
      /at\s+([A-Z][a-zA-Z\s&]+)/i,
      /with\s+([A-Z][a-zA-Z\s&]+)/i,
      /for\s+([A-Z][a-zA-Z\s&]+)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Unknown Company';
  }

  // Extract salary information from job title
  extractSalaryFromTitle(title) {
    // Common salary patterns in job titles
    const salaryPatterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:k|K)?)/g,  // $50k, $50,000
      /(\d{1,3}(?:k|K))\s*(?:per\s*hour|hr|hour)/gi,  // 25/hr, 25 per hour
      /(\d{1,3}(?:k|K))\s*(?:per\s*year|yearly|annual)/gi,  // 50k yearly
      /(\d{1,3}(?:k|K))\s*(?:salary|pay)/gi  // 50k salary
    ];
    
    for (const pattern of salaryPatterns) {
      const matches = title.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return null;
  }

  // Performance-optimized search for large website lists
  async searchWithPerformanceOptimization(preferences, maxWebsites = 50) {
    const jobs = [];
    const { title, location } = preferences;
    
    // Performance settings
    const settings = {
      maxConcurrent: 10,        // Max 10 parallel requests
      maxWebsites: maxWebsites, // Limit total websites
      timeout: 5000,           // 5 second timeout per request
      delay: 100,              // 100ms delay between batches
      maxResults: 20           // Max 20 results total
    };
    
    console.log(`Searching ${settings.maxWebsites} websites with performance optimization...`);
    
    try {
      // 1. Fast sources first (APIs, RSS feeds)
      const fastJobs = await this.searchFastSources(title, location, settings);
      jobs.push(...fastJobs);
      
      // 2. If we have enough results, stop early
      if (jobs.length >= settings.maxResults) {
        console.log(`Found ${jobs.length} jobs from fast sources, stopping early`);
        return jobs.slice(0, settings.maxResults);
      }
      
      // 3. Medium-speed sources (government APIs)
      const mediumJobs = await this.searchMediumSources(title, location, settings);
      jobs.push(...mediumJobs);
      
      // 4. If we have enough results, stop early
      if (jobs.length >= settings.maxResults) {
        console.log(`Found ${jobs.length} jobs from medium sources, stopping early`);
        return jobs.slice(0, settings.maxResults);
      }
      
      // 5. Slow sources only if needed (scraping)
      const slowJobs = await this.searchSlowSources(title, location, settings);
      jobs.push(...slowJobs);
      
    } catch (error) {
      console.error('Error in performance-optimized search:', error);
    }
    
    return jobs.slice(0, settings.maxResults);
  }

  // Fast sources (APIs, RSS feeds) - typically 1-3 seconds
  async searchFastSources(query, location, settings) {
    const jobs = [];
    
    const fastSources = [
      {
        name: 'GitHub Jobs API',
        url: `https://jobs.github.com/positions.json?search=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`,
        type: 'api'
      },
      {
        name: 'Remote.co RSS',
        url: `https://remote.co/feed/?s=${encodeURIComponent(query)}`,
        type: 'rss'
      },
      {
        name: 'Craigslist NYC Jobs RSS',
        url: `https://newyork.craigslist.org/search/jjj?format=rss&query=${encodeURIComponent(query)}`,
        type: 'rss'
      },
      {
        name: 'Craigslist NYC Gigs RSS',
        url: `https://newyork.craigslist.org/search/ggg?format=rss&query=${encodeURIComponent(query)}`,
        type: 'rss'
      }
    ];
    
    // Parallel execution for speed
    const promises = fastSources.map(async (source) => {
      try {
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': source.type === 'api' ? 'application/json' : 'application/rss+xml'
          },
          timeout: settings.timeout
        });
        
        if (source.type === 'api' && Array.isArray(response.data)) {
          return response.data.slice(0, 5).map(job => ({
            id: `fast_${job.id}`,
            title: job.title,
            company: job.company,
            location: job.location,
            url: job.url,
            source: source.name,
            postedDate: job.created_at,
            salary: null,
            experience: null
          }));
        } else if (source.type === 'rss') {
          return this.parseRSSFeed(response.data, source.name, query, location).slice(0, 5);
        }
        
        return [];
      } catch (error) {
        console.error(`Error searching fast source ${source.name}:`, error.message);
        return [];
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(jobs => jobs.push(...jobs));
    
    return jobs;
  }

  // Medium-speed sources (government APIs) - typically 3-8 seconds
  async searchMediumSources(query, location, settings) {
    const jobs = [];
    
    const mediumSources = [
      {
        name: 'USAJOBS',
        url: `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(query)}&LocationName=${encodeURIComponent(location)}`
      },
      {
        name: 'NYC Jobs',
        url: `https://a127-jobs.nyc.gov/api/jobs?q=${encodeURIComponent(query)}`
      }
    ];
    
    // Sequential execution with delays to be respectful
    for (const source of mediumSources) {
      try {
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': 'application/json'
          },
          timeout: settings.timeout
        });
        
        if (response.data.SearchResult && response.data.SearchResult.SearchResultItems) {
          const sourceJobs = response.data.SearchResult.SearchResultItems.slice(0, 5).map(job => ({
            id: `medium_${job.MatchedObjectId}`,
            title: job.MatchedObjectDescriptor.PositionTitle,
            company: job.MatchedObjectDescriptor.OrganizationName,
            location: job.MatchedObjectDescriptor.PositionLocationDisplay,
            url: job.MatchedObjectDescriptor.PositionURI,
            source: source.name,
            postedDate: job.MatchedObjectDescriptor.PublicationStartDate,
            salary: job.MatchedObjectDescriptor.PositionRemuneration?.[0]?.MinimumRange || null,
            experience: null
          }));
          
          jobs.push(...sourceJobs);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, settings.delay));
        
      } catch (error) {
        console.error(`Error searching medium source ${source.name}:`, error.message);
      }
    }
    
    return jobs;
  }

  // Slow sources (scraping) - only if needed, typically 8-15 seconds
  async searchSlowSources(query, location, settings) {
    const jobs = [];
    
    // Only use slow sources if we need more results
    const slowSources = [
      {
        name: 'WeWorkRemotely RSS',
        url: `https://weworkremotely.com/categories/remote-jobs.rss`,
        type: 'rss'
      }
    ];
    
    for (const source of slowSources) {
      try {
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'JobHunter/1.0 (Educational Project)',
            'Accept': 'application/rss+xml'
          },
          timeout: settings.timeout
        });
        
        const sourceJobs = this.parseRSSFeed(response.data, source.name, query, location).slice(0, 5);
        jobs.push(...sourceJobs);
        
        // Longer delay for slow sources
        await new Promise(resolve => setTimeout(resolve, settings.delay * 2));
        
      } catch (error) {
        console.error(`Error searching slow source ${source.name}:`, error.message);
      }
    }
    
    return jobs;
  }

  // Get mock jobs based on preferences
  getMockJobs(preferences) {
    const { title, location, categories = [] } = preferences;
    
    const mockJobs = [
      {
        id: "mock_1",
        title: title || "Janitor",
        company: "ABC Cleaning Services",
        location: location || "New York, NY",
        url: "https://example.com/job1",
        source: "Indeed",
        postedDate: new Date().toISOString(),
        salary: "$15 - $20 per hour",
        experience: "1+ years"
      },
      {
        id: "mock_2",
        title: title || "Custodian",
        company: "City Maintenance Corp",
        location: location || "New York, NY",
        url: "https://example.com/job2",
        source: "Craigslist",
        postedDate: new Date().toISOString(),
        salary: "$16 - $22 per hour",
        experience: "Entry level"
      },
      {
        id: "mock_3",
        title: title || "Building Cleaner",
        company: "Metro Cleaning Solutions",
        location: location || "New York, NY",
        url: "https://example.com/job3",
        source: "Glassdoor",
        postedDate: new Date().toISOString(),
        salary: "$14 - $19 per hour",
        experience: "No experience required"
      },
      {
        id: "mock_4",
        title: title || "Office Cleaner",
        company: "Professional Cleaning Inc",
        location: location || "New York, NY",
        url: "https://example.com/job4",
        source: "LinkedIn",
        postedDate: new Date().toISOString(),
        salary: "$17 - $21 per hour",
        experience: "1+ years preferred"
      },
      {
        id: "mock_5",
        title: title || "Maintenance Worker",
        company: "Building Services LLC",
        location: location || "New York, NY",
        url: "https://example.com/job5",
        source: "Government Jobs",
        postedDate: new Date().toISOString(),
        salary: "$18 - $23 per hour",
        experience: "2+ years"
      }
    ];

    // Filter by categories if specified
    if (categories.length > 0) {
      return mockJobs.filter(job => 
        categories.some(cat => 
          job.title.toLowerCase().includes(cat.toLowerCase()) ||
          job.source.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    return mockJobs;
  }




}

module.exports = JobDiscoveryService; 