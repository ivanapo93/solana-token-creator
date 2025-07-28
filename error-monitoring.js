// Enhanced Error Monitoring and Retry System
// Provides robust fetch error handling with automatic retries and comprehensive logging

/**
 * Enhanced fetch function with retry capability, timeout, and detailed error logging
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} retryDelay - Base delay between retries in ms (default: 1000)
 * @param {number} timeout - Request timeout in ms (default: 10000)
 * @param {Function} onRetry - Callback function executed before each retry (optional)
 * @returns {Promise<Response>} - The fetch response
 */
export async function fetchWithRetry(url, options = {}, retries = 3, retryDelay = 1000, timeout = 10000, onRetry = null) {
    // Add request ID for tracking
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Add headers if not present
    options.headers = options.headers || {};
    
    // Add request ID to headers for tracking
    options.headers['X-Request-ID'] = requestId;
    
    // Ensure Content-Type is set for POST requests with body
    if (options.method === 'POST' && options.body && !options.headers['Content-Type']) {
        if (typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
    }
    
    // Log the request
    console.log(`🔄 API Request [${requestId}]: ${options.method || 'GET'} ${url.split('?')[0]}`);
    
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        // If this is a retry, wait before trying again with exponential backoff
        if (attempt > 0) {
            const delay = retryDelay * Math.pow(2, attempt - 1);
            console.log(`⏱️ Retry attempt ${attempt}/${retries} for request [${requestId}] after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Execute onRetry callback if provided
            if (onRetry && typeof onRetry === 'function') {
                await onRetry(attempt, lastError);
            }
        }
        
        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            // Add signal to options
            const fetchOptions = {
                ...options,
                signal: options.signal || controller.signal
            };
            
            // Execute fetch with timeout
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // Calculate response time
            const responseTime = Date.now() - startTime;
            
            // Log success response
            console.log(`✅ API Response [${requestId}]: ${response.status} ${response.statusText} (${responseTime}ms)`);
            
            // If response is not ok but doesn't throw an error, we'll handle it as an error
            if (!response.ok) {
                // Try to get error details from response
                let errorBody;
                try {
                    // Clone the response to read it twice (once for error logging, once for the caller)
                    const clonedResponse = response.clone();
                    errorBody = await clonedResponse.text();
                    
                    console.error(`❌ API Error [${requestId}]: ${response.status} ${response.statusText}`, {
                        url,
                        method: options.method || 'GET',
                        statusCode: response.status,
                        errorBody,
                        attempt: attempt + 1,
                        requestId
                    });
                    
                    // For certain status codes, we'll retry
                    if ([408, 429, 500, 502, 503, 504].includes(response.status) && attempt < retries) {
                        lastError = new Error(`HTTP Error ${response.status}: ${response.statusText}`);
                        lastError.status = response.status;
                        lastError.responseBody = errorBody;
                        throw lastError; // This will trigger a retry
                    }
                } catch (parseError) {
                    // If we can't parse the error body, just log what we can
                    console.error(`❌ API Error [${requestId}]: ${response.status} ${response.statusText} (Error body could not be parsed)`);
                }
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            // Calculate time spent so far
            const timeSpent = Date.now() - startTime;
            
            // Detailed error categorization
            let errorCategory = 'Unknown';
            let shouldRetry = attempt < retries;
            
            // Categorize the error for better debugging
            if (error.name === 'AbortError') {
                errorCategory = 'Timeout';
                // Timeouts are often transient, so we should retry
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                errorCategory = 'Network';
                // Network errors are often transient, so we should retry
            } else if (error.message.includes('CORS')) {
                errorCategory = 'CORS';
                // CORS errors are configuration issues, retrying won't help
                shouldRetry = false;
            } else if (error.message.includes('URL scheme') || error.message.includes('invalid URL')) {
                errorCategory = 'Invalid URL';
                // Invalid URL is a configuration issue, retrying won't help
                shouldRetry = false;
            } else if (error.status >= 400 && error.status < 500) {
                errorCategory = 'Client Error';
                // Most client errors won't be resolved by retrying, except for rate limiting
                shouldRetry = error.status === 429;
            } else if (error.status >= 500) {
                errorCategory = 'Server Error';
                // Server errors might be transient, so we should retry
            }
            
            // Log the error with details
            console.error(`❌ API ${errorCategory} Error [${requestId}]`, {
                url,
                method: options.method || 'GET',
                errorMessage: error.message,
                errorName: error.name,
                errorStack: error.stack,
                statusCode: error.status,
                responseBody: error.responseBody,
                attempt: attempt + 1,
                totalAttempts: retries + 1,
                timeSpent: `${timeSpent}ms`,
                requestId,
                willRetry: shouldRetry
            });
            
            // If we've reached the max retries or determined we shouldn't retry, throw the error
            if (!shouldRetry) {
                // Enhance error with request details for better debugging
                error.requestId = requestId;
                error.url = url;
                error.method = options.method || 'GET';
                error.attempts = attempt + 1;
                error.category = errorCategory;
                throw error;
            }
            
            // Otherwise, continue to the next retry attempt
            console.log(`🔄 Will retry request [${requestId}], attempt ${attempt + 1}/${retries}`);
        }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError;
}

/**
 * Generate a unique request ID for tracking
 * @returns {string} - Request ID
 */
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Check if a URL is reachable with health check
 * @param {string} url - URL to check
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if reachable, false otherwise
 */
export async function isUrlReachable(url, timeout = 5000) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.warn(`⚠️ URL ${url} is not reachable: ${error.message}`);
        return false;
    }
}

/**
 * Verify API endpoint and return health status
 * @param {string} url - API endpoint to verify
 * @param {object} options - Options for health check
 * @returns {Promise<object>} - Health status object
 */
export async function verifyApiEndpoint(url, options = {}) {
    const startTime = Date.now();
    
    try {
        // Try to reach the API with a simple HEAD request first
        const reachable = await isUrlReachable(url);
        
        if (!reachable) {
            return {
                url,
                reachable: false,
                error: 'Endpoint unreachable',
                responseTime: Date.now() - startTime
            };
        }
        
        // If the API has a specific health endpoint, use it
        const healthEndpoint = options.healthEndpoint || url;
        
        const response = await fetchWithRetry(healthEndpoint, {
            method: options.method || 'GET',
            headers: options.headers || {}
        }, 1, 1000, 5000);
        
        const responseTime = Date.now() - startTime;
        
        return {
            url,
            reachable: true,
            status: response.status,
            healthy: response.ok,
            responseTime
        };
    } catch (error) {
        return {
            url,
            reachable: false,
            error: error.message,
            responseTime: Date.now() - startTime
        };
    }
}

/**
 * Monitor and diagnose connectivity issues
 * @param {string[]} endpoints - List of critical API endpoints to check
 * @returns {Promise<object>} - Connectivity diagnostic results
 */
export async function diagnoseConnectivity(endpoints = []) {
    console.log('🔍 Diagnosing API connectivity issues...');
    
    const results = {
        timestamp: new Date().toISOString(),
        internetConnected: navigator.onLine,
        endpointChecks: {},
        corsIssuesDetected: false,
        networkIssuesDetected: false
    };
    
    // Check internet connectivity first
    if (!navigator.onLine) {
        console.error('❌ No internet connection detected');
        results.networkIssuesDetected = true;
        return results;
    }
    
    // Check public API to verify general internet connectivity
    try {
        const publicApiCheck = await isUrlReachable('https://www.google.com');
        results.publicApiReachable = publicApiCheck;
        
        if (!publicApiCheck) {
            results.networkIssuesDetected = true;
            console.error('❌ Internet connectivity issues detected - cannot reach public APIs');
        }
    } catch (error) {
        results.networkIssuesDetected = true;
        console.error('❌ Error checking public API:', error.message);
    }
    
    // Check each provided endpoint
    for (const endpoint of endpoints) {
        try {
            const health = await verifyApiEndpoint(endpoint);
            results.endpointChecks[endpoint] = health;
            
            if (!health.reachable) {
                console.error(`❌ API endpoint unreachable: ${endpoint}`);
            } else if (!health.healthy) {
                console.warn(`⚠️ API endpoint unhealthy: ${endpoint} (Status: ${health.status})`);
            } else {
                console.log(`✅ API endpoint healthy: ${endpoint} (${health.responseTime}ms)`);
            }
            
            // Check for CORS issues
            if (health.error && health.error.includes('CORS')) {
                results.corsIssuesDetected = true;
            }
        } catch (error) {
            results.endpointChecks[endpoint] = {
                url: endpoint,
                reachable: false,
                error: error.message
            };
            console.error(`❌ Error checking endpoint ${endpoint}:`, error.message);
        }
    }
    
    console.log('🔍 Connectivity diagnosis complete', results);
    return results;
}

/**
 * Utility to help with CORS issues by suggesting configuration
 * @param {string} targetUrl - The URL having CORS issues
 * @returns {object} - CORS troubleshooting suggestions
 */
export function getCorsHelperSuggestions(targetUrl) {
    try {
        const url = new URL(targetUrl);
        
        return {
            serverHeaderSuggestions: [
                `Access-Control-Allow-Origin: ${window.location.origin}`,
                'Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE',
                'Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID',
                'Access-Control-Allow-Credentials: true'
            ],
            clientSuggestions: [
                'Add appropriate "mode" to fetch options (cors, no-cors, etc.)',
                'Ensure credentials handling is correctly configured',
                'Consider using a CORS proxy for development',
                'Verify the API supports CORS requests from your origin'
            ],
            domainInfo: {
                targetDomain: url.origin,
                currentOrigin: window.location.origin,
                isSameOrigin: url.origin === window.location.origin
            }
        };
    } catch (error) {
        return {
            error: `Invalid URL: ${error.message}`,
            serverHeaderSuggestions: [],
            clientSuggestions: ['Verify the URL is correctly formatted']
        };
    }
}

// Error categorization utility
export function categorizeError(error) {
    // Default category
    let category = 'UNKNOWN';
    let recoverable = true;
    let retryable = true;
    
    // Categorize based on error message
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
        category = 'TIMEOUT';
        recoverable = true;
        retryable = true;
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        category = 'NETWORK';
        recoverable = true;
        retryable = true;
    } else if (error.message.includes('NetworkError') || error.message.includes('network')) {
        category = 'NETWORK';
        recoverable = true;
        retryable = true;
    } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        category = 'CORS';
        recoverable = false; // CORS issues typically need configuration changes
        retryable = false;
    } else if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('auth')) {
        category = 'AUTH';
        recoverable = true; // Can potentially recover with re-authentication
        retryable = false; // Retrying with same credentials won't help
    } else if (error.status === 403 || error.message.includes('forbidden')) {
        category = 'FORBIDDEN';
        recoverable = false; // Permission issues need configuration changes
        retryable = false;
    } else if (error.status === 404 || error.message.includes('not found')) {
        category = 'NOT_FOUND';
        recoverable = false; // Resource missing
        retryable = false;
    } else if (error.status === 429 || error.message.includes('rate limit')) {
        category = 'RATE_LIMIT';
        recoverable = true;
        retryable = true; // Can retry after a delay
    } else if (error.status >= 500 || error.message.includes('server error')) {
        category = 'SERVER';
        recoverable = true;
        retryable = true; // Server errors are often transient
    }
    
    return {
        category,
        recoverable,
        retryable,
        status: error.status || 0,
        name: error.name,
        message: error.message,
        original: error
    };
}

// Export functions for use in other files
export default {
    fetchWithRetry,
    isUrlReachable,
    verifyApiEndpoint,
    diagnoseConnectivity,
    getCorsHelperSuggestions,
    categorizeError
};