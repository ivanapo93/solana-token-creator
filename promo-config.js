/**
 * Promotional Website Generator Configuration
 * Configuration file for deployment services and API keys
 */

const PROMO_CONFIG = {
    // Deployment Service Settings
    deployment: {
        // Primary deployment service ('netlify', 'vercel', 'github')
        primaryService: 'netlify',
        
        // Fallback services in order of preference
        fallbackServices: ['vercel', 'github'],
        
        // Base domain for subdomains (configure your own domain)
        baseDomain: 'solmeme.site',
        
        // Timeout for deployment operations (milliseconds)
        deploymentTimeout: 300000, // 5 minutes
        
        // Retry configuration
        maxRetries: 3,
        retryDelay: 5000 // 5 seconds
    },
    
    // API Keys for deployment services
    // IMPORTANT: Store these in environment variables in production
    apiKeys: {
        netlify: process.env.NETLIFY_API_TOKEN || '',
        vercel: process.env.VERCEL_API_TOKEN || '',
        github: process.env.GITHUB_TOKEN || ''
    },
    
    // Template Settings
    template: {
        // Path to the promotional website template
        templatePath: './promo-template.html',
        
        // Default images for coins without custom graphics
        defaultImageService: 'dicebear', // 'dicebear', 'robohash', 'identicon'
        
        // Image generation settings
        imageSettings: {
            size: 200,
            background: '#667eea',
            format: 'svg'
        }
    },
    
    // SEO and Social Media Settings
    seo: {
        // Default meta tags
        defaultKeywords: ['Solana', 'meme token', 'cryptocurrency', 'DeFi', 'blockchain'],
        
        // Social media sharing
        enableTwitterSharing: true,
        enableDiscordSharing: true,
        enableTelegramSharing: true,
        
        // Analytics (optional)
        googleAnalyticsId: process.env.GA_TRACKING_ID || '',
        enableAnalytics: false
    },
    
    // Storage Settings
    storage: {
        // Where to store deployment records
        provider: 'local', // 'local', 'supabase', 'firebase'
        
        // Local storage settings
        local: {
            recordsFile: './promo-deployments.json',
            backupFile: './promo-deployments-backup.json'
        },
        
        // Supabase settings (if using Supabase)
        supabase: {
            url: process.env.SUPABASE_URL || '',
            key: process.env.SUPABASE_ANON_KEY || '',
            table: 'promo_deployments'
        }
    },
    
    // Rate Limiting
    rateLimiting: {
        // Maximum deployments per hour
        maxDeploymentsPerHour: 10,
        
        // Cooldown between deployments (milliseconds)
        deploymentCooldown: 60000, // 1 minute
        
        // Track by IP address
        trackByIP: true
    },
    
    // Monitoring and Logging
    monitoring: {
        // Enable detailed logging
        enableLogging: true,
        
        // Log levels: 'error', 'warn', 'info', 'debug'
        logLevel: 'info',
        
        // Webhook for deployment notifications (optional)
        webhookUrl: process.env.DEPLOYMENT_WEBHOOK_URL || '',
        
        // Email notifications (optional)
        emailNotifications: {
            enabled: false,
            smtpConfig: {
                host: process.env.SMTP_HOST || '',
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER || '',
                    pass: process.env.SMTP_PASS || ''
                }
            },
            recipients: ['admin@solmeme.site']
        }
    }
};

/**
 * Get deployment service configuration
 * @param {string} service - Service name
 * @returns {Object} Service configuration
 */
function getServiceConfig(service) {
    const configs = {
        netlify: {
            name: 'Netlify',
            apiUrl: 'https://api.netlify.com/api/v1',
            maxSites: 100, // Free tier limit
            customDomain: true,
            ssl: true,
            deploymentMethod: 'zip'
        },
        vercel: {
            name: 'Vercel',
            apiUrl: 'https://api.vercel.com/v1',
            maxProjects: 100, // Free tier limit
            customDomain: true,
            ssl: true,
            deploymentMethod: 'files'
        },
        github: {
            name: 'GitHub Pages',
            apiUrl: 'https://api.github.com',
            maxRepos: 1000, // GitHub limit
            customDomain: true,
            ssl: true,
            deploymentMethod: 'git'
        }
    };
    
    return configs[service] || null;
}

