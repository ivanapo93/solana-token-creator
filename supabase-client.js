/**
 * Supabase Client Configuration
 * For promotional website system integration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Database operations for promotional websites
 */
class SupabasePromoManager {
    
    // Store deployment information
    async storeDeployment(deploymentData) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .insert([{
                site_id: deploymentData.siteId,
                coin_name: deploymentData.coinData.name,
                coin_symbol: deploymentData.coinData.symbol,
                contract_address: deploymentData.coinData.contractAddress,
                url: deploymentData.url,
                deployment_id: deploymentData.deploymentId,
                platform: deploymentData.platform,
                status: 'deployed',
                metadata: {
                    imageUrl: deploymentData.coinData.imageUrl,
                    description: deploymentData.coinData.description,
                    generatedAt: deploymentData.generatedAt
                }
            }]);
        
        if (error) {
            console.error('Error storing deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // Get deployment by site ID
    async getDeployment(siteId) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('*')
            .eq('site_id', siteId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // Not found error
            console.error('Error getting deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // List all deployments with pagination
    async listDeployments(limit = 50, offset = 0) {
        const { data, error, count } = await supabase
            .from('promo_deployments')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error('Error listing deployments:', error);
            throw error;
        }
        
        return { deployments: data, total: count };
    }
    
    // Update deployment status
    async updateDeploymentStatus(siteId, status) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('site_id', siteId);
        
        if (error) {
            console.error('Error updating deployment status:', error);
            throw error;
        }
        
        return data;
    }
    
    // Delete deployment record
    async deleteDeployment(siteId) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .delete()
            .eq('site_id', siteId);
        
        if (error) {
            console.error('Error deleting deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // Log API usage for monitoring
    async logApiUsage(platform, endpoint, statusCode, responseTime, errorMessage = null) {
        const { error } = await supabase
            .from('api_usage_logs')
            .insert([{
                platform,
                endpoint,
                status_code: statusCode,
                response_time_ms: responseTime,
                error_message: errorMessage
            }]);
        
        if (error) {
            console.error('Error logging API usage:', error);
        }
    }
    
    // Get deployment statistics
    async getDeploymentStats(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('platform, status, created_at')
            .gte('created_at', startDate.toISOString());
        
        if (error) {
            console.error('Error getting deployment stats:', error);
            throw error;
        }
        
        // Process stats
        const stats = {
            total: data.length,
            successful: data.filter(d => d.status === 'deployed').length,
            failed: data.filter(d => d.status === 'failed').length,
            platformBreakdown: {}
        };
        
        data.forEach(deployment => {
            stats.platformBreakdown[deployment.platform] = 
                (stats.platformBreakdown[deployment.platform] || 0) + 1;
        });
        
        return stats;
    }
    
    // Search deployments by coin symbol or name
    async searchDeployments(searchTerm, limit = 20) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('*')
            .or(`coin_name.ilike.%${searchTerm}%,coin_symbol.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) {
            console.error('Error searching deployments:', error);
            throw error;
        }
        
        return data;
    }
    
    // Get deployments by contract address
    async getDeploymentsByContract(contractAddress) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('*')
            .eq('contract_address', contractAddress)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error getting deployments by contract:', error);
            throw error;
        }
        
        return data;
    }
    
    // Update daily statistics
    async updateDailyStats() {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's deployments
        const { data: deployments, error } = await supabase
            .from('promo_deployments')
            .select('platform, status')
            .gte('created_at', today);
        
        if (error) {
            console.error('Error getting daily deployments:', error);
            return;
        }
        
        // Calculate stats
        const stats = {
            total_deployments: deployments.length,
            successful_deployments: deployments.filter(d => d.status === 'deployed').length,
            failed_deployments: deployments.filter(d => d.status === 'failed').length,
            platform_usage: {}
        };
        
        deployments.forEach(deployment => {
            stats.platform_usage[deployment.platform] = 
                (stats.platform_usage[deployment.platform] || 0) + 1;
        });
        
        // Upsert daily stats
        const { error: upsertError } = await supabase
            .from('deployment_stats')
            .upsert([{
                date: today,
                ...stats
            }]);
        
        if (upsertError) {
            console.error('Error updating daily stats:', upsertError);
        }
    }
    
    // Health check for Supabase connection
    async healthCheck() {
        try {
            const { data, error } = await supabase
                .from('promo_deployments')
                .select('count(*)')
                .limit(1);
            
            if (error) {
                return { healthy: false, error: error.message };
            }
            
            return { healthy: true, message: 'Supabase connection healthy' };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
}

/**
 * Initialize Supabase client with connection test
 */
async function initializeSupabase() {
    try {
        console.log('🗄️ Initializing Supabase connection...');
        
        const promoManager = new SupabasePromoManager();
        const healthCheck = await promoManager.healthCheck();
        
        if (healthCheck.healthy) {
            console.log('✅ Supabase connection established successfully');
            return promoManager;
        } else {
            console.error('❌ Supabase health check failed:', healthCheck.error);
            throw new Error(`Supabase connection failed: ${healthCheck.error}`);
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        throw error;
    }
}

module.exports = {
    supabase,
    SupabasePromoManager,
    initializeSupabase
};