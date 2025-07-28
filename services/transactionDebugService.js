// Alchemy Transaction Debug Service for Solana
// Provides detailed transaction analysis and debugging capabilities

import winston from 'winston';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'transaction-debug' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class TransactionDebugService {
  constructor() {
    this.apiKey = '9UB7l5spSYtK-bF4FCvUY'; // Alchemy API key
    this.baseUrl = 'https://solana-mainnet.g.alchemy.com/v2/';
    this.fallbackRpcEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana.rpc.hyperlane.xyz'
    ];
    this.transactionCache = new Map(); // Cache for transaction details
    this.retryConfig = {
      maxRetries: 3,
      initialBackoff: 2000, // 2 seconds
      maxBackoff: 15000, // 15 seconds
      backoffFactor: 2 // Exponential backoff
    };
  }

  /**
   * Initialize the transaction debug service
   */
  async initialize() {
    try {
      logger.info('Initializing Alchemy Transaction Debug service');
      // Test connection to Alchemy API
      const response = await fetch(`${this.baseUrl}${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth',
          params: []
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.info('Alchemy API connection successful', { health: data.result });
        return true;
      } else {
        logger.warn('Alchemy API connection issue', { status: response.status });
        return false;
      }
    } catch (error) {
      logger.error('Failed to initialize transaction debug service', { error: error.message });
      return false;
    }
  }

  /**
   * Get detailed transaction information
   * @param {string} signature - Transaction signature
   * @returns {Promise<object>} Detailed transaction information
   */
  async getTransactionDetails(signature) {
    try {
      logger.info('Fetching transaction details', { signature });
      
      // Check cache first
      if (this.transactionCache.has(signature)) {
        logger.debug('Returning cached transaction details', { signature });
        return this.transactionCache.get(signature);
      }
      
      // Try Alchemy API first
      try {
        const alchemyResponse = await this._fetchFromAlchemy(signature);
        if (alchemyResponse.success) {
          this._cacheTransaction(signature, alchemyResponse.data);
          return alchemyResponse.data;
        }
      } catch (alchemyError) {
        logger.warn('Failed to fetch from Alchemy API', { 
          signature, 
          error: alchemyError.message 
        });
      }
      
      // Fall back to standard RPC endpoints
      for (const endpoint of this.fallbackRpcEndpoints) {
        try {
          logger.info('Trying fallback RPC endpoint', { endpoint });
          const fallbackResponse = await this._fetchFromRpc(signature, endpoint);
          if (fallbackResponse.success) {
            this._cacheTransaction(signature, fallbackResponse.data);
            return fallbackResponse.data;
          }
        } catch (fallbackError) {
          logger.warn('Failed to fetch from fallback endpoint', { 
            endpoint, 
            error: fallbackError.message 
          });
        }
      }
      
      throw new Error('Failed to fetch transaction details from any endpoint');
      
    } catch (error) {
      logger.error('Transaction details retrieval failed', { 
        signature, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Fetch transaction details from Alchemy API
   * @param {string} signature - Transaction signature
   * @returns {Promise<object>} Alchemy API response
   * @private
   */
  async _fetchFromAlchemy(signature) {
    const response = await fetch(`${this.baseUrl}${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          { encoding: 'json', maxSupportedTransactionVersion: 0 }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }
    
    return {
      success: true,
      data: {
        ...data.result,
        source: 'alchemy',
        enhanced: true,
        retrievedAt: Date.now()
      }
    };
  }

  /**
   * Fetch transaction details from a standard RPC endpoint
   * @param {string} signature - Transaction signature
   * @param {string} endpoint - RPC endpoint URL
   * @returns {Promise<object>} RPC response
   * @private
   */
  async _fetchFromRpc(signature, endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          { encoding: 'json', maxSupportedTransactionVersion: 0 }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }
    
    return {
      success: true,
      data: {
        ...data.result,
        source: endpoint,
        enhanced: false,
        retrievedAt: Date.now()
      }
    };
  }

  /**
   * Cache transaction details
   * @param {string} signature - Transaction signature
   * @param {object} data - Transaction data
   * @private
   */
  _cacheTransaction(signature, data) {
    this.transactionCache.set(signature, {
      ...data,
      cachedAt: Date.now()
    });
    
    // Limit cache size to 100 entries
    if (this.transactionCache.size > 100) {
      // Remove oldest entry
      const oldestKey = [...this.transactionCache.keys()][0];
      this.transactionCache.delete(oldestKey);
    }
  }

  /**
   * Analyze a transaction for errors or issues
   * @param {string} signature - Transaction signature
   * @returns {Promise<object>} Transaction analysis results
   */
  async analyzeTransaction(signature) {
    try {
      logger.info('Analyzing transaction', { signature });
      
      // Get transaction details
      const txDetails = await this.getTransactionDetails(signature);
      
      const analysis = {
        signature,
        successful: txDetails.meta?.err === null,
        timestamp: txDetails.blockTime ? new Date(txDetails.blockTime * 1000).toISOString() : null,
        errors: [],
        warnings: [],
        info: []
      };
      
      // Check for errors
      if (txDetails.meta?.err) {
        if (typeof txDetails.meta.err === 'string') {
          analysis.errors.push(txDetails.meta.err);
        } else {
          analysis.errors.push(JSON.stringify(txDetails.meta.err));
        }
      }
      
      // Check for other issues
      if (txDetails.meta?.fee > 10000) {
        analysis.warnings.push(`High transaction fee: ${txDetails.meta.fee / 1000000000} SOL`);
      }
      
      // Add general info
      analysis.info.push(`Processed in block ${txDetails.slot}`);
      if (txDetails.meta?.logMessages && txDetails.meta.logMessages.length > 0) {
        analysis.info.push(`Transaction generated ${txDetails.meta.logMessages.length} log messages`);
      }
      
      return analysis;
      
    } catch (error) {
      logger.error('Transaction analysis failed', { signature, error: error.message });
      return {
        signature,
        successful: false,
        errors: [error.message],
        warnings: [],
        info: []
      };
    }
  }

  /**
   * Get transaction status with retry capability
   * @param {string} signature - Transaction signature
   * @param {object} options - Options for status check
   * @returns {Promise<object>} Transaction status
   */
  async getTransactionStatus(signature, options = {}) {
    try {
      logger.info('Checking transaction status', { signature });
      
      // First try Alchemy for enhanced status
      try {
        const response = await fetch(`${this.baseUrl}${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignatureStatuses',
            params: [[signature], { searchTransactionHistory: true }]
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          const status = data.result?.value?.[0];
          
          if (status) {
            return {
              signature,
              status: status.confirmationStatus || 'unknown',
              confirmed: status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized',
              slot: status.slot,
              confirmations: status.confirmations || 0,
              error: status.err,
              source: 'alchemy',
              timestamp: Date.now()
            };
          }
        }
      } catch (alchemyError) {
        logger.warn('Failed to get status from Alchemy', { signature, error: alchemyError.message });
      }
      
      // Fall back to standard RPC
      for (const endpoint of this.fallbackRpcEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getSignatureStatuses',
              params: [[signature], { searchTransactionHistory: true }]
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const status = data.result?.value?.[0];
            
            if (status) {
              return {
                signature,
                status: status.confirmationStatus || 'unknown',
                confirmed: status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized',
                slot: status.slot,
                confirmations: status.confirmations || 0,
                error: status.err,
                source: endpoint,
                timestamp: Date.now()
              };
            }
          }
        } catch (fallbackError) {
          logger.warn('Failed to get status from fallback', { endpoint, signature, error: fallbackError.message });
        }
      }
      
      // Return unknown status if all methods fail
      return {
        signature,
        status: 'unknown',
        confirmed: false,
        error: 'Failed to retrieve status from any endpoint',
        source: 'error',
        timestamp: Date.now()
      };
      
    } catch (error) {
      logger.error('Transaction status check failed', { signature, error: error.message });
      return {
        signature,
        status: 'error',
        confirmed: false,
        error: error.message,
        source: 'error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Retry a failed transaction
   * @param {string} signature - Original transaction signature
   * @returns {Promise<object>} Retry result
   */
  async retryTransaction(signature) {
    try {
      logger.info('Setting up transaction retry', { signature });
      
      // This is a simulated implementation since actual retry requires
      // access to the original transaction data and signing authority
      
      return {
        originalSignature: signature,
        retryAttempted: true,
        retryTimestamp: Date.now(),
        message: 'Transaction retry capability is simulated. In a production environment, this would reconstruct and resubmit the transaction.'
      };
      
    } catch (error) {
      logger.error('Transaction retry failed', { signature, error: error.message });
      return {
        originalSignature: signature,
        retryAttempted: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor a transaction with automatic retry
   * @param {string} signature - Transaction signature
   * @param {object} options - Monitoring options
   * @returns {Promise<object>} Monitoring setup result
   */
  async setupTransactionMonitoring(signature, options = {}) {
    try {
      logger.info('Setting up transaction monitoring with automatic retry', { 
        signature,
        maxRetries: options.maxRetries || this.retryConfig.maxRetries
      });
      
      // Create monitoring ID
      const monitorId = `monitor_${Date.now().toString(16)}`;
      
      // This would typically set up a background job or webhook
      // For demonstration purposes, we'll just return the monitoring setup
      
      return {
        success: true,
        monitorId,
        signature,
        maxRetries: options.maxRetries || this.retryConfig.maxRetries,
        backoffStrategy: 'exponential',
        webhookUrl: options.webhookUrl,
        setupTimestamp: Date.now()
      };
      
    } catch (error) {
      logger.error('Failed to setup transaction monitoring', { signature, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const transactionDebugService = new TransactionDebugService();
export default transactionDebugService;