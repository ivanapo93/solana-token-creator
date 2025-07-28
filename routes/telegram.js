/**
 * Telegram Webhook Routes
 * Handles incoming webhook updates from Telegram Bot API
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import { getTelegramService } from '../services/telegramService.js';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// WEBHOOK ENDPOINT
// ================================

/**
 * Telegram Bot Webhook Endpoint
 * Receives updates from Telegram including new members, messages, etc.
 */
router.post('/webhook', [
  body('update_id').isNumeric().withMessage('Invalid update_id'),
  body('message').optional().isObject(),
  body('chat_member').optional().isObject()
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Invalid webhook request received', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook data',
        details: errors.array()
      });
    }

    const update = req.body;
    
    // Get Telegram service instance
    const telegramService = getTelegramService();
    if (!telegramService) {
      logger.error('Telegram service not initialized');
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    // Process the webhook update
    const result = await telegramService.processWebhookUpdate(update);
    
    if (result.success) {
      logger.info('Webhook update processed successfully', { 
        updateId: update.update_id,
        processed: result.processed,
        reason: result.reason 
      });
    } else {
      logger.error('Failed to process webhook update', { 
        updateId: update.update_id,
        error: result.error 
      });
    }

    // Always return 200 OK to Telegram to avoid retries
    res.status(200).json({
      success: true,
      processed: result.processed || false
    });

  } catch (error) {
    logger.error('Webhook processing error', { 
      error: error.message,
      stack: error.stack,
      body: req.body 
    });

    // Return 200 to prevent Telegram retries
    res.status(200).json({
      success: false,
      error: 'Internal processing error'
    });
  }
});

// ================================
// WEBHOOK MANAGEMENT ENDPOINTS
// ================================

/**
 * Set webhook URL
 * POST /api/telegram/webhook/set
 */
router.post('/webhook/set', [
  body('url').isURL().withMessage('Valid webhook URL is required')
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

    const { url } = req.body;
    
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    const result = await telegramService.setWebhook(url);
    
    res.json({
      success: true,
      data: result,
      message: 'Webhook URL set successfully'
    });

  } catch (error) {
    logger.error('Failed to set webhook', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to set webhook URL'
    });
  }
});

/**
 * Get webhook info
 * GET /api/telegram/webhook/info
 */
router.get('/webhook/info', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    // Get webhook info from Telegram API
    const response = await fetch(`${telegramService.apiBaseUrl}/getWebhookInfo`);
    const webhookInfo = await response.json();
    
    if (!webhookInfo.ok) {
      throw new Error(`Telegram API error: ${webhookInfo.description}`);
    }

    res.json({
      success: true,
      data: webhookInfo.result,
      serviceConfig: telegramService.getConfigInfo()
    });

  } catch (error) {
    logger.error('Failed to get webhook info', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook information'
    });
  }
});

// ================================
// TESTING ENDPOINTS
// ================================

/**
 * Send test welcome message
 * POST /api/telegram/test/welcome
 */
router.post('/test/welcome', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    const result = await telegramService.sendTestWelcomeMessage();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test welcome message sent' : 'Failed to send test welcome message'
    });

  } catch (error) {
    logger.error('Failed to send test welcome message', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to send test welcome message'
    });
  }
});

/**
 * Send test daily summary
 * POST /api/telegram/test/daily-summary
 */
router.post('/test/daily-summary', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    const result = await telegramService.sendTestDailySummary();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test daily summary sent' : 'Failed to send test daily summary'
    });

  } catch (error) {
    logger.error('Failed to send test daily summary', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to send test daily summary'
    });
  }
});

/**
 * Send test token notification
 * POST /api/telegram/test/token-notification
 */
router.post('/test/token-notification', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    const result = await telegramService.sendTestNotification();
    
    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Test token notification sent' : 'Failed to send test notification'
    });

  } catch (error) {
    logger.error('Failed to send test token notification', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to send test token notification'
    });
  }
});

/**
 * Trigger manual daily summary
 * POST /api/telegram/daily-summary/trigger
 */
router.post('/daily-summary/trigger', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    if (!telegramService) {
      return res.status(500).json({
        success: false,
        error: 'Telegram service not available'
      });
    }

    // Get tokens created today
    const tokensCreated = await telegramService.getTokensCreatedToday();
    
    // Send daily summary
    const result = await telegramService.sendDailySummary(tokensCreated);
    
    res.json({
      success: result.success,
      data: {
        ...result,
        tokensFound: tokensCreated.length,
        tokens: tokensCreated
      },
      message: result.success 
        ? `Daily summary sent with ${tokensCreated.length} tokens` 
        : 'Failed to send daily summary'
    });

  } catch (error) {
    logger.error('Failed to trigger daily summary', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to trigger daily summary'
    });
  }
});

/**
 * Get service status
 * GET /api/telegram/status
 */
router.get('/status', async (req, res) => {
  try {
    const telegramService = getTelegramService();
    
    if (!telegramService) {
      return res.json({
        success: false,
        configured: false,
        error: 'Telegram service not initialized'
      });
    }

    const configInfo = telegramService.getConfigInfo();
    
    res.json({
      success: true,
      configured: configInfo.isFullyConfigured,
      data: configInfo
    });

  } catch (error) {
    logger.error('Failed to get Telegram service status', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service status'
    });
  }
});

export default router;