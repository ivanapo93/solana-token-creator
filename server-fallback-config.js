// server-fallback-config.js
// Enhanced RPC Connection Manager with automatic failover and health monitoring

class RpcConnectionManager {
  constructor(rpcEndpoints) {
    this.rpcEndpoints = rpcEndpoints || [
      "https://solana-mainnet.g.alchemy.com/v2/demo",
      "https://rpc.ankr.com/solana", 
      "https://api.mainnet-beta.solana.com",
      "https://solana-api.projectserum.com",
      "https://ssc-dao.genesysgo.net"
    ];
    this.currentIndex = 0;
    this.connection = null;
    this.healthStatus = new Map();
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
  }

  async init() {
    console.log('🔌 Initializing RPC connection with fallback support...');
    
    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      try {
        const endpoint = this.rpcEndpoints[this.currentIndex];
        console.log(`🔄 Trying RPC endpoint: ${endpoint}`);
        
        this.connection = new solanaWeb3.Connection(endpoint, "confirmed");
        
        // Enhanced health check with timeout
        const healthPromise = Promise.race([
          this.connection.getLatestBlockhash(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          )
        ]);
        
        await healthPromise;
        
        // Mark as healthy
        this.healthStatus.set(endpoint, {
          healthy: true,
          lastCheck: Date.now(),
          latency: Date.now() - this.lastHealthCheck
        });
        
        console.log(`✅ RPC connected successfully: ${endpoint}`);
        return;
      } catch (err) {
        const endpoint = this.rpcEndpoints[this.currentIndex];
        console.warn(`❌ RPC failed at ${endpoint}: ${err.message}`);
        
        // Mark as unhealthy
        this.healthStatus.set(endpoint, {
          healthy: false,
          lastCheck: Date.now(),
          error: err.message
        });
        
        this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
      }
    }
    throw new Error("❌ All RPC endpoints failed. Please check your internet connection.");
  }

  getConnection() {
    return this.connection;
  }

  // Enhanced failover with health checking
  async failover() {
    console.log('🔄 Initiating RPC failover...');
    const originalIndex = this.currentIndex;
    
    // Try each endpoint until we find a healthy one
    for (let attempts = 0; attempts < this.rpcEndpoints.length; attempts++) {
      this.currentIndex = (this.currentIndex + 1) % this.rpcEndpoints.length;
      const endpoint = this.rpcEndpoints[this.currentIndex];
      
      try {
        console.log(`🔄 Attempting failover to: ${endpoint}`);
        this.connection = new solanaWeb3.Connection(endpoint, "confirmed");
        
        // Quick health check
        await Promise.race([
          this.connection.getLatestBlockhash(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Failover timeout')), 5000)
          )
        ]);
        
        console.log(`✅ Failover successful to: ${endpoint}`);
        
        // Update health status
        this.healthStatus.set(endpoint, {
          healthy: true,
          lastCheck: Date.now(),
          failoverSuccess: true
        });
        
        return;
      } catch (err) {
        console.warn(`❌ Failover failed for ${endpoint}: ${err.message}`);
        this.healthStatus.set(endpoint, {
          healthy: false,
          lastCheck: Date.now(),
          error: err.message
        });
      }
    }
    
    // If all endpoints failed, throw error
    throw new Error('❌ All RPC endpoints unavailable during failover');
  }

  // Get health status for monitoring
  getHealthStatus() {
    return {
      currentEndpoint: this.rpcEndpoints[this.currentIndex],
      allEndpoints: Array.from(this.healthStatus.entries()),
      totalEndpoints: this.rpcEndpoints.length,
      healthyEndpoints: Array.from(this.healthStatus.values()).filter(s => s.healthy).length
    };
  }

  // Perform periodic health checks
  async performHealthCheck() {
    if (Date.now() - this.lastHealthCheck < this.healthCheckInterval) {
      return;
    }

    this.lastHealthCheck = Date.now();
    console.log('🏥 Performing RPC health check...');

    try {
      const start = Date.now();
      await this.connection.getLatestBlockhash();
      const latency = Date.now() - start;
      
      const currentEndpoint = this.rpcEndpoints[this.currentIndex];
      this.healthStatus.set(currentEndpoint, {
        healthy: true,
        lastCheck: Date.now(),
        latency: latency
      });
      
      console.log(`✅ Health check passed for ${currentEndpoint} (${latency}ms)`);
    } catch (err) {
      console.warn(`❌ Health check failed: ${err.message}`);
      // Attempt failover on health check failure
      await this.failover();
    }
  }
}

// Export for direct-token-creator-simple.html to use
window.RpcConnectionManager = RpcConnectionManager;