// API Connectivity Checker and Configuration
// Provides utilities for verifying API endpoints and diagnosing connectivity issues

import { fetchWithRetry, isUrlReachable, verifyApiEndpoint, diagnoseConnectivity } from './error-monitoring.js';

// Critical API endpoints that should be monitored
const CRITICAL_ENDPOINTS = {
    // Authentication endpoints
    auth: {
        challenge: '/api/auth/challenge',
        login: '/api/auth/login',
        verify: '/api/auth/verify'
    },
    // Token creation endpoints
    tokens: {
        create: '/api/tokens/create',
        status: '/api/tokens/status',
        metadata: '/api/tokens/metadata'
    },
    // IPFS endpoints
    ipfs: {
        pinata: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        nftStorage: 'https://api.nft.storage/upload',
        web3storage: 'https://api.web3.storage/upload'
    },
    // Blockchain endpoints
    solana: {
        mainnet: 'https://api.mainnet-beta.solana.com',
        helius: 'https://api.helius.xyz/v0/token/mint'
    }
};

/**
 * Get the base API URL based on environment
 * @returns {string} - Base API URL
 */
export function getBaseApiUrl() {
    // Check if in browser environment
    if (typeof window !== 'undefined') {
        // First check if API URL is specified in environment variables
        if (window.ENV && window.ENV.API_URL) {
            return window.ENV.API_URL;
        }
        
        // Otherwise derive from current origin
        const origin = window.location.origin;
        // If running on localhost, use a default development API URL
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return 'http://localhost:3000';
        }
        // Otherwise use the same origin
        return origin;
    }
    
    // For Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env.API_URL || 'http://localhost:3000';
    }
    
    // Default fallback
    return 'http://localhost:3000';
}

/**
 * Build a full API URL
 * @param {string} endpoint - API endpoint path
 * @returns {string} - Full API URL
 */
export function buildApiUrl(endpoint) {
    const base = getBaseApiUrl();
    
    // If endpoint is already a full URL, return it as is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    
    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    
    return base + endpoint;
}

/**
 * Verify the connectivity to all critical endpoints
 * @returns {Promise<object>} - Health status of all endpoints
 */