/**
 * Validate configuration
 * @returns {Object} Validation result
 */
function validateConfig() {
    const errors = [];
    const warnings = [];
    
    // Check API keys
    const primaryService = PROMO_CONFIG.deployment.primaryService;
    if (!PROMO_CONFIG.apiKeys[primaryService]) {
        errors.push(`Missing API key for primary service: ${primaryService}`);
    }
    
    // Check fallback services
    PROMO_CONFIG.deployment.fallbackServices.forEach(service => {
        if (!PROMO_CONFIG.apiKeys[service]) {
            warnings.push(`Missing API key for fallback service: ${service}`);
        }
    });
    
    // Check template file
    const templatePath = PROMO_CONFIG.template.templatePath;
    try {
        require('fs').accessSync(templatePath);
    } catch (error) {
        errors.push(`Template file not found: ${templatePath}`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Get environment-specific configuration
 * @param {string} env - Environment ('development', 'production', 'test')
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig(env = 'development') {
    const envConfigs = {
        development: {
            deployment: {
                ...PROMO_CONFIG.deployment,
                deploymentTimeout: 60000, // Shorter timeout for dev
                maxRetries: 1
            },
            monitoring: {
                ...PROMO_CONFIG.monitoring,
                logLevel: 'debug'
            }
        },
        production: {
            deployment: {
                ...PROMO_CONFIG.deployment,
                deploymentTimeout: 300000,
                maxRetries: 3
            },
            monitoring: {
                ...PROMO_CONFIG.monitoring,
                logLevel: 'info'
            }
        },
        test: {
            deployment: {
                ...PROMO_CONFIG.deployment,
                primaryService: 'github', // Use GitHub for testing
                deploymentTimeout: 30000,
                maxRetries: 1
            },
            monitoring: {
                ...PROMO_CONFIG.monitoring,
                logLevel: 'warn'
            }
        }
    };
    
    return {
        ...PROMO_CONFIG,
        ...envConfigs[env]
    };
}

/**
 * Setup instructions for deployment services
 */
const SETUP_INSTRUCTIONS = {
    netlify: {
        title: 'Netlify Setup',
        steps: [
            '1. Go to https://netlify.com and create an account',
            '2. Go to User Settings > Applications > Personal access tokens',
            '3. Generate a new token with full access',
            '4. Set the NETLIFY_API_TOKEN environment variable',
            '5. Optional: Configure a custom domain in Netlify'
        ],
        freeLimit: '100 sites, 100GB bandwidth per month',
        docs: 'https://docs.netlify.com/api/get-started/'
    },
    vercel: {
        title: 'Vercel Setup',
        steps: [
            '1. Go to https://vercel.com and create an account',
            '2. Go to Settings > Tokens',
            '3. Create a new token',
            '4. Set the VERCEL_API_TOKEN environment variable',
            '5. Optional: Configure a custom domain in Vercel'
        ],
        freeLimit: '100 deployments per day, unlimited static sites',
        docs: 'https://vercel.com/docs/rest-api'
    },
    github: {
        title: 'GitHub Pages Setup',
        steps: [
            '1. Go to https://github.com and create an account',
            '2. Go to Settings > Developer settings > Personal access tokens',
            '3. Generate a token with repo permissions',
            '4. Set the GITHUB_TOKEN environment variable',
            '5. Optional: Configure a custom domain in repository settings'
        ],
        freeLimit: '1GB storage, 100GB bandwidth per month',
        docs: 'https://docs.github.com/en/rest'
    }
};

module.exports = {
    PROMO_CONFIG,
    getServiceConfig,
    validateConfig,
    getEnvironmentConfig,
    SETUP_INSTRUCTIONS
};