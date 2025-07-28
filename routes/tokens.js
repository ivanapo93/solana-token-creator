import express from 'express';
import { createTokenWithMetadata, getTokenInfo } from '../services/solanaService.js';
import transactionMonitor from '../middleware/transactionMonitor.js';
import winston from 'winston';

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'token-routes' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize monitoring services
transactionMonitor.initializeMonitoring().then(initialized => {
  logger.info('Transaction monitoring services initialization', { success: initialized });
});

// Middleware for token routes
router.use(express.json());
router.use(transactionMonitor.autoRetryMiddleware);

/**
 * Create a new token with metadata
 * POST /api/tokens
 */
router.post('/', transactionMonitor.validateMetadataMiddleware, async (req, res) => {
  try {
    const {
      name,
      symbol,
      uri,
      decimals = 9,
      supply = 1000000000,
      creatorWallet,
      transactionFeePercentage = 0.0,
      feeCollectorWallet = null,
      revokeMintAuthority = false,
      revokeFreezeAuthority = false,
      revokeUpdateAuthority = false,
      webhookUrl,
      enableTransactionMonitoring = false,
      enableAutoRetry = false
    } = req.body;

    // Validate required fields
    if (!name || !symbol || !creatorWallet) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing: name, symbol, and creatorWallet are required'
      });
    }

    // Create token
    const tokenResult = await createTokenWithMetadata({
      name,
      symbol,
      uri,
      decimals,
      supply,
      creatorWallet,
      transactionFeePercentage,
      feeCollectorWallet,
      revokeMintAuthority,
      revokeFreezeAuthority,
      revokeUpdateAuthority
    });

    logger.info('Token created successfully', {
      mintAddress: tokenResult.mintAddress,
      symbol,
      name
    });

    // Set up transaction monitoring if requested
    if (enableTransactionMonitoring && webhookUrl) {
      try {
        // Configure webhook for token monitoring
        const webhookResult = await transactionMonitor.configureWebhook({
          body: {
            url: webhookUrl,
            addresses: [tokenResult.mintAddress],
            notificationTypes: ['TOKEN_MINT', 'TOKEN_TRANSFER']
          }
        }, {
          status: () => ({ json: data => data })
        });
        
        logger.info('Webhook configured for token', {
          mintAddress: tokenResult.mintAddress,
          webhookId: webhookResult.webhookId
        });
        
        tokenResult.monitoring = {
          enabled: true,
          webhookId: webhookResult.webhookId
        };
        
        // Set up transaction monitoring
        if (tokenResult.signature) {
          const monitoringResult = await transactionMonitor.monitorTransaction({
            body: {
              signature: tokenResult.signature,
              webhookUrl,
              maxRetries: enableAutoRetry ? 3 : 0,
              retryEnabled: enableAutoRetry
            }
          }, {
            status: () => ({ json: data => data })
          });
          
          tokenResult.monitoring.transactionId = monitoringResult.monitoringId;
          
          if (enableAutoRetry) {
            tokenResult.monitoring.retryEnabled = true;
            tokenResult.monitoring.retryId = monitoringResult.retryId;
          }
        }
      } catch (monitoringError) {
        logger.warn('Failed to set up token monitoring', {
          error: monitoringError.message,
          mintAddress: tokenResult.mintAddress
        });
        
        // Don't fail the response if monitoring setup fails
        tokenResult.monitoring = {
          enabled: false,
          error: monitoringError.message
        };
      }
    }

    return res.status(201).json({
      success: true,
      token: tokenResult
    });
  } catch (error) {
    logger.error('Token creation failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get token information
 * GET /api/tokens/:mintAddress
 */
router.get('/:mintAddress', async (req, res) => {
  try {
    const { mintAddress } = req.params;
    
    if (!mintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Mint address is required'
      });
    }
    
    const tokenInfo = await getTokenInfo(mintAddress);
    
    return res.status(200).json({
      success: true,
      token: tokenInfo
    });
  } catch (error) {
    logger.error('Failed to get token info', {
      mintAddress: req.params.mintAddress,
      error: error.message
    });
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Configure webhook for token monitoring
 * POST /api/tokens/webhook
 */
router.post('/webhook', async (req, res) => {
  return transactionMonitor.configureWebhook(req, res);
});

/**
 * Monitor a token transaction
 * POST /api/tokens/monitor
 */
router.post('/monitor', async (req, res) => {
  return transactionMonitor.monitorTransaction(req, res);
});

/**
 * Get transaction details
 * GET /api/tokens/transaction/:signature
 */
router.get('/transaction/:signature', async (req, res) => {
  return transactionMonitor.getTransactionDetails(req, res);
});

/**
 * Analyze a transaction
 * GET /api/tokens/analyze/:signature
 */
router.get('/analyze/:signature', async (req, res) => {
  return transactionMonitor.analyzeTransaction(req, res);
});

/**
 * Webhook endpoint for receiving token event notifications
 * POST /api/tokens/webhook/notify
 */
router.post('/webhook/notify', async (req, res) => {
  return transactionMonitor.handleWebhookNotification(req, res);
});

export default router;