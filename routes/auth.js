import express from 'express';
import { body, validationResult } from 'express-validator';
import { 
  handleLogin, 
  handleLogout, 
  verifySession,
  verifyWallet 
} from '../middleware/auth.js';
import { saveUserRecord, getUserRecord } from '../services/databaseService.js';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// VALIDATION MIDDLEWARE
// ================================
const validateLogin = [
  body('walletAddress')
    .isLength({ min: 32, max: 44 })
    .withMessage('Invalid wallet address format'),
  body('signature')
    .isLength({ min: 64 })
    .withMessage('Invalid signature format'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be between 10 and 500 characters'),
  body('timestamp')
    .isNumeric()
    .withMessage('Timestamp must be a valid number')
];

// ================================
// AUTHENTICATION ENDPOINTS
// ================================

// Login endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { walletAddress } = req.body;

    // Handle login
    await handleLogin(req, res);

    // If login was successful, update or create user record
    if (res.statusCode === 200) {
      try {
        let user = await getUserRecord(walletAddress);
        
        if (user) {
          // Update existing user
          user.lastLogin = new Date().toISOString();
          user.loginCount = (user.loginCount || 0) + 1;
          await saveUserRecord(user);
        } else {
          // Create new user
          const newUser = {
            walletAddress,
            firstLogin: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            loginCount: 1,
            isActive: true,
            preferences: {
              theme: 'light',
              notifications: true,
              defaultImageProvider: 'openai'
            },
            stats: {
              tokensCreated: 0,
              imagesGenerated: 0,
              totalSpent: 0
            }
          };
          await saveUserRecord(newUser);
        }

        logger.info('User record updated after login', { 
          walletAddress: walletAddress.slice(0, 8) + '...' 
        });
      } catch (userError) {
        logger.warn('Failed to update user record after login', { 
          error: userError.message,
          walletAddress: walletAddress.slice(0, 8) + '...' 
        });
        // Don't fail the login because of user record issues
      }
    }

  } catch (error) {
    logger.error('Login endpoint error', { 
      error: error.message,
      walletAddress: req.body?.walletAddress?.slice(0, 8) + '...' 
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Authentication service error'
      });
    }
  }
});

// Logout endpoint
router.post('/logout', verifyWallet, handleLogout);

// Verify session endpoint
router.get('/verify', verifyWallet, verifySession);

// Get authentication challenge (for wallet signature)
router.post('/challenge', [
  body('walletAddress')
    .isLength({ min: 32, max: 44 })
    .withMessage('Invalid wallet address format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { walletAddress } = req.body;
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);

    // Create challenge message
    const message = `Sign this message to authenticate with SolMeme Creator\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}\n\nThis request will not trigger any blockchain transaction or cost any gas fees.`;

    logger.info('Authentication challenge generated', { 
      walletAddress: walletAddress.slice(0, 8) + '...',
      timestamp,
      nonce 
    });

    res.json({
      success: true,
      data: {
        message,
        timestamp,
        nonce,
        walletAddress
      },
      instructions: 'Sign this message with your wallet to authenticate. This will not cost any gas fees.'
    });

  } catch (error) {
    logger.error('Challenge generation failed', { 
      error: error.message,
      walletAddress: req.body?.walletAddress 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication challenge'
    });
  }
});

// Get user profile
router.get('/profile', verifyWallet, async (req, res) => {
  try {
    const { walletAddress } = req;

    const user = await getUserRecord(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Remove sensitive information
    const { ...profile } = user;
    delete profile.sessions;

    res.json({
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get user profile', { 
      error: error.message,
      walletAddress: req.walletAddress?.slice(0, 8) + '...' 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile'
    });
  }
});

// Update user preferences
router.put('/profile', verifyWallet, [
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be light or dark'),
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications must be boolean'),
  body('preferences.defaultImageProvider')
    .optional()
    .isIn(['openai', 'stability'])
    .withMessage('Image provider must be openai or stability')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { walletAddress } = req;
    const { preferences } = req.body;

    let user = await getUserRecord(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Update preferences
    user.preferences = {
      ...user.preferences,
      ...preferences
    };
    user.updatedAt = new Date().toISOString();

    await saveUserRecord(user);

    logger.info('User preferences updated', { 
      walletAddress: walletAddress.slice(0, 8) + '...',
      preferences 
    });

    res.json({
      success: true,
      data: user.preferences,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update user preferences', { 
      error: error.message,
      walletAddress: req.walletAddress?.slice(0, 8) + '...' 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences'
    });
  }
});

// Get user statistics
router.get('/stats', verifyWallet, async (req, res) => {
  try {
    const { walletAddress } = req;

    const user = await getUserRecord(walletAddress);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get additional stats from other services if needed
    const stats = {
      ...user.stats,
      walletAddress,
      memberSince: user.firstLogin || user.createdAt,
      lastActivity: user.lastLogin,
      loginCount: user.loginCount || 1
    };

    res.json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get user statistics', { 
      error: error.message,
      walletAddress: req.walletAddress?.slice(0, 8) + '...' 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics'
    });
  }
});

export default router;