export async function verifyAllEndpoints() {
    console.log('🔍 Verifying connectivity to critical API endpoints...');
    
    const results = {
        timestamp: new Date().toISOString(),
        overall: 'unknown',
        endpoints: {}
    };
    
    const baseUrl = getBaseApiUrl();
    let hasFailures = false;
    let hasWarnings = false;
    
    // Check base API health
    try {
        const baseHealth = await verifyApiEndpoint(baseUrl + '/health');
        results.baseApi = baseHealth;
        
        if (!baseHealth.reachable || !baseHealth.healthy) {
            console.error(`❌ Base API unreachable or unhealthy: ${baseUrl}`);
            hasFailures = true;
        }
    } catch (error) {
        results.baseApi = {
            url: baseUrl,
            reachable: false,
            error: error.message
        };
        hasFailures = true;
        console.error(`❌ Error checking base API: ${error.message}`);
    }
    
    // Check auth endpoints
    for (const [key, endpoint] of Object.entries(CRITICAL_ENDPOINTS.auth)) {
        const url = buildApiUrl(endpoint);
        try {
            const health = await verifyApiEndpoint(url);
            results.endpoints[`auth_${key}`] = health;
            
            if (!health.reachable) {
                console.error(`❌ Auth endpoint unreachable: ${url}`);
                hasFailures = true;
            } else if (!health.healthy) {
                console.warn(`⚠️ Auth endpoint unhealthy: ${url}`);
                hasWarnings = true;
            } else {
                console.log(`✅ Auth endpoint healthy: ${url}`);
            }
        } catch (error) {
            results.endpoints[`auth_${key}`] = {
                url,
                reachable: false,
                error: error.message
            };
            hasFailures = true;
            console.error(`❌ Error checking auth endpoint ${url}:`, error.message);
        }
    }
    
    // Check token endpoints
    for (const [key, endpoint] of Object.entries(CRITICAL_ENDPOINTS.tokens)) {
        const url = buildApiUrl(endpoint);
        try {
            const health = await verifyApiEndpoint(url);
            results.endpoints[`token_${key}`] = health;
            
            if (!health.reachable) {
                console.error(`❌ Token endpoint unreachable: ${url}`);
                hasFailures = true;
            } else if (!health.healthy) {
                console.warn(`⚠️ Token endpoint unhealthy: ${url}`);
                hasWarnings = true;
            } else {
                console.log(`✅ Token endpoint healthy: ${url}`);
            }
        } catch (error) {
            results.endpoints[`token_${key}`] = {
                url,
                reachable: false,
                error: error.message
            };
            hasFailures = true;
            console.error(`❌ Error checking token endpoint ${url}:`, error.message);
        }
    }
    
    // Check IPFS services (just basic connectivity)
    for (const [service, url] of Object.entries(CRITICAL_ENDPOINTS.ipfs)) {
        try {
            const reachable = await isUrlReachable(url);
            results.endpoints[`ipfs_${service}`] = {
                url,
                reachable,
                service
            };
            
            if (!reachable) {
                console.warn(`⚠️ IPFS service unreachable: ${service}`);
                hasWarnings = true;
            } else {
                console.log(`✅ IPFS service reachable: ${service}`);
            }
        } catch (error) {
            results.endpoints[`ipfs_${service}`] = {
                url,
                reachable: false,
                error: error.message,
                service
            };
            hasWarnings = true;
            console.warn(`⚠️ Error checking IPFS service ${service}:`, error.message);
        }
    }
    
    // Check Solana RPC endpoints (just basic connectivity)
    for (const [network, url] of Object.entries(CRITICAL_ENDPOINTS.solana)) {
        try {
            const reachable = await isUrlReachable(url);
            results.endpoints[`solana_${network}`] = {
                url,
                reachable,
                network
            };
            
            if (!reachable) {
                console.warn(`⚠️ Solana ${network} endpoint unreachable: ${url}`);
                hasWarnings = true;
            } else {
                console.log(`✅ Solana ${network} endpoint reachable: ${url}`);
            }
        } catch (error) {
            results.endpoints[`solana_${network}`] = {
                url,
                reachable: false,
                error: error.message,
                network
            };
            hasWarnings = true;
            console.warn(`⚠️ Error checking Solana ${network} endpoint:`, error.message);
        }
    }
    
    // Set overall status
    if (hasFailures) {
        results.overall = 'critical';
        console.error('❌ Critical API connectivity issues detected');
    } else if (hasWarnings) {
        results.overall = 'degraded';
        console.warn('⚠️ Some API services may be degraded');
    } else {
        results.overall = 'healthy';
        console.log('✅ All critical API endpoints are healthy');
    }
    
    console.log('🔍 API connectivity verification complete', results);
    return results;
}

/**
 * Get detailed connectivity diagnostics, including CORS and network analysis
 * @returns {Promise<object>} - Comprehensive diagnostics
 */
export async function getDiagnostics() {
    // First run general connectivity diagnosis
    const connectivityResults = await diagnoseConnectivity(
        Object.values(CRITICAL_ENDPOINTS).flatMap(group => Object.values(group))
    );
    
    // Then check specific API endpoints
    const apiResults = await verifyAllEndpoints();
    
    // Combine results
    return {
        timestamp: new Date().toISOString(),
        connectivity: connectivityResults,
        apiHealth: apiResults,
        browserInfo: {
            userAgent: navigator.userAgent,
            online: navigator.onLine,
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language
        },
        recommendations: generateRecommendations(connectivityResults, apiResults)
    };
}

