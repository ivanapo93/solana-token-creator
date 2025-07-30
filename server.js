import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import cron from 'node-cron';

// Import routes
import tokenRoutes from './routes/tokens.js';
import imageRoutes from './routes/images.js';
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import telegramRoutes from './routes/telegram.js';

// Import services
import { initTelegramService, getTelegramService } from './services/telegramService.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ================================
// LOGGING CONFIGURATION
// ================================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'solmeme-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// ================================
// SECURITY MIDDLEWARE
// ================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit token creation to 10 per hour
  message: {
    error: 'Token creation rate limit exceeded. Please try again later.',
    retryAfter: '1 hour'
  }
});

app.use('/api/', limiter);
app.use('/api/tokens/create', strictLimiter);

// ================================
// CORS CONFIGURATION
// ================================
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://solana-token-creatorivan.netlify.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ================================
// MIDDLEWARE
// ================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ================================
// API ROUTES
// ================================
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/telegram', telegramRoutes);

if (process.env.NODE_ENV === 'production') {
  // Serve frontend
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'SolMeme Creator API',
    version: '1.0.0',
    description: 'Production API for Solana token creation with AI image generation and Telegram notifications',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        login: 'POST /api/auth/login',
        verify: 'POST /api/auth/verify'
      },
      tokens: {
        create: 'POST /api/tokens/create',
        list: 'GET /api/tokens',
        get: 'GET /api/tokens/:id',
        metadata: 'GET /api/tokens/:id/metadata'
      },
      images: {
        generate: 'POST /api/images/generate',
        upload: 'POST /api/images/upload'
      },
      telegram: {
        webhook: 'POST /api/telegram/webhook',
        status: 'GET /api/telegram/status',
        test: {
          welcome: 'POST /api/telegram/test/welcome',
          dailySummary: 'POST /api/telegram/test/daily-summary',
          tokenNotification: 'POST /api/telegram/test/token-notification'
        }
      }
    },
    documentation: 'https://github.com/yourusername/solmeme-creator#api-documentation'
  });
});

// ================================
// ERROR HANDLING
// ================================
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// ================================
// INITIALIZE SERVICES
// ================================

// Initialize Telegram notification service
try {
  const telegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID,
    channelChatId: process.env.TELEGRAM_CHANNEL_CHAT_ID,
    websiteUrl: process.env.WEBSITE_URL,
    dailySummaryTime: process.env.DAILY_SUMMARY_TIME
  };
  
  const telegramService = initTelegramService(telegramConfig);
  
  if (telegramService.isConfigured()) {
    logger.info('Telegram notification service initialized successfully');
    
    // Send test notification during development
    if (process.env.NODE_ENV === 'development' && process.env.TELEGRAM_SEND_TEST === 'true') {
      telegramService.sendTestNotification()
        .then(result => logger.info('Test notification sent', { result }))
        .catch(error => logger.error('Test notification failed', { error: error.message }));
    }
  } else {
    logger.warn('Telegram notification service not fully configured');
  }
} catch (error) {
  logger.error('Failed to initialize Telegram notification service', { error: error.message });
}

// ================================
// SCHEDULED TASKS (CRON JOBS)
// ================================

/**
 * Daily Summary Cron Job
 * Runs every day at the configured time (default 23:59 UTC)
 */
const dailySummaryTime = process.env.DAILY_SUMMARY_TIME || '23:59';
const [hour, minute] = dailySummaryTime.split(':').map(num => parseInt(num));

// Validate time format
if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
  logger.error('Invalid DAILY_SUMMARY_TIME format. Using default 23:59', { 
    configuredTime: dailySummaryTime 
  });
  // Use default values
  const defaultHour = 23;
  const defaultMinute = 59;
  
  // Schedule daily summary job
  cron.schedule(`${defaultMinute} ${defaultHour} * * *`, async () => {
    try {
      logger.info('Starting scheduled daily summary job');
      
      const telegramService = getTelegramService();
      if (!telegramService) {
        logger.warn('Telegram service not available for daily summary');
        return;
      }
      
      // Get tokens created in the last 24 hours
      const tokensCreated = await telegramService.getTokensCreatedToday();
      
      // Send daily summary
      const result = await telegramService.sendDailySummary(tokensCreated);
      
      if (result.success) {
        logger.info('Daily summary sent successfully', { 
          tokenCount: tokensCreated.length,
          messageId: result.messageId 
        });
      } else {
        logger.error('Failed to send daily summary', { 
          error: result.error,
          tokenCount: tokensCreated.length 
        });
      }
      
    } catch (error) {
      logger.error('Daily summary cron job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC'
  });
  
  logger.info('Daily summary cron job scheduled', { time: '23:59 UTC' });
} else {
  // Use configured time
  cron.schedule(`${minute} ${hour} * * *`, async () => {
    try {
      logger.info('Starting scheduled daily summary job');
      
      const telegramService = getTelegramService();
      if (!telegramService) {
        logger.warn('Telegram service not available for daily summary');
        return;
      }
      
      // Get tokens created in the last 24 hours
      const tokensCreated = await telegramService.getTokensCreatedToday();
      
      // Send daily summary
      const result = await telegramService.sendDailySummary(tokensCreated);
      
      if (result.success) {
        logger.info('Daily summary sent successfully', { 
          tokenCount: tokensCreated.length,
          messageId: result.messageId 
        });
      } else {
        logger.error('Failed to send daily summary', { 
          error: result.error,
          tokenCount: tokensCreated.length 
        });
      }
      
    } catch (error) {
      logger.error('Daily summary cron job failed', { error: error.message });
    }
  }, {
    timezone: 'UTC'
  });
  
  logger.info('Daily summary cron job scheduled', { time: `${dailySummaryTime} UTC` });
}

// ================================
// SERVER STARTUP
// ================================
const server = app.listen(PORT, () => {
  logger.info(`🚀 SolMeme Creator Backend running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 API Documentation: http://localhost:${PORT}/api`);
  
  // Validate environment variables
  const requiredEnvVars = [
    'SOLANA_RPC_URL',
    'SOLANA_PRIVATE_KEY',
    'OPENAI_API_KEY',
    'ARWEAVE_WALLET',
    'JWT_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
    logger.warn('Some features may not work correctly.');
  }
  
  // Check Telegram-specific environment variables
  const telegramVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_GROUP_CHAT_ID', 'TELEGRAM_CHANNEL_CHAT_ID'];
  const missingTelegramVars = telegramVars.filter(varName => !process.env[varName]);
  
  if (missingTelegramVars.length > 0) {
    logger.warn(`⚠️ Missing Telegram environment variables: ${missingTelegramVars.join(', ')}`);
    logger.warn('Telegram notifications may not work correctly.');
  } else {
    logger.info('✅ All Telegram environment variables configured');
  }
  
  // Log scheduled job status
  logger.info(`⏰ Daily summary scheduled for ${dailySummaryTime} UTC`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;