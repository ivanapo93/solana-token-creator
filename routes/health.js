import express from 'express';
import { getNetworkHealth } from '../services/solanaService.js';
import { getStorageStatus } from '../services/storageService.js';
import { getAnalytics } from '../services/databaseService.js';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// BASIC HEALTH CHECK
// ================================
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();

    // Basic health indicators
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: 0
    };

    // Calculate response time
    health.responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: health,
      message: 'Service is healthy'
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });

    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      error: 'Service health check failed'
    });
  }
});

// ================================
// DETAILED HEALTH CHECK
// ================================
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();

    // Run all health checks concurrently
    const [networkHealth, storageStatus] = await Promise.allSettled([
      getNetworkHealth(),
      getStorageStatus()
    ]);

    // Process results
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Date.now() - startTime,
      services: {
        solana: {
          status: networkHealth.status === 'fulfilled' && networkHealth.value?.healthy ? 'healthy' : 'unhealthy',
          data: networkHealth.status === 'fulfilled' ? networkHealth.value : null,
          error: networkHealth.status === 'rejected' ? networkHealth.reason?.message : null
        },
        storage: {
          status: storageStatus.status === 'fulfilled' ? 'healthy' : 'unhealthy',
          data: storageStatus.status === 'fulfilled' ? storageStatus.value : null,
          error: storageStatus.status === 'rejected' ? storageStatus.reason?.message : null
        },
        database: {
          status: 'healthy', // File-based database is always available
          data: {
            type: 'file-based',
            available: true
          }
        }
      },
      dependencies: {
        openai: {
          configured: !!process.env.OPENAI_API_KEY,
          status: process.env.OPENAI_API_KEY ? 'configured' : 'not-configured'
        },
        stability: {
          configured: !!process.env.STABILITY_API_KEY,
          status: process.env.STABILITY_API_KEY ? 'configured' : 'not-configured'
        },
        arweave: {
          configured: !!process.env.ARWEAVE_WALLET,
          status: process.env.ARWEAVE_WALLET ? 'configured' : 'not-configured'
        },
        ipfs: {
          configured: !!(process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET),
          status: process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET ? 'configured' : 'not-configured'
        }
      }
    };

    // Determine overall status
    const unhealthyServices = Object.values(health.services).filter(service => service.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health,
      message: `Service is ${health.status}`
    });

  } catch (error) {
    logger.error('Detailed health check failed', { error: error.message });

    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      error: 'Detailed health check failed'
    });
  }
});

// ================================
// READINESS CHECK
// ================================
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const checks = {
      solana_rpc: !!process.env.SOLANA_RPC_URL,
      solana_wallet: !!process.env.SOLANA_PRIVATE_KEY,
      jwt_secret: !!process.env.JWT_SECRET,
      ai_service: !!(process.env.OPENAI_API_KEY || process.env.STABILITY_API_KEY),
      storage_service: !!(process.env.ARWEAVE_WALLET || (process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET))
    };

    const allReady = Object.values(checks).every(check => check === true);

    const readiness = {
      ready: allReady,
      timestamp: new Date().toISOString(),
      checks
    };

    const statusCode = allReady ? 200 : 503;

    res.status(statusCode).json({
      success: allReady,
      data: readiness,
      message: allReady ? 'Service is ready' : 'Service is not ready'
    });

  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });

    res.status(503).json({
      success: false,
      data: {
        ready: false,
        timestamp: new Date().toISOString(),
        error: error.message
      },
      error: 'Readiness check failed'
    });
  }
});

// ================================
// LIVENESS CHECK
// ================================
router.get('/live', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    success: true,
    data: {
      alive: true,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime()
    },
    message: 'Service is alive'
  });
});

// ================================
// METRICS ENDPOINT
// ================================
router.get('/metrics', async (req, res) => {
  try {
    // Get system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get application analytics
    let analytics = null;
    try {
      analytics = await getAnalytics();
    } catch (analyticsError) {
      logger.warn('Failed to get analytics for metrics', { error: analyticsError.message });
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      application: analytics ? {
        totalTokens: analytics.totals.tokens,
        totalUsers: analytics.totals.users,
        successfulTokens: analytics.totals.successfulTokens,
        failedTokens: analytics.totals.failedTokens,
        tokens24h: analytics.recent.tokens24h,
        tokens7d: analytics.recent.tokens7d,
        tokens30d: analytics.recent.tokens30d
      } : null
    };

    res.json({
      success: true,
      data: metrics,
      message: 'Metrics retrieved successfully'
    });

  } catch (error) {
    logger.error('Metrics retrieval failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

// ================================
// DEPENDENCIES STATUS
// ================================
router.get('/dependencies', async (req, res) => {
  try {
    const dependencies = {
      timestamp: new Date().toISOString(),
      services: {
        solana: {
          configured: !!(process.env.SOLANA_RPC_URL && process.env.SOLANA_PRIVATE_KEY),
          rpcUrl: process.env.SOLANA_RPC_URL ? 'configured' : 'not-configured',
          wallet: process.env.SOLANA_PRIVATE_KEY ? 'configured' : 'not-configured'
        },
        ai: {
          openai: {
            configured: !!process.env.OPENAI_API_KEY,
            status: process.env.OPENAI_API_KEY ? 'ready' : 'not-configured'
          },
          stability: {
            configured: !!process.env.STABILITY_API_KEY,
            status: process.env.STABILITY_API_KEY ? 'ready' : 'not-configured'
          }
        },
        storage: {
          arweave: {
            configured: !!process.env.ARWEAVE_WALLET,
            status: process.env.ARWEAVE_WALLET ? 'ready' : 'not-configured'
          },
          ipfs: {
            configured: !!(process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET),
            status: process.env.IPFS_PROJECT_ID && process.env.IPFS_PROJECT_SECRET ? 'ready' : 'not-configured'
          }
        },
        auth: {
          jwt: {
            configured: !!process.env.JWT_SECRET,
            status: process.env.JWT_SECRET ? 'ready' : 'not-configured'
          }
        }
      }
    };

    // Count configured services
    const totalServices = 7; // Total number of services
    const configuredServices = [
      dependencies.services.solana.configured,
      dependencies.services.ai.openai.configured,
      dependencies.services.ai.stability.configured,
      dependencies.services.storage.arweave.configured,
      dependencies.services.storage.ipfs.configured,
      dependencies.services.auth.jwt.configured
    ].filter(Boolean).length;

    dependencies.summary = {
      totalServices,
      configuredServices,
      readiness: configuredServices >= 4 ? 'ready' : 'partial', // Need at least 4 core services
      missingServices: totalServices - configuredServices
    };

    res.json({
      success: true,
      data: dependencies,
      message: 'Dependencies status retrieved successfully'
    });

  } catch (error) {
    logger.error('Dependencies check failed', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Failed to check dependencies',
      details: error.message
    });
  }
});

export default router;