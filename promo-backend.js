/**
 * Backend Integration for Promotional Website Generator
 * Express.js routes and middleware for the promo website system
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const PromoWebsiteGenerator = require('./promo-generator');
const { PROMO_CONFIG, validateConfig } = require('./promo-config');

const router = express.Router();

// Initialize promo generator
const promoGenerator = new PromoWebsiteGenerator({
    templatePath: PROMO_CONFIG.template.templatePath,
    deploymentService: PROMO_CONFIG.deployment.primaryService,
    baseDomain: PROMO_CONFIG.deployment.baseDomain,
    apiKeys: PROMO_CONFIG.apiKeys
});

// Rate limiting for promo generation
const promoRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: PROMO_CONFIG.rateLimiting.maxDeploymentsPerHour,
    message: {
        error: 'Too many promotional websites generated. Please try again later.',
        retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware to validate configuration
const validateConfigMiddleware = (req, res, next) => {
    const validation = validateConfig();
    if (!validation.valid) {
        return res.status(500).json({
            error: 'Server configuration error',
            details: validation.errors
        });
    }
    next();
};

// ================================
// PROMOTIONAL WEBSITE ROUTES
// ================================

/**
 * Generate promotional website
 * POST /api/promo/generate
 */
router.post('/generate', promoRateLimit, validateConfigMiddleware, async (req, res) => {
    try {
        const { coinData } = req.body;
        
        // Validate request data
        if (!coinData) {
            return res.status(400).json({
                error: 'Missing coin data',
                required: ['name', 'symbol', 'description', 'contractAddress']
            });
        }
        
        // Generate promotional website
        console.log(`🚀 Generating promo site for ${coinData.name} (${coinData.symbol})`);
        const result = await promoGenerator.generatePromoSite(coinData);
        
        if (result.success) {
            // Log successful generation
            console.log(`✅ Promo site generated: ${result.url}`);
            
            // Return success response
            res.status(201).json({
                success: true,
                data: {
                    siteId: result.siteId,
                    url: result.url,
                    deploymentId: result.deploymentId,
                    platform: result.platform || promoGenerator.deploymentService,
                    generatedAt: result.generatedAt,
                    coinData: result.coinData
                }
            });
            
            // Send webhook notification if configured
            if (PROMO_CONFIG.monitoring.webhookUrl) {
                sendWebhookNotification('promo_generated', result);
            }
            
        } else {
            console.error(`❌ Promo generation failed: ${result.error}`);
            
            res.status(500).json({
                error: 'Failed to generate promotional website',
                details: result.error,
                siteId: result.siteId
            });
        }
        
    } catch (error) {
        console.error('❌ Error in promo generation route:', error);
        
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * Get deployment status
 * GET /api/promo/status/:siteId
 */
router.get('/status/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        
        const deployment = await promoGenerator.getDeploymentStatus(siteId);
        
        if (!deployment) {
            return res.status(404).json({
                error: 'Deployment not found',
                siteId
            });
        }
        
        res.json({
            success: true,
            data: deployment
        });
        
    } catch (error) {
        console.error('Error getting deployment status:', error);
        
        res.status(500).json({
            error: 'Failed to get deployment status',
            message: error.message
        });
    }
});

/**
 * List all deployments
 * GET /api/promo/deployments
 */
router.get('/deployments', async (req, res) => {
    try {
        const deployments = await promoGenerator.listDeployments();
        
        res.json({
            success: true,
            data: deployments,
            count: deployments.length
        });
        
    } catch (error) {
        console.error('Error listing deployments:', error);
        
        res.status(500).json({
            error: 'Failed to list deployments',
            message: error.message
        });
    }
});

/**
 * Delete deployment
 * DELETE /api/promo/:siteId
 */
router.delete('/:siteId', async (req, res) => {
    try {
        const { siteId } = req.params;
        
        const success = await promoGenerator.deleteDeployment(siteId);
        
        if (success) {
            res.json({
                success: true,
                message: 'Deployment deleted successfully',
                siteId
            });
        } else {
            res.status(500).json({
                error: 'Failed to delete deployment',
                siteId
            });
        }
        
    } catch (error) {
        console.error('Error deleting deployment:', error);
        
        res.status(500).json({
            error: 'Failed to delete deployment',
            message: error.message
        });
    }
});

/**
 * Get configuration info
 * GET /api/promo/config
 */
router.get('/config', (req, res) => {
    const validation = validateConfig();
    
    res.json({
        success: true,
        data: {
            primaryService: PROMO_CONFIG.deployment.primaryService,
            fallbackServices: PROMO_CONFIG.deployment.fallbackServices,
            baseDomain: PROMO_CONFIG.deployment.baseDomain,
            maxDeploymentsPerHour: PROMO_CONFIG.rateLimiting.maxDeploymentsPerHour,
            configValid: validation.valid,
            warnings: validation.warnings,
            supportedServices: ['netlify', 'vercel', 'github']
        }
    });
});

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Send webhook notification
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
async function sendWebhookNotification(event, data) {
    try {
        if (!PROMO_CONFIG.monitoring.webhookUrl) return;
        
        const fetch = require('node-fetch');
        
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            data
        };
        
        await fetch(PROMO_CONFIG.monitoring.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log(`📡 Webhook notification sent for ${event}`);
        
    } catch (error) {
        console.error('Failed to send webhook notification:', error);
    }
}

/**
 * Health check for promotional website system
 */
router.get('/health', async (req, res) => {
    try {
        const validation = validateConfig();
        const deployments = await promoGenerator.listDeployments();
        
        const health = {
            status: validation.valid ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            config: {
                valid: validation.valid,
                errors: validation.errors,
                warnings: validation.warnings
            },
            stats: {
                totalDeployments: deployments.length,
                recentDeployments: deployments.filter(d => 
                    new Date(d.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length
            },
            services: {
                primary: PROMO_CONFIG.deployment.primaryService,
                fallbacks: PROMO_CONFIG.deployment.fallbackServices
            }
        };
        
        res.json(health);
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ================================
// MIDDLEWARE SETUP
// ================================

/**
 * Setup promotional website middleware
 * @param {Express} app - Express application
 */
function setupPromoMiddleware(app) {
    // CORS configuration
    app.use('/api/promo', cors({
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // JSON parsing
    app.use('/api/promo', express.json({ limit: '10mb' }));
    
    // Request logging
    app.use('/api/promo', (req, res, next) => {
        if (PROMO_CONFIG.monitoring.enableLogging) {
            console.log(`${req.method} ${req.path} - ${req.ip}`);
        }
        next();
    });
    
    // Mount routes
    app.use('/api/promo', router);
    
    console.log('✅ Promotional website middleware setup complete');
}

// ================================
// INTEGRATION WITH TOKEN CREATION
// ================================

/**
 * Middleware to automatically generate promo site after token creation
 * @param {Object} tokenData - Token creation result
 */
async function autoGeneratePromoSite(tokenData) {
    try {
        if (!tokenData.success || !tokenData.mintAddress) {
            return null;
        }
        
        console.log('🌐 Auto-generating promotional website...');
        
        const coinData = {
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description,
            contractAddress: tokenData.mintAddress,
            imageUrl: tokenData.imageUrl,
            explorerUrl: `https://solscan.io/token/${tokenData.mintAddress}`,
            raydiumUrl: `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${tokenData.mintAddress}`,
            createdAt: new Date().toISOString()
        };
        
        const result = await promoGenerator.generatePromoSite(coinData);
        
        if (result.success) {
            console.log(`✅ Auto-generated promo site: ${result.url}`);
        } else {
            console.error(`❌ Auto-generation failed: ${result.error}`);
        }
        
        return result;
        
    } catch (error) {
        console.error('Error in auto-generation:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    router,
    setupPromoMiddleware,
    autoGeneratePromoSite,
    promoGenerator
};