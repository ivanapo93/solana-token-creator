import jwt from 'jsonwebtoken';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getSession, saveSession, deleteSession } from '../services/databaseService.js';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// WALLET SIGNATURE VERIFICATION
// ================================
export const verifyWalletSignature = (message, signature, publicKey) => {
  try {
    // Convert signature and message to Uint8Array
    const signatureUint8 = bs58.decode(signature);
    const messageUint8 = new TextEncoder().encode(message);
    const publicKeyUint8 = new PublicKey(publicKey).toBytes();

    // Verify signature
    return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
  } catch (error) {
    logger.error('Signature verification failed', { 
      error: error.message, 
      publicKey: publicKey?.slice(0, 8) + '...' 
    });
    return false;
  }
};

// ================================
// JWT TOKEN FUNCTIONS
// ================================
export const generateJWT = (payload, expiresIn = '24h') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return jwt.sign(payload, secret, {
    expiresIn,
    issuer: 'solmeme-creator',
    audience: 'solmeme-app'
  });
};

export const verifyJWT = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  try {
    return jwt.verify(token, secret, {
      issuer: 'solmeme-creator',
      audience: 'solmeme-app'
    });
  } catch (error) {
    logger.warn('JWT verification failed', { error: error.message });
    return null;
  }
};

// ================================
// AUTHENTICATION MIDDLEWARE
// ================================
export const verifyWallet = async (req, res, next) => {
  try {
    // Set CORS headers for authentication endpoints
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid format'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Check if session exists and is valid
    const session = await getSession(decoded.sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    // Add wallet information to request
    req.walletAddress = decoded.walletAddress;
    req.sessionId = decoded.sessionId;
    req.session = session;

    logger.info('Wallet authentication successful', { 
      requestId: req.id || 'unknown',
      walletAddress: decoded.walletAddress?.slice(0, 8) + '...',
      sessionId: decoded.sessionId 
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { 
      requestId: req.id || 'unknown',
      error: error.message,
      errorName: error.name,
      errorStack: error.stack,
      path: req.path,
      method: req.method,
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ? '[REDACTED]' : undefined
      }
    });

    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication. Please try again.',
      code: 'AUTH_ERROR',
      retryable: true
    });
  }
};

// ================================
// OPTIONAL AUTHENTICATION
// ================================
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyJWT(token);
      
      if (decoded) {
        const session = await getSession(decoded.sessionId);
        if (session) {
          req.walletAddress = decoded.walletAddress;
          req.sessionId = decoded.sessionId;
          req.session = session;
          req.authenticated = true;
        }
      }
    }

    req.authenticated = req.authenticated || false;
    next();
  } catch (error) {
    logger.warn('Optional auth error', { error: error.message });
    req.authenticated = false;
    next();
  }
};

// ================================
// LOGIN HANDLER
// ================================
export const handleLogin = async (req, res) => {
  try {
    const { walletAddress, signature, message, timestamp } = req.body;

    // Validate input
    if (!walletAddress || !signature || !message || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: walletAddress, signature, message, timestamp'
      });
    }

    // Validate wallet address format
    try {
      new PublicKey(walletAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    // Check timestamp (message should be recent, within 5 minutes)
    const messageTime = new Date(parseInt(timestamp));
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - messageTime.getTime());
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return res.status(400).json({
        success: false,
        error: 'Message timestamp is too old. Please try again.'
      });
    }

    // Verify signature
    const isValidSignature = verifyWalletSignature(message, signature, walletAddress);
    if (!isValidSignature) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Create session
    const sessionId = uuidv4();
    const sessionData = {
      id: sessionId,
      walletAddress,
      message,
      signature,
      timestamp,
      loginAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    await saveSession(sessionData);

    // Generate JWT
    const jwtToken = generateJWT({
      sessionId,
      walletAddress,
      loginAt: sessionData.loginAt
    });

    logger.info('User login successful', { 
      walletAddress: walletAddress.slice(0, 8) + '...',
      sessionId 
    });

    res.json({
      success: true,
      data: {
        token: jwtToken,
        sessionId,
        walletAddress,
        expiresIn: '24h',
        loginAt: sessionData.loginAt
      },
      message: 'Login successful'
    });

  } catch (error) {
    logger.error('Login failed', { 
      error: error.message, 
      walletAddress: req.body?.walletAddress?.slice(0, 8) + '...' 
    });

    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

// ================================
// LOGOUT HANDLER
// ================================
export const handleLogout = async (req, res) => {
  try {
    const { sessionId } = req;

    if (sessionId) {
      await deleteSession(sessionId);
      logger.info('User logout successful', { sessionId });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout failed', { 
      error: error.message, 
      sessionId: req.sessionId 
    });

    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

// ================================
// SESSION VERIFICATION
// ================================
export const verifySession = async (req, res) => {
  try {
    const { sessionId, walletAddress } = req;

    res.json({
      success: true,
      data: {
        sessionId,
        walletAddress,
        authenticated: true,
        session: req.session
      },
      message: 'Session is valid'
    });

  } catch (error) {
    logger.error('Session verification failed', { 
      error: error.message, 
      sessionId: req.sessionId 
    });

    res.status(500).json({
      success: false,
      error: 'Session verification failed'
    });
  }
};

// ================================
// RATE LIMITING BY WALLET
// ================================
const walletRateLimits = new Map();

export const walletRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    if (!req.walletAddress) {
      return next(); // Skip if not authenticated
    }

    const now = Date.now();
    const windowStart = now - windowMs;
    const wallet = req.walletAddress;

    // Get or create rate limit data for this wallet
    if (!walletRateLimits.has(wallet)) {
      walletRateLimits.set(wallet, []);
    }

    const requests = walletRateLimits.get(wallet);
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      logger.warn('Wallet rate limit exceeded', { 
        wallet: wallet.slice(0, 8) + '...',
        requests: recentRequests.length,
        maxRequests 
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for this wallet',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    recentRequests.push(now);
    walletRateLimits.set(wallet, recentRequests);

    next();
  };
};

// ================================
// PERMISSION CHECKS
// ================================
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.session || !req.session.roles || !req.session.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Role '${role}' required.`
      });
    }
    next();
  };
};

export const requireOwnership = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);
      
      if (ownerId !== req.walletAddress) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own resources.'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Ownership check failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Access control error'
      });
    }
  };
};