const ComprehensiveJobSources = {
  // US Government Job Boards
  usGovernment: {
    name: "US Government Jobs",
    sources: [
      {
        name: "USAJOBS",
        url: "https://www.usajobs.gov",
        type: "government",
        country: "US",
        categories: ["government", "admin", "blue-collar"],
        scraping: {
          baseUrl: "https://www.usajobs.gov/Search/Results",
          selectors: {
            jobs: ".usajobs-search-result",
            title: ".usajobs-search-result__title",
            company: ".usajobs-search-result__department",
            location: ".usajobs-search-result__location",
            salary: ".usajobs-search-result__salary",
            url: "a.usajobs-search-result__title"
          }
        }
      },
      {
        name: "Federal Government Jobs",
        url: "https://www.federaljobs.net",
        type: "government",
        country: "US",
        categories: ["government", "admin"],
        scraping: {
          baseUrl: "https://www.federaljobs.net/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".agency-name",
            location: ".job-location",
            salary: ".salary-range",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Government Jobs",
        url: "https://www.governmentjobs.com",
        type: "government",
        country: "US",
        categories: ["government", "admin", "blue-collar"],
        scraping: {
          baseUrl: "https://www.governmentjobs.com/careers",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".department-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // UK Government Job Boards
  ukGovernment: {
    name: "UK Government Jobs",
    sources: [
      {
        name: "Civil Service Jobs",
        url: "https://www.civilservicejobs.service.gov.uk",
        type: "government",
        country: "UK",
        categories: ["government", "admin"],
        scraping: {
          baseUrl: "https://www.civilservicejobs.service.gov.uk/csr/index.cgi",
          selectors: {
            jobs: ".vacancy",
            title: ".vacancy-title",
            company: ".department",
            location: ".location",
            salary: ".salary",
            url: "a.vacancy-link"
          }
        }
      },
      {
        name: "Find a Job",
        url: "https://findajob.dwp.gov.uk",
        type: "government",
        country: "UK",
        categories: ["government", "admin", "blue-collar"],
        scraping: {
          baseUrl: "https://findajob.dwp.gov.uk/search",
          selectors: {
            jobs: ".job-result",
            title: ".job-title",
            company: ".employer",
            location: ".location",
            salary: ".salary",
            url: "a.job-link"
          }
        }
      },
      {
        name: "NHS Jobs",
        url: "https://www.jobs.nhs.uk",
        type: "government",
        country: "UK",
        categories: ["government", "admin", "healthcare"],
        scraping: {
          baseUrl: "https://www.jobs.nhs.uk/candidate/jobadvert",
          selectors: {
            jobs: ".job-result",
            title: ".job-title",
            company: ".trust-name",
            location: ".location",
            salary: ".salary",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Canada Government Job Boards
  canadaGovernment: {
    name: "Canada Government Jobs",
    sources: [
      {
        name: "Jobs GC",
        url: "https://emploisfp-psjobs.cfp-psc.gc.ca",
        type: "government",
        country: "CA",
        categories: ["government", "admin"],
        scraping: {
          baseUrl: "https://emploisfp-psjobs.cfp-psc.gc.ca/psrs-srfp/applicant/page2440",
          selectors: {
            jobs: ".job-posting",
            title: ".job-title",
            company: ".department",
            location: ".location",
            salary: ".salary",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Canada Job Bank",
        url: "https://www.jobbank.gc.ca",
        type: "government",
        country: "CA",
        categories: ["government", "admin", "blue-collar"],
        scraping: {
          baseUrl: "https://www.jobbank.gc.ca/jobsearch",
          selectors: {
            jobs: ".result",
            title: ".jobtitle",
            company: ".business",
            location: ".location",
            salary: ".salary",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Gig Economy Platforms
  gigEconomy: {
    name: "Gig Economy Platforms",
    sources: [
      {
        name: "TaskRabbit",
        url: "https://www.taskrabbit.com",
        type: "gig",
        country: "US",
        categories: ["blue-collar", "admin"],
        scraping: {
          baseUrl: "https://www.taskrabbit.com/tasks",
          selectors: {
            jobs: ".task-listing",
            title: ".task-title",
            company: "TaskRabbit",
            location: ".task-location",
            salary: ".task-price",
            url: "a.task-link"
          }
        }
      },
      {
        name: "Upwork",
        url: "https://www.upwork.com",
        type: "gig",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://www.upwork.com/nx/search/jobs",
          selectors: {
            jobs: ".job-tile",
            title: ".job-title",
            company: ".client-info",
            location: ".job-location",
            salary: ".job-budget",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Fiverr",
        url: "https://www.fiverr.com",
        type: "gig",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://www.fiverr.com/search",
          selectors: {
            jobs: ".gig-card",
            title: ".gig-title",
            company: "Fiverr",
            location: ".seller-location",
            salary: ".gig-price",
            url: "a.gig-link"
          }
        }
      },
      {
        name: "Handy",
        url: "https://www.handy.com",
        type: "gig",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.handy.com/pros",
          selectors: {
            jobs: ".pro-listing",
            title: ".service-title",
            company: "Handy",
            location: ".pro-location",
            salary: ".service-price",
            url: "a.pro-link"
          }
        }
      },
      {
        name: "Thumbtack",
        url: "https://www.thumbtack.com",
        type: "gig",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.thumbtack.com/search",
          selectors: {
            jobs: ".pro-listing",
            title: ".service-title",
            company: "Thumbtack",
            location: ".pro-location",
            salary: ".service-price",
            url: "a.pro-link"
          }
        }
      }
    ]
  },

  // ATS Platforms
  atsPlatforms: {
    name: "ATS Platforms",
    sources: [
      {
        name: "BambooHR",
        url: "https://www.bamboohr.com",
        type: "ats",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://careers.bamboohr.com",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Workday",
        url: "https://www.workday.com",
        type: "ats",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://workday.wd5.myworkdayjobs.com",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Greenhouse",
        url: "https://www.greenhouse.io",
        type: "ats",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://boards.greenhouse.io",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Lever",
        url: "https://www.lever.co",
        type: "ats",
        country: "US",
        categories: ["admin", "blue-collar"],
        scraping: {
          baseUrl: "https://jobs.lever.co",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Niche Job Boards - Blue Collar
  blueCollarBoards: {
    name: "Blue Collar Job Boards",
    sources: [
      {
        name: "Blue Collar Jobs",
        url: "https://www.bluecollarjobs.com",
        type: "niche",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.bluecollarjobs.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Construction Jobs",
        url: "https://www.constructionjobs.com",
        type: "niche",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.constructionjobs.com/search",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Trucking Jobs",
        url: "https://www.truckingjobs.com",
        type: "niche",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.truckingjobs.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Manufacturing Jobs",
        url: "https://www.manufacturingjobs.com",
        type: "niche",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.manufacturingjobs.com/search",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Niche Job Boards - Admin
  adminBoards: {
    name: "Administrative Job Boards",
    sources: [
      {
        name: "Admin Jobs",
        url: "https://www.adminjobs.com",
        type: "niche",
        country: "US",
        categories: ["admin"],
        scraping: {
          baseUrl: "https://www.adminjobs.com/search",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Office Jobs",
        url: "https://www.officejobs.com",
        type: "niche",
        country: "US",
        categories: ["admin"],
        scraping: {
          baseUrl: "https://www.officejobs.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Receptionist Jobs",
        url: "https://www.receptionistjobs.com",
        type: "niche",
        country: "US",
        categories: ["admin"],
        scraping: {
          baseUrl: "https://www.receptionistjobs.com/search",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Regional Job Boards
  regionalBoards: {
    name: "Regional Job Boards",
    sources: [
      // US Regional
      {
        name: "Craigslist Jobs",
        url: "https://www.craigslist.org",
        type: "regional",
        country: "US",
        categories: ["blue-collar", "admin"],
        scraping: {
          baseUrl: "https://www.craigslist.org/about/sites",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Kijiji Jobs",
        url: "https://www.kijiji.ca",
        type: "regional",
        country: "CA",
        categories: ["blue-collar", "admin"],
        scraping: {
          baseUrl: "https://www.kijiji.ca/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      // UK Regional
      {
        name: "Gumtree Jobs",
        url: "https://www.gumtree.com",
        type: "regional",
        country: "UK",
        categories: ["blue-collar", "admin"],
        scraping: {
          baseUrl: "https://www.gumtree.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: ".company-name",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  },

  // Company Career Pages - Blue Collar Focus
  companyCareerPages: {
    name: "Company Career Pages",
    sources: [
      // Manufacturing Companies
      {
        name: "General Motors",
        url: "https://careers.gm.com",
        type: "company",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://careers.gm.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: "General Motors",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "Ford",
        url: "https://corporate.ford.com/careers.html",
        type: "company",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://corporate.ford.com/careers.html",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: "Ford",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      // Construction Companies
      {
        name: "Bechtel",
        url: "https://careers.bechtel.com",
        type: "company",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://careers.bechtel.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: "Bechtel",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      // Transportation Companies
      {
        name: "UPS",
        url: "https://www.jobs-ups.com",
        type: "company",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://www.jobs-ups.com/search",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: "UPS",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      },
      {
        name: "FedEx",
        url: "https://careers.fedex.com",
        type: "company",
        country: "US",
        categories: ["blue-collar"],
        scraping: {
          baseUrl: "https://careers.fedex.com/jobs",
          selectors: {
            jobs: ".job-listing",
            title: ".job-title",
            company: "FedEx",
            location: ".job-location",
            salary: ".salary-info",
            url: "a.job-link"
          }
        }
      }
    ]
  }
};

module.exports = ComprehensiveJobSources; 