/**
 * Generate recommendations based on diagnostic results
 * @param {object} connectivity - Connectivity diagnostic results
 * @param {object} apiHealth - API health check results
 * @returns {object} - Recommendations
 */
function generateRecommendations(connectivity, apiHealth) {
    const recommendations = {
        networkIssues: [],
        corsIssues: [],
        endpointIssues: [],
        clientIssues: []
    };
    
    // Check for network issues
    if (connectivity.networkIssuesDetected) {
        recommendations.networkIssues.push(
            'Check your internet connection',
            'Try using a different network',
            'If on VPN, check if it\'s blocking required domains'
        );
    }
    
    // Check for CORS issues
    if (connectivity.corsIssuesDetected) {
        recommendations.corsIssues.push(
            'Ensure the API server has CORS headers properly configured',
            'Check that your frontend origin is allowed by the API',
            'Temporarily use a CORS proxy for testing',
            'Add appropriate CORS headers: Access-Control-Allow-Origin, etc.'
        );
    }
    
    // Check for endpoint issues
    const failedEndpoints = Object.entries(apiHealth.endpoints)
        .filter(([, status]) => !status.reachable)
        .map(([endpoint]) => endpoint);
    
    if (failedEndpoints.length > 0) {
        recommendations.endpointIssues.push(
            `Unreachable endpoints: ${failedEndpoints.join(', ')}`,
            'Verify API server is running and accessible',
            'Check if endpoint URLs are correct',
            'Ensure your network allows connections to these endpoints'
        );
    }
    
    return recommendations;
}

// API connection status listener
let apiConnectionListeners = [];
let currentConnectionStatus = true; // Assume connected initially

/**
 * Subscribe to API connection status changes
 * @param {Function} listener - Callback function(isConnected)
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToApiConnectionStatus(listener) {
    apiConnectionListeners.push(listener);
    
    // Immediately notify with current status
    listener(currentConnectionStatus);
    
    // Return unsubscribe function
    return () => {
        apiConnectionListeners = apiConnectionListeners.filter(l => l !== listener);
    };
}

/**
 * Update API connection status
 * @param {boolean} isConnected - Whether API is connected
 */
export function updateApiConnectionStatus(isConnected) {
    const changed = currentConnectionStatus !== isConnected;
    currentConnectionStatus = isConnected;
    
    if (changed) {
        // Notify all listeners
        apiConnectionListeners.forEach(listener => listener(isConnected));
        
        if (isConnected) {
            console.log('🔗 API connection restored');
        } else {
            console.error('❌ API connection lost');
        }
    }
}

/**
 * Periodically check API connectivity
 * @param {number} intervalMs - Check interval in milliseconds (default: 30000)
 * @returns {object} - Controller with start/stop methods
 */
export function startApiConnectionMonitoring(intervalMs = 30000) {
    let timerId = null;
    
    const check = async () => {
        try {
            // Check if base API is reachable
            const baseUrl = getBaseApiUrl();
            const health = await verifyApiEndpoint(baseUrl + '/health');
            updateApiConnectionStatus(health.reachable);
        } catch (error) {
            console.error('❌ API connection check failed:', error.message);
            updateApiConnectionStatus(false);
        }
    };
    
    const start = () => {
        if (!timerId) {
            // Initial check
            check();
            // Then set up interval
            timerId = setInterval(check, intervalMs);
            console.log(`🔍 API connection monitoring started (interval: ${intervalMs}ms)`);
        }
    };
    
    const stop = () => {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
            console.log('🔍 API connection monitoring stopped');
        }
    };
    
    return {
        start,
        stop,
        check
    };
}

// Export the functions
export default {
    CRITICAL_ENDPOINTS,
    getBaseApiUrl,
    buildApiUrl,
    verifyAllEndpoints,
    getDiagnostics,
    subscribeToApiConnectionStatus,
    updateApiConnectionStatus,
    startApiConnectionMonitoring
};