/**
 * Configuration for Advanced AI Image Generation System
 */

const AI_CONFIG = {
    // API Keys - Replace with your actual API keys
    apiKeys: {
        openai: (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) || 'your-openai-api-key-here',
        replicate: (typeof process !== 'undefined' && process.env && process.env.REPLICATE_API_KEY) || 'your-replicate-api-key-here',
        stabilityai: (typeof process !== 'undefined' && process.env && process.env.STABILITY_API_KEY) || 'your-stability-api-key-here',
        midjourney: (typeof process !== 'undefined' && process.env && process.env.MIDJOURNEY_API_KEY) || 'your-midjourney-api-key-here'
    },

    // Provider Settings
    providers: {
        dalle: {
            enabled: true,
            priority: 1,
            model: 'dall-e-3',
            size: '1024x1024',
            quality: 'hd',
            style: 'vivid',
            maxRetries: 3,
            timeout: 60000 // 60 seconds
        },
        flux: {
            enabled: true,
            priority: 2,
            model: 'flux-dev',
            size: 1024,
            guidanceScale: 7.5,
            steps: 50,
            maxRetries: 3,
            timeout: 180000 // 3 minutes
        },
        stabilityai: {
            enabled: true,
            priority: 3,
            model: 'stable-diffusion-xl-1024-v1-0',
            size: 1024,
            cfgScale: 7,
            steps: 30,
            stylePreset: 'digital-art',
            maxRetries: 3,
            timeout: 120000 // 2 minutes
        },
        midjourney: {
            enabled: false, // Requires special setup
            priority: 4,
            maxRetries: 3,
            timeout: 300000 // 5 minutes
        }
    },

    // Quality Assessment Settings
    qualitySettings: {
        minimumScore: 70,
        weights: {
            providerReliability: 0.3,
            promptRelevance: 0.4,
            technicalQuality: 0.3
        },
        requiredResolution: {
            width: 1024,
            height: 1024
        },
        preferredFormats: ['png', 'jpg', 'webp']
    },

    // Prompt Engineering Settings
    promptSettings: {
        maxPromptLength: 1000,
        styleKeywords: [
            'cartoon', '3D rendered', 'digital art', 'illustration',
            'vibrant colors', 'high contrast', 'meme style'
        ],
        qualityModifiers: [
            'ultra-detailed', '4K quality', 'professional',
            'high-resolution', 'crisp details'
        ],
        negativePrompts: [
            'blurry', 'low quality', 'text overlays', 'watermarks',
            'stock photo', 'realistic photography', 'dark themes'
        ]
    },

    // Storage Settings (for Supabase integration)
    storage: {
        tableName: 'generated_tokens',
        imagesBucket: 'token-images',
        enableDuplicateCheck: true,
        maxStoredTokens: 10000,
        cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
    },

    // Rate Limiting
    rateLimits: {
        dalle: {
            requestsPerMinute: 5,
            requestsPerHour: 100
        },
        flux: {
            requestsPerMinute: 3,
            requestsPerHour: 60
        },
        stabilityai: {
            requestsPerMinute: 10,
            requestsPerHour: 150
        }
    },

    // Fallback Settings
    fallback: {
        enableCanvasGeneration: true,
        useStockImages: false,
        placeholderImage: 'data:image/svg+xml;base64,...', // Placeholder SVG
        maxRetryAttempts: 3,
        retryDelay: 5000 // 5 seconds
    }
};

// Development vs Production Settings
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Production settings
    AI_CONFIG.providers.dalle.timeout = 30000; // Shorter timeout
    AI_CONFIG.providers.flux.steps = 30; // Faster generation
    AI_CONFIG.qualitySettings.minimumScore = 80; // Higher quality requirement
} else {
    // Development settings
    AI_CONFIG.providers.dalle.timeout = 120000; // Longer timeout for testing
    AI_CONFIG.qualitySettings.minimumScore = 60; // Lower quality for testing
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
} else if (typeof window !== 'undefined') {
    window.AI_CONFIG = AI_CONFIG;
}