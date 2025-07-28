// Enhanced Error Logging and Diagnostics
// Provides comprehensive error logging, tracking and visualization for debugging

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Configure logger with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'api-error-logger'
  },
  transports: [
    // Console output with formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Dedicated error log file
    new winston.transports.File({ 
      filename: 'logs/fetch-errors.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file for all levels
    new winston.transports.File({ 
      filename: 'logs/api-requests.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

// Track errors for analysis
const errorHistory = {
  errors: [],
  maxSize: 100, // Max number of errors to keep in memory
  
  // Add error to history
  add(error, context = {}) {
    const errorRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      category: error.category || this.categorizeError(error),
      context,
      stack: error.stack
    };
    
    this.errors.unshift(errorRecord); // Add to beginning
    
    // Keep size limited
    if (this.errors.length > this.maxSize) {
      this.errors.pop();
    }
    
    return errorRecord;
  },
  
  // Get error history
  getAll() {
    return this.errors;
  },
  
  // Get error history with filtering
  getFiltered(options = {}) {
    let filtered = [...this.errors];
    
    if (options.category) {
      filtered = filtered.filter(e => e.category === options.category);
    }
    
    if (options.since) {
      const since = new Date(options.since);
      filtered = filtered.filter(e => new Date(e.timestamp) >= since);
    }
    
    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(search) || 
        e.name.toLowerCase().includes(search) ||
        (e.context && e.context.url && e.context.url.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  },
  
  // Get statistics about errors
  getStats() {
    if (this.errors.length === 0) {
      return {
        total: 0,
        byCategory: {},
        byEndpoint: {},
        recentErrors: []
      };
    }
    
    // Group by category
    const byCategory = this.errors.reduce((acc, error) => {
      const category = error.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    
    // Group by endpoint (if available in context)
    const byEndpoint = this.errors.reduce((acc, error) => {
      if (error.context && error.context.url) {
        const urlObj = new URL(error.context.url);
        const endpoint = urlObj.pathname;
        acc[endpoint] = (acc[endpoint] || 0) + 1;
      }
      return acc;
    }, {});
    
    // Recent errors (last 10)
    const recentErrors = this.errors.slice(0, 10).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      message: e.message,
      category: e.category,
      url: e.context?.url
    }));
    
    return {
      total: this.errors.length,
      byCategory,
      byEndpoint,
      recentErrors
    };
  },
  
  // Categorize error based on message and properties
  categorizeError(error) {
    // Default category
    let category = 'UNKNOWN';
    
    // Categorize based on error message and properties
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      category = 'TIMEOUT';
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      category = 'NETWORK';
    } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
      category = 'NETWORK';
    } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      category = 'CORS';
    } else if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('auth')) {
      category = 'AUTH';
    } else if (error.status === 403 || error.message.includes('forbidden')) {
      category = 'FORBIDDEN';
    } else if (error.status === 404 || error.message.includes('not found')) {
      category = 'NOT_FOUND';
    } else if (error.status === 429 || error.message.includes('rate limit')) {
      category = 'RATE_LIMIT';
    } else if (error.status >= 500 || error.message.includes('server error')) {
      category = 'SERVER';
    }
    
    return category;
  }
};

/**
 * Log a fetch error with enhanced context
 * @param {Error} error - The error object
 * @param {object} context - Additional context info
 * @param {string} level - Log level (error, warn, info)
 */
export function logFetchError(error, context = {}, level = 'error') {
  // Record error in history
  const errorRecord = errorHistory.add(error, context);
  
  // Ensure context has basic request info
  const enhancedContext = {
    errorId: errorRecord.id,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  // Add error category if not provided
  if (!error.category) {
    error.category = errorRecord.category;
  }
  
  // Log with winston
  logger.log(level, `Fetch Error [${error.category}]: ${error.message}`, {
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      status: error.status || error.statusCode,
      code: error.code
    },
    ...enhancedContext
  });
  
  // Return error record for reference
  return errorRecord;
}

/**
 * Log a successful fetch with timing information
 * @param {Response} response - Fetch response object
 * @param {object} context - Additional context info
 */
