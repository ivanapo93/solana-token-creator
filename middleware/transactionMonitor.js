// Transaction Monitoring Middleware
// Provides webhook integration and automatic retry functionality

import alchemyWebhookHandler from '../services/alchemyWebhookService.js';
import transactionDebugService from '../services/transactionDebugService.js';
import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'transaction-monitor' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Initialize monitoring services
 */
export async function initializeMonitoring() {
  try {
    logger.info('Initializing transaction monitoring services');
    
    // Initialize webhook handler
    const webhookInitialized = await alchemyWebhookHandler.initialize();
    logger.info('Alchemy webhook handler initialization', { success: webhookInitialized });
    
    // Initialize transaction debug service
    const debugInitialized = await transactionDebugService.initialize();
    logger.info('Transaction debug service initialization', { success: debugInitialized });
    
    return webhookInitialized && debugInitialized;
  } catch (error) {
    logger.error('Failed to initialize monitoring services', { error: error.message });
    return false;
  }
}

/**
 * Configure webhook for token event monitoring
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function configureWebhook(req, res) {
  try {
    const { url, addresses, notificationTypes, filters } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required'
      });
    }
    
    const result = await alchemyWebhookHandler.registerWebhook(url, {
      addresses,
      notificationTypes,
      filters
    });
    
    if (result.success) {
      logger.info('Webhook configured successfully', { webhookId: result.webhookId });
      return res.status(200).json(result);
    } else {
      logger.warn('Failed to configure webhook', { error: result.error });
      return res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Webhook configuration error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Monitor a transaction for status updates
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function monitorTransaction(req, res) {
  try {
    const { signature, webhookUrl, maxRetries, retryEnabled } = req.body;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }
    
    // Set up transaction monitoring
    const monitoringResult = await alchemyWebhookHandler.monitorTransaction(signature, {
      webhookUrl,
      maxRetries: maxRetries || 3
    });
    
    // Set up automatic retry if requested
    if (retryEnabled) {
      const retryResult = await alchemyWebhookHandler.setupTransactionRetry(signature, {
        maxAttempts: maxRetries || 3
      });
      
      logger.info('Transaction retry configured', { 
        signature,
        retryId: retryResult.retryId
      });
      
      monitoringResult.retryEnabled = true;
      monitoringResult.retryId = retryResult.retryId;
    }
    
    logger.info('Transaction monitoring configured', { 
      signature, 
      monitoringId: monitoringResult.monitoringId 
    });
    
    return res.status(200).json(monitoringResult);
    
  } catch (error) {
    logger.error('Transaction monitoring error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get detailed transaction information
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function getTransactionDetails(req, res) {
  try {
    const { signature } = req.params;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }
    
    // Get transaction details
    const details = await transactionDebugService.getTransactionDetails(signature);
    
    return res.status(200).json({
      success: true,
      signature,
      details
    });
    
  } catch (error) {
    logger.error('Transaction details error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Analyze a transaction for errors or issues
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function analyzeTransaction(req, res) {
  try {
    const { signature } = req.params;
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }
    
    // Analyze transaction
    const analysis = await transactionDebugService.analyzeTransaction(signature);
    
    return res.status(200).json({
      success: true,
      signature,
      analysis
    });
    
  } catch (error) {
    logger.error('Transaction analysis error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Webhook handler for incoming notifications
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
export async function handleWebhookNotification(req, res) {
  try {
    const { event, data } = req.body;
    
    logger.info('Received webhook notification', { event });
    
    // Process the webhook notification based on event type
    switch (event) {
      case 'transaction.status':
        // Handle transaction status update
        logger.info('Transaction status update', { 
          signature: data.signature,
          status: data.status
        });
        break;
        
      case 'token.minted':
        // Handle token minting event
        logger.info('Token minting event', {
          mintAddress: data.mintAddress,
          supply: data.supply
        });
        break;
        
      case 'token.transferred':
        // Handle token transfer event
        logger.info('Token transfer event', {
          mintAddress: data.mintAddress,
          from: data.from,
          to: data.to,
          amount: data.amount
        });
        break;
        
      default:
        logger.warn('Unknown webhook event type', { event });
    }
    
    // Always return 200 OK for webhook notifications
    return res.status(200).json({
      success: true,
      event,
      received: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Webhook notification handler error', { error: error.message });
    // Still return 200 to acknowledge receipt (webhook best practice)
    return res.status(200).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Middleware to validate token metadata on IPFS
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware function
 */
export async function validateMetadataMiddleware(req, res, next) {
  try {
    const { metadataUri } = req.body;
    
    // Skip validation if no metadata URI provided
    if (!metadataUri) {
      logger.info('No metadata URI provided, skipping validation');
      return next();
    }
    
    // Only validate IPFS URIs
    if (!metadataUri.includes('ipfs')) {
      logger.info('Non-IPFS metadata URI, skipping validation');
      return next();
    }
    
    logger.info('Validating metadata URI', { uri: metadataUri });
    
    // Validate metadata
    const validation = await alchemyWebhookHandler.validateMetadata(metadataUri);
    
    if (!validation.valid) {
      logger.warn('Invalid metadata URI', { 
        uri: metadataUri,
        reason: validation.reason || validation.error
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid metadata URI',
        details: validation
      });
    }
    
    // Attach validation result to request for use in subsequent middleware
    req.metadataValidation = validation;
    
    return next();
    
  } catch (error) {
    logger.error('Metadata validation middleware error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Metadata validation failed',
      details: error.message
    });
  }
}

/**
 * Automatic transaction retry middleware
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Next middleware function
 */
export function autoRetryMiddleware(req, res, next) {
  // Attach the retry handler to the response
  res.locals.setupRetry = async (signature, options = {}) => {
    try {
      logger.info('Setting up automatic transaction retry', { signature });
      
      const retryResult = await alchemyWebhookHandler.setupTransactionRetry(signature, options);
      
      // Store retry info in response locals for potential use later
      res.locals.retryInfo = retryResult;
      
      return retryResult;
    } catch (error) {
      logger.error('Failed to set up transaction retry', { 
        signature, 
        error: error.message 
      });
      return { success: false, error: error.message };
    }
  };
  
  next();
}

export default {
  initializeMonitoring,
  configureWebhook,
  monitorTransaction,
  getTransactionDetails,
  analyzeTransaction,
  handleWebhookNotification,
  validateMetadataMiddleware,
  autoRetryMiddleware
};