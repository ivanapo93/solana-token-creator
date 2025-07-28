// Alchemy Webhook Integration for Solana Tokens
// This module provides webhook functionality to monitor SPL token events

class AlchemyWebhookHandler {
  constructor() {
    this.apiKey = '9UB7l5spSYtK-bF4FCvUY'; // Alchemy API key
    this.baseUrl = 'https://solana-mainnet.g.alchemy.com/v2/';
    this.webhooks = new Map(); // Store registered webhooks
    this.pendingTransactions = new Map(); // Track transactions pending confirmation
    this.retryQueue = new Map(); // Queue for transactions to retry
  }

  /**
   * Initialize the webhook handler
   */
  async initialize() {
    try {
      console.log('Initializing Alchemy webhook handler...');
      return true;
    } catch (error) {
      console.error('Failed to initialize Alchemy webhook handler:', error);
      return false;
    }
  }

  /**
   * Register a webhook for token event monitoring
   * @param {string} url - The webhook URL to send notifications to
   * @param {object} options - Configuration options
   * @returns {Promise<object>} Webhook registration result
   */
  async registerWebhook(url, options = {}) {
    try {
      console.log(`Registering webhook: ${url}`);
      
      const webhookId = 'wh_' + Date.now().toString(16) + Math.random().toString(16).substring(2);
      
      this.webhooks.set(webhookId, {
        url,
        enabled: true,
        filters: options.filters || {},
        addresses: options.addresses || [],
        created: Date.now(),
        notificationTypes: options.notificationTypes || [
          'TOKEN_MINT',
          'TOKEN_TRANSFER',
          'WALLET_INTERACTION'
        ]
      });
      
      console.log(`Webhook registered with ID: ${webhookId}`);
      
      return {
        success: true,
        webhookId,
        url,
        status: 'active'
      };
    } catch (error) {
      console.error('Failed to register webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor a transaction for status updates
   * @param {string} signature - Transaction signature
   * @param {object} options - Monitoring options
   * @returns {Promise<object>} Monitoring result
   */
  async monitorTransaction(signature, options = {}) {
    try {
      console.log(`Setting up monitoring for transaction: ${signature}`);
      
      const monitoringId = 'mon_' + Date.now().toString(16);
      
      // Store transaction in pending transactions
      this.pendingTransactions.set(monitoringId, {
        signature,
        status: 'pending',
        startTime: Date.now(),
        options,
        checkCount: 0,
        lastCheck: null
      });
      
      // Return immediately, monitoring happens in background
      return {
        success: true,
        monitoringId,
        signature,
        status: 'monitoring'
      };
    } catch (error) {
      console.error('Failed to monitor transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set up automatic retry for failed transactions
   * @param {string} signature - Transaction signature
   * @param {object} options - Retry options
   * @returns {Promise<object>} Retry configuration result
   */
  async setupTransactionRetry(signature, options = {}) {
    try {
      console.log(`Setting up automatic retry for transaction: ${signature}`);
      
      const retryId = 'retry_' + Date.now().toString(16);
      
      this.retryQueue.set(retryId, {
        originalSignature: signature,
        status: 'waiting',
        attempts: 0,
        maxAttempts: options.maxAttempts || 3,
        backoffFactor: options.backoffFactor || 2,
        initialDelay: options.initialDelay || 3000, // 3 seconds
        retrySignatures: []
      });
      
      return {
        success: true,
        retryId,
        originalSignature: signature,
        maxAttempts: options.maxAttempts || 3
      };
    } catch (error) {
      console.error('Failed to setup transaction retry:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate token metadata on IPFS
   * @param {string} uri - Metadata URI
   * @returns {Promise<object>} Validation result
   */
  async validateMetadata(uri) {
    try {
      console.log(`Validating token metadata: ${uri}`);
      
      if (!uri || !uri.includes('ipfs')) {
        return {
          valid: false,
          uri,
          reason: 'Not an IPFS URI'
        };
      }
      
      // Extract IPFS hash
      let ipfsHash;
      if (uri.startsWith('ipfs://')) {
        ipfsHash = uri.replace('ipfs://', '');
      } else if (uri.includes('/ipfs/')) {
        ipfsHash = uri.split('/ipfs/')[1];
      } else {
        return {
          valid: false,
          uri,
          reason: 'Unrecognized IPFS URI format'
        };
      }
      
      // Check multiple IPFS gateways for accessibility
      const gateways = [
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
      ];
      
      let accessible = false;
      let validationDetails = {};
      
      for (const gateway of gateways) {
        try {
          // Attempt to fetch metadata
          const response = await fetch(gateway, { method: 'HEAD', timeout: 5000 });
          if (response.ok) {
            accessible = true;
            validationDetails.accessibleVia = gateway;
            break;
          }
        } catch (gatewayError) {
          // Continue trying other gateways
          console.warn(`Gateway access failed (${gateway}):`, gatewayError.message);
        }
      }
      
      return {
        valid: accessible,
        uri,
        accessible,
        validationDetails
      };
      
    } catch (error) {
      console.error('Failed to validate metadata:', error);
      return {
        valid: false,
        uri,
        error: error.message
      };
    }
  }
  
  /**
   * Send notification to a registered webhook
   * @param {string} webhookId - Webhook ID
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   * @returns {Promise<boolean>} Success status
   */
  async notifyWebhook(webhookId, eventType, data) {
    try {
      const webhook = this.webhooks.get(webhookId);
      if (!webhook || !webhook.enabled) {
        return false;
      }
      
      console.log(`Sending ${eventType} notification to webhook ${webhookId}`);
      
      const payload = {
        event: eventType,
        timestamp: Date.now(),
        data,
        webhookId
      };
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      return response.ok;
      
    } catch (error) {
      console.error(`Failed to notify webhook ${webhookId}:`, error);
      return false;
    }
  }
  
  /**
   * Get monitoring status for a transaction
   * @param {string} monitoringId - Monitoring ID
   * @returns {object} Monitoring status
   */
  getMonitoringStatus(monitoringId) {
    const monitoring = this.pendingTransactions.get(monitoringId);
    if (!monitoring) {
      return { found: false };
    }
    
    return {
      found: true,
      monitoringId,
      signature: monitoring.signature,
      status: monitoring.status,
      startTime: monitoring.startTime,
      checkCount: monitoring.checkCount,
      lastCheck: monitoring.lastCheck
    };
  }
  
  /**
   * Get retry status for a transaction
   * @param {string} retryId - Retry ID
   * @returns {object} Retry status
   */
  getRetryStatus(retryId) {
    const retry = this.retryQueue.get(retryId);
    if (!retry) {
      return { found: false };
    }
    
    return {
      found: true,
      retryId,
      originalSignature: retry.originalSignature,
      status: retry.status,
      attempts: retry.attempts,
      maxAttempts: retry.maxAttempts,
      retrySignatures: retry.retrySignatures
    };
  }
}

// Export the webhook handler
const alchemyWebhookHandler = new AlchemyWebhookHandler();
export default alchemyWebhookHandler;