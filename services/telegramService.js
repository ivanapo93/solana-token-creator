/**
 * Enhanced Telegram Notification Service
 * Features: Token notifications, welcome messages, daily summaries
 */

import fetch from 'node-fetch';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'telegram-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class TelegramNotificationService {
  constructor(config = {}) {
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.groupChatId = config.groupChatId || process.env.TELEGRAM_GROUP_CHAT_ID;
    this.channelChatId = config.channelChatId || process.env.TELEGRAM_CHANNEL_CHAT_ID;
    this.websiteUrl = config.websiteUrl || process.env.WEBSITE_URL || 'https://yourdomain.com';
    this.apiBaseUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    // Daily summary settings
    this.dailySummaryTime = config.dailySummaryTime || process.env.DAILY_SUMMARY_TIME || '23:59';
    
    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate the configuration
   * @throws {Error} If configuration is invalid
   */
  validateConfig() {
    if (!this.botToken) {
      throw new Error('Telegram Bot Token is required');
    }
    
    if (!this.groupChatId && !this.channelChatId) {
      throw new Error('At least one Chat ID (group or channel) is required');
    }
  }

  /**
   * Format message for new token creation
   * @param {Object} tokenData - Token data
   * @returns {string} Formatted message
   */
  formatTokenCreationMessage(tokenData) {
    if (!tokenData || !tokenData.name || !tokenData.symbol || !tokenData.mintAddress) {
      throw new Error('Invalid token data for message formatting');
    }
    
    const promoWebsiteText = tokenData.promoWebsiteUrl 
      ? `🌐 Website: ${tokenData.promoWebsiteUrl}` 
      : '';
    
    const feeText = tokenData.transactionFeePercentage 
      ? `💰 Transaction Fee: ${tokenData.transactionFeePercentage}%`
      : '';
    
    return `🎉 New Token Created!
Name: ${tokenData.name}
Symbol: ${tokenData.symbol}
Contract: \`${tokenData.mintAddress}\`
${feeText}
${promoWebsiteText}
Join our community for updates and trading!`;
  }

  /**
   * Format welcome message for new group members
   * @param {string} userFirstName - New member's first name
   * @returns {string} Formatted welcome message
   */
  formatWelcomeMessage(userFirstName) {
    return `👋 Welcome, ${userFirstName}! Thanks for joining SolMemeCreator Community. You can create your own Solana meme tokens here: ${this.websiteUrl}. Let us know if you need help!`;
  }

  /**
   * Format daily summary message
   * @param {Array} tokensCreated - List of tokens created in the last 24 hours
   * @returns {string} Formatted daily summary
   */
  formatDailySummary(tokensCreated) {
    if (!tokensCreated || tokensCreated.length === 0) {
      return `📊 Daily Recap - ${new Date().toDateString()}:
No new tokens were created today.
Visit our platform to launch your own token: ${this.websiteUrl}`;
    }

    let summaryText = `📊 Daily Recap - ${new Date().toDateString()}:\n`;
    
    tokensCreated.forEach((token, index) => {
      const tokenNumber = index + 1;
      summaryText += `- Token ${tokenNumber}: $${token.symbol} (${token.name})\n`;
      summaryText += `  Contract: \`${token.mintAddress}\`\n`;
      if (token.transactionFeePercentage) {
        summaryText += `  Fee: ${token.transactionFeePercentage}%\n`;
      }
      if (token.promoWebsiteUrl) {
        summaryText += `  Website: ${token.promoWebsiteUrl}\n`;
      }
    });
    
    summaryText += `\nTotal tokens created: ${tokensCreated.length}\n`;
    summaryText += `Visit our platform to launch your own token: ${this.websiteUrl}`;
    
    return summaryText;
  }

  /**
   * Send message to Telegram chat
   * @param {string} chatId - Telegram chat ID
   * @param {string} message - Message to send
   * @param {Object} options - Additional options (parse_mode, etc.)
   * @returns {Promise<Object>} Response from Telegram API
   */
  async sendMessage(chatId, message, options = {}) {
    try {
      const url = `${this.apiBaseUrl}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: options.parse_mode || 'Markdown',
          ...options
        })
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Telegram API error: ${result.description}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Failed to send Telegram message to ${chatId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Set webhook for receiving updates
   * @param {string} webhookUrl - URL to receive webhooks
   * @returns {Promise<Object>} Webhook setup result
   */
  async setWebhook(webhookUrl) {
    try {
      const url = `${this.apiBaseUrl}/setWebhook`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'chat_member']
        })
      });
      
      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(`Failed to set webhook: ${result.description}`);
      }
      
      logger.info('Telegram webhook set successfully', { webhookUrl });
      return result;
    } catch (error) {
      logger.error('Failed to set Telegram webhook', { error: error.message, webhookUrl });
      throw error;
    }
  }

  /**
   * Process webhook update from Telegram
   * @param {Object} update - Telegram update object
   * @returns {Promise<Object>} Processing result
   */
  async processWebhookUpdate(update) {
    try {
      // Handle new chat members
      if (update.chat_member && update.chat_member.new_chat_member) {
        const newMember = update.chat_member.new_chat_member;
        const chat = update.chat_member.chat;
        
        // Check if user joined the group (not bot or channel)
        if (newMember.status === 'member' && !newMember.user.is_bot && chat.id == this.groupChatId) {
          return await this.sendWelcomeMessage(chat.id, newMember.user.first_name);
        }
      }
      
      // Handle regular messages (if needed in future)
      if (update.message) {
        logger.info('Received message update', { 
          chatId: update.message.chat.id,
          messageId: update.message.message_id 
        });
      }
      
      return { success: true, processed: false, reason: 'No action required' };
    } catch (error) {
      logger.error('Error processing webhook update', { error: error.message, update });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send welcome message to new group member
   * @param {string} chatId - Chat ID where user joined
   * @param {string} userFirstName - New member's first name
   * @returns {Promise<Object>} Welcome message result
   */
  async sendWelcomeMessage(chatId, userFirstName) {
    try {
      const welcomeMessage = this.formatWelcomeMessage(userFirstName);
      const result = await this.sendMessage(chatId, welcomeMessage);
      
      logger.info('Welcome message sent successfully', { 
        chatId, 
        userFirstName,
        messageId: result.result.message_id 
      });
      
      return {
        success: true,
        chatId,
        userFirstName,
        messageId: result.result.message_id
      };
    } catch (error) {
      logger.error('Failed to send welcome message', { 
        error: error.message, 
        chatId, 
        userFirstName 
      });
      
      return {
        success: false,
        chatId,
        userFirstName,
        error: error.message
      };
    }
  }

  /**
   * Send daily summary to channel
   * @param {Array} tokensCreated - Tokens created in last 24 hours
   * @returns {Promise<Object>} Daily summary result
   */
  async sendDailySummary(tokensCreated = []) {
    try {
      if (!this.channelChatId) {
        throw new Error('Channel chat ID not configured for daily summaries');
      }
      
      const summaryMessage = this.formatDailySummary(tokensCreated);
      const result = await this.sendMessage(this.channelChatId, summaryMessage);
      
      logger.info('Daily summary sent successfully', { 
        channelId: this.channelChatId,
        tokenCount: tokensCreated.length,
        messageId: result.result.message_id 
      });
      
      return {
        success: true,
        channelId: this.channelChatId,
        tokenCount: tokensCreated.length,
        messageId: result.result.message_id
      };
    } catch (error) {
      logger.error('Failed to send daily summary', { 
        error: error.message, 
        tokenCount: tokensCreated.length 
      });
      
      return {
        success: false,
        error: error.message,
        tokenCount: tokensCreated.length
      };
    }
  }

  /**
   * Get tokens created in the last 24 hours
   * @returns {Promise<Array>} List of tokens created in last 24 hours
   */
  async getTokensCreatedToday() {
    try {
      // Calculate 24 hours ago timestamp
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Try to read from token records file (fallback to empty array)
      const recordPath = './promo-deployments.json';
      let records = [];
      
      try {
        const data = await fs.readFile(recordPath, 'utf-8');
        records = JSON.parse(data);
      } catch (error) {
        logger.warn('No token records found for daily summary', { error: error.message });
        return [];
      }
      
      // Filter tokens created in last 24 hours
      const recentTokens = records.filter(record => {
        const createdAt = new Date(record.created_at);
        return createdAt >= twentyFourHoursAgo;
      });
      
      logger.info(`Found ${recentTokens.length} tokens created in last 24 hours`);
      return recentTokens;
    } catch (error) {
      logger.error('Error retrieving tokens for daily summary', { error: error.message });
      return [];
    }
  }

  /**
   * Notify about new token creation
   * @param {Object} tokenData - Token data
   * @returns {Promise<Object>} Notification results
   */
  async notifyTokenCreation(tokenData) {
    try {
      logger.info(`Sending token creation notification for ${tokenData.name} (${tokenData.symbol})`);
      
      const message = this.formatTokenCreationMessage(tokenData);
      const results = { success: true, targets: [] };
      
      // Send to group chat
      if (this.groupChatId) {
        try {
          const groupResult = await this.sendMessage(this.groupChatId, message);
          results.targets.push({
            type: 'group',
            chatId: this.groupChatId,
            messageId: groupResult.result.message_id,
            success: true
          });
          logger.info(`Successfully sent notification to group ${this.groupChatId}`);
        } catch (groupError) {
          results.targets.push({
            type: 'group',
            chatId: this.groupChatId,
            success: false,
            error: groupError.message
          });
          logger.error(`Failed to send notification to group ${this.groupChatId}`, { error: groupError.message });
        }
      }
      
      // Send to channel
      if (this.channelChatId) {
        try {
          const channelResult = await this.sendMessage(this.channelChatId, message);
          results.targets.push({
            type: 'channel',
            chatId: this.channelChatId,
            messageId: channelResult.result.message_id,
            success: true
          });
          logger.info(`Successfully sent notification to channel ${this.channelChatId}`);
        } catch (channelError) {
          results.targets.push({
            type: 'channel',
            chatId: this.channelChatId,
            success: false,
            error: channelError.message
          });
          logger.error(`Failed to send notification to channel ${this.channelChatId}`, { error: channelError.message });
        }
      }
      
      // Update overall success status
      const anySuccess = results.targets.some(target => target.success);
      results.success = anySuccess;
      
      return results;
    } catch (error) {
      logger.error(`Token creation notification failed`, { 
        error: error.message,
        token: `${tokenData.name} (${tokenData.symbol})`
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a test notification
   * @returns {Promise<Object>} Test results
   */
  async sendTestNotification() {
    const testToken = {
      name: "Test Token",
      symbol: "TEST",
      mintAddress: "TESTADDRESS123456789ABCDEFGHIJKLMNOPQRST",
      promoWebsiteUrl: "https://example.com/test-token"
    };
    
    return await this.notifyTokenCreation(testToken);
  }

  /**
   * Send test welcome message
   * @returns {Promise<Object>} Test results
   */
  async sendTestWelcomeMessage() {
    if (!this.groupChatId) {
      return { success: false, error: 'Group chat ID not configured' };
    }
    
    return await this.sendWelcomeMessage(this.groupChatId, 'TestUser');
  }

  /**
   * Send test daily summary
   * @returns {Promise<Object>} Test results
   */
  async sendTestDailySummary() {
    const testTokens = [
      {
        name: "Test Token 1",
        symbol: "TEST1",
        mintAddress: "TEST1ADDRESS123456789ABCDEFGHIJKLMNOP",
        promoWebsiteUrl: "https://example.com/test-token-1"
      },
      {
        name: "Test Token 2", 
        symbol: "TEST2",
        mintAddress: "TEST2ADDRESS123456789ABCDEFGHIJKLMNOP"
      }
    ];
    
    return await this.sendDailySummary(testTokens);
  }

  /**
   * Check if service is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return Boolean(this.botToken && (this.groupChatId || this.channelChatId));
  }

  /**
   * Get service configuration info
   * @returns {Object} Configuration details
   */
  getConfigInfo() {
    return {
      hasToken: Boolean(this.botToken),
      hasGroupChat: Boolean(this.groupChatId),
      hasChannelChat: Boolean(this.channelChatId),
      websiteUrl: this.websiteUrl,
      dailySummaryTime: this.dailySummaryTime,
      isFullyConfigured: this.isConfigured()
    };
  }
}

// Create singleton instance
let instance = null;

/**
 * Initialize the Telegram notification service
 * @param {Object} config - Service configuration
 * @returns {TelegramNotificationService} Service instance
 */
export const initTelegramService = (config = {}) => {
  if (!instance) {
    instance = new TelegramNotificationService(config);
    logger.info('Enhanced Telegram notification service initialized');
  }
  return instance;
};

/**
 * Get the Telegram notification service instance
 * @returns {TelegramNotificationService|null} Service instance or null if not initialized
 */
export const getTelegramService = () => {
  return instance;
};

export default {
  initTelegramService,
  getTelegramService
};