export function logFetchSuccess(response, context = {}) {
  const { url, method, requestId, startTime } = context;
  const responseTime = startTime ? Date.now() - startTime : null;
  
  logger.info(`Fetch Success: ${method || 'GET'} ${url}`, {
    requestId,
    url,
    method: method || 'GET',
    status: response.status,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log API connectivity status changes
 * @param {boolean} isConnected - Whether API is connected
 * @param {object} context - Additional context info
 */
export function logConnectivityChange(isConnected, context = {}) {
  const level = isConnected ? 'info' : 'error';
  const message = isConnected ? 'API Connection Restored' : 'API Connection Lost';
  
  logger.log(level, message, {
    connected: isConnected,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Get error history statistics
 * @returns {object} - Error statistics
 */
export function getErrorStats() {
  return errorHistory.getStats();
}

/**
 * Get filtered error history
 * @param {object} options - Filter options
 * @returns {array} - Filtered errors
 */
export function getFilteredErrors(options) {
  return errorHistory.getFiltered(options);
}

/**
 * Generate an HTML report of recent errors
 * @returns {string} - HTML report
 */
export function generateErrorReport() {
  const stats = errorHistory.getStats();
  const errors = errorHistory.getAll();
  
  // Create HTML report
  let html = `
    <html>
    <head>
      <title>API Error Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .stats { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .stat-box { background: #f8f9fa; border-radius: 5px; padding: 15px; flex: 1; margin: 0 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-box:first-child { margin-left: 0; }
        .stat-box:last-child { margin-right: 0; }
        .stat-value { font-size: 24px; font-weight: bold; color: #3498db; }
        .stat-label { font-size: 14px; color: #7f8c8d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #34495e; color: white; text-align: left; padding: 10px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .error-row { cursor: pointer; }
        .error-row:hover { background: #f5f5f5; }
        .error-details { display: none; background: #f8f9fa; padding: 10px; border-left: 4px solid #3498db; margin: 10px 0; }
        .category { padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; color: white; }
        .NETWORK { background: #e74c3c; }
        .TIMEOUT { background: #f39c12; }
        .CORS { background: #9b59b6; }
        .AUTH { background: #3498db; }
        .SERVER { background: #c0392b; }
        .UNKNOWN { background: #7f8c8d; }
        .chart { height: 200px; margin: 20px 0; }
        .timestamp { font-size: 12px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <h1>API Error Report</h1>
      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Total Errors</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${Object.keys(stats.byEndpoint).length}</div>
          <div class="stat-label">Affected Endpoints</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${stats.byCategory.NETWORK || 0}</div>
          <div class="stat-label">Network Errors</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${stats.byCategory.CORS || 0}</div>
          <div class="stat-label">CORS Errors</div>
        </div>
      </div>
      
      <h2>Recent Errors</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Category</th>
            <th>Message</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add rows for each error
  errors.slice(0, 20).forEach(error => {
    const timestamp = new Date(error.timestamp).toLocaleString();
    const category = error.category || 'UNKNOWN';
    const message = error.message || 'Unknown error';
    const url = error.context?.url || 'N/A';
    
    html += `
      <tr class="error-row" data-id="${error.id}">
        <td class="timestamp">${timestamp}</td>
        <td><span class="category ${category}">${category}</span></td>
        <td>${message}</td>
        <td>${url}</td>
      </tr>
      <tr>
        <td colspan="4">
          <div class="error-details" id="details-${error.id}">
            <p><strong>Error ID:</strong> ${error.id}</p>
            <p><strong>Name:</strong> ${error.name}</p>
            <p><strong>Status:</strong> ${error.status || 'N/A'}</p>
            <p><strong>Stack:</strong> <pre>${error.stack || 'No stack trace available'}</pre></p>
          </div>
        </td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
      
      <h2>Errors by Category</h2>
      <div class="chart" id="categoryChart"></div>
      
      <h2>Errors by Endpoint</h2>
      <div class="chart" id="endpointChart"></div>
      
      <script>
        // Simple toggle for error details
        document.querySelectorAll('.error-row').forEach(row => {
          row.addEventListener('click', () => {
            const id = row.getAttribute('data-id');
            const details = document.getElementById('details-' + id);
            details.style.display = details.style.display === 'block' ? 'none' : 'block';
          });
        });
      </script>
    </body>
    </html>
  `;
  
  return html;
}

// Export the functions
export default {
  logFetchError,
  logFetchSuccess,
  logConnectivityChange,
  getErrorStats,
  getFilteredErrors,
  generateErrorReport,
  logger,
  errorHistory
};