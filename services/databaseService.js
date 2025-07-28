import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import NodeCache from 'node-cache';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// FILE-BASED DATABASE SERVICE
// ================================
class DatabaseService {
  constructor() {
    this.dataDir = './data';
    this.tokensFile = path.join(this.dataDir, 'tokens.json');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    
    // In-memory cache for performance
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes
      checkperiod: 120 // 2 minutes
    });
    
    this.initialize();
  }

  async initialize() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(this.dataDir);
      
      // Initialize data files if they don't exist
      const files = [
        { path: this.tokensFile, defaultData: [] },
        { path: this.usersFile, defaultData: [] },
        { path: this.sessionsFile, defaultData: [] }
      ];

      for (const file of files) {
        if (!await fs.pathExists(file.path)) {
          await fs.writeJson(file.path, file.defaultData, { spaces: 2 });
          logger.info('Created data file', { path: file.path });
        }
      }

      logger.info('Database service initialized', { dataDir: this.dataDir });
    } catch (error) {
      logger.error('Failed to initialize database', { error: error.message });
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }

  // ================================
  // TOKEN OPERATIONS
  // ================================
  async saveTokenRecord(tokenData) {
    try {
      const tokens = await this.loadTokens();
      
      // Add timestamp if not present
      if (!tokenData.createdAt) {
        tokenData.createdAt = new Date().toISOString();
      }
      
      // Check if token already exists
      const existingIndex = tokens.findIndex(t => t.id === tokenData.id);
      if (existingIndex >= 0) {
        // Update existing token
        tokens[existingIndex] = { ...tokens[existingIndex], ...tokenData };
      } else {
        // Add new token
        tokens.push(tokenData);
      }

      await fs.writeJson(this.tokensFile, tokens, { spaces: 2 });
      
      // Update cache
      this.cache.set(`token:${tokenData.id}`, tokenData);
      this.cache.del('tokens:all'); // Invalidate full list cache

      logger.info('Token record saved', { 
        tokenId: tokenData.id, 
        creator: tokenData.creator?.slice(0, 8) + '...' 
      });

      return tokenData;
    } catch (error) {
      logger.error('Failed to save token record', { 
        error: error.message, 
        tokenId: tokenData.id 
      });
      throw new Error(`Failed to save token record: ${error.message}`);
    }
  }

  async getTokenRecord(tokenId) {
    try {
      // Check cache first
      const cached = this.cache.get(`token:${tokenId}`);
      if (cached) {
        return cached;
      }

      const tokens = await this.loadTokens();
      const token = tokens.find(t => t.id === tokenId);
      
      if (token) {
        // Cache the result
        this.cache.set(`token:${tokenId}`, token);
      }

      return token || null;
    } catch (error) {
      logger.error('Failed to get token record', { 
        error: error.message, 
        tokenId 
      });
      throw new Error(`Failed to get token record: ${error.message}`);
    }
  }

  async getUserTokens(walletAddress, page = 1, limit = 10) {
    try {
      const cacheKey = `user_tokens:${walletAddress}:${page}:${limit}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const tokens = await this.loadTokens();
      const userTokens = tokens
        .filter(t => t.creator === walletAddress)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Implement pagination
      const startIndex = (page - 1) * limit;
      const paginatedTokens = userTokens.slice(startIndex, startIndex + limit);

      const result = {
        tokens: paginatedTokens,
        total: userTokens.length,
        page,
        limit,
        totalPages: Math.ceil(userTokens.length / limit)
      };

      // Cache the result
      this.cache.set(cacheKey, result, 300); // 5 minutes

      return result;
    } catch (error) {
      logger.error('Failed to get user tokens', { 
        error: error.message, 
        walletAddress 
      });
      throw new Error(`Failed to get user tokens: ${error.message}`);
    }
  }

  async getAllTokens(page = 1, limit = 20, filters = {}) {
    try {
      const cacheKey = `tokens:${page}:${limit}:${JSON.stringify(filters)}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let tokens = await this.loadTokens();

      // Apply filters
      if (filters.creator) {
        tokens = tokens.filter(t => t.creator === filters.creator);
      }
      if (filters.symbol) {
        tokens = tokens.filter(t => 
          t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
        );
      }
      if (filters.name) {
        tokens = tokens.filter(t => 
          t.name.toLowerCase().includes(filters.name.toLowerCase())
        );
      }
      if (filters.status) {
        tokens = tokens.filter(t => t.status === filters.status);
      }

      // Sort by creation date (newest first)
      tokens.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Implement pagination
      const startIndex = (page - 1) * limit;
      const paginatedTokens = tokens.slice(startIndex, startIndex + limit);

      const result = {
        tokens: paginatedTokens,
        total: tokens.length,
        page,
        limit,
        totalPages: Math.ceil(tokens.length / limit),
        filters
      };

      // Cache the result
      this.cache.set(cacheKey, result, 300); // 5 minutes

      return result;
    } catch (error) {
      logger.error('Failed to get all tokens', { error: error.message });
      throw new Error(`Failed to get all tokens: ${error.message}`);
    }
  }

  async updateTokenStatus(tokenId, status, metadata = {}) {
    try {
      const tokens = await this.loadTokens();
      const tokenIndex = tokens.findIndex(t => t.id === tokenId);
      
      if (tokenIndex === -1) {
        throw new Error('Token not found');
      }

      tokens[tokenIndex] = {
        ...tokens[tokenIndex],
        status,
        ...metadata,
        updatedAt: new Date().toISOString()
      };

      await fs.writeJson(this.tokensFile, tokens, { spaces: 2 });

      // Update cache
      this.cache.set(`token:${tokenId}`, tokens[tokenIndex]);
      this.cache.del('tokens:all'); // Invalidate caches

      logger.info('Token status updated', { tokenId, status });

      return tokens[tokenIndex];
    } catch (error) {
      logger.error('Failed to update token status', { 
        error: error.message, 
        tokenId, 
        status 
      });
      throw new Error(`Failed to update token status: ${error.message}`);
    }
  }

  // ================================
  // USER OPERATIONS
  // ================================
  async saveUserRecord(userData) {
    try {
      const users = await this.loadUsers();
      
      // Add timestamp if not present
      if (!userData.createdAt) {
        userData.createdAt = new Date().toISOString();
      }
      
      // Check if user already exists
      const existingIndex = users.findIndex(u => u.walletAddress === userData.walletAddress);
      if (existingIndex >= 0) {
        // Update existing user
        users[existingIndex] = { 
          ...users[existingIndex], 
          ...userData, 
          updatedAt: new Date().toISOString() 
        };
      } else {
        // Add new user
        users.push(userData);
      }

      await fs.writeJson(this.usersFile, users, { spaces: 2 });
      
      // Update cache
      this.cache.set(`user:${userData.walletAddress}`, userData);

      logger.info('User record saved', { 
        walletAddress: userData.walletAddress?.slice(0, 8) + '...' 
      });

      return userData;
    } catch (error) {
      logger.error('Failed to save user record', { 
        error: error.message, 
        walletAddress: userData.walletAddress 
      });
      throw new Error(`Failed to save user record: ${error.message}`);
    }
  }

  async getUserRecord(walletAddress) {
    try {
      // Check cache first
      const cached = this.cache.get(`user:${walletAddress}`);
      if (cached) {
        return cached;
      }

      const users = await this.loadUsers();
      const user = users.find(u => u.walletAddress === walletAddress);
      
      if (user) {
        // Cache the result
        this.cache.set(`user:${walletAddress}`, user);
      }

      return user || null;
    } catch (error) {
      logger.error('Failed to get user record', { 
        error: error.message, 
        walletAddress 
      });
      throw new Error(`Failed to get user record: ${error.message}`);
    }
  }

  // ================================
  // SESSION OPERATIONS
  // ================================
  async saveSession(sessionData) {
    try {
      const sessions = await this.loadSessions();
      
      // Add timestamp
      sessionData.createdAt = new Date().toISOString();
      sessionData.expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(); // 24 hours
      
      sessions.push(sessionData);

      // Clean up expired sessions
      const now = new Date();
      const validSessions = sessions.filter(s => new Date(s.expiresAt) > now);

      await fs.writeJson(this.sessionsFile, validSessions, { spaces: 2 });
      
      // Update cache
      this.cache.set(`session:${sessionData.id}`, sessionData);

      logger.info('Session saved', { 
        sessionId: sessionData.id, 
        walletAddress: sessionData.walletAddress?.slice(0, 8) + '...' 
      });

      return sessionData;
    } catch (error) {
      logger.error('Failed to save session', { 
        error: error.message, 
        sessionId: sessionData.id 
      });
      throw new Error(`Failed to save session: ${error.message}`);
    }
  }

  async getSession(sessionId) {
    try {
      // Check cache first
      const cached = this.cache.get(`session:${sessionId}`);
      if (cached) {
        // Check if still valid
        if (new Date(cached.expiresAt) > new Date()) {
          return cached;
        } else {
          this.cache.del(`session:${sessionId}`);
          return null;
        }
      }

      const sessions = await this.loadSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session && new Date(session.expiresAt) > new Date()) {
        // Cache the result
        this.cache.set(`session:${sessionId}`, session);
        return session;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get session', { 
        error: error.message, 
        sessionId 
      });
      throw new Error(`Failed to get session: ${error.message}`);
    }
  }

  async deleteSession(sessionId) {
    try {
      const sessions = await this.loadSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);

      await fs.writeJson(this.sessionsFile, filteredSessions, { spaces: 2 });
      
      // Remove from cache
      this.cache.del(`session:${sessionId}`);

      logger.info('Session deleted', { sessionId });

      return true;
    } catch (error) {
      logger.error('Failed to delete session', { 
        error: error.message, 
        sessionId 
      });
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  // ================================
  // ANALYTICS OPERATIONS
  // ================================
  async getAnalytics() {
    try {
      const cacheKey = 'analytics:overview';
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const tokens = await this.loadTokens();
      const users = await this.loadUsers();

      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const analytics = {
        totals: {
          tokens: tokens.length,
          users: users.length,
          successfulTokens: tokens.filter(t => t.status === 'completed').length,
          failedTokens: tokens.filter(t => t.status === 'failed').length
        },
        recent: {
          tokens24h: tokens.filter(t => new Date(t.createdAt) > last24Hours).length,
          tokens7d: tokens.filter(t => new Date(t.createdAt) > last7Days).length,
          tokens30d: tokens.filter(t => new Date(t.createdAt) > last30Days).length,
          users24h: users.filter(u => new Date(u.createdAt) > last24Hours).length,
          users7d: users.filter(u => new Date(u.createdAt) > last7Days).length,
          users30d: users.filter(u => new Date(u.createdAt) > last30Days).length
        },
        topCreators: this.getTopCreators(tokens, 10),
        tokensByDay: this.getTokensByDay(tokens, 30),
        generatedAt: new Date().toISOString()
      };

      // Cache for 5 minutes
      this.cache.set(cacheKey, analytics, 300);

      return analytics;
    } catch (error) {
      logger.error('Failed to get analytics', { error: error.message });
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  // ================================
  // HELPER METHODS
  // ================================
  async loadTokens() {
    try {
      return await fs.readJson(this.tokensFile);
    } catch (error) {
      logger.warn('Failed to load tokens file', { error: error.message });
      return [];
    }
  }

  async loadUsers() {
    try {
      return await fs.readJson(this.usersFile);
    } catch (error) {
      logger.warn('Failed to load users file', { error: error.message });
      return [];
    }
  }

  async loadSessions() {
    try {
      return await fs.readJson(this.sessionsFile);
    } catch (error) {
      logger.warn('Failed to load sessions file', { error: error.message });
      return [];
    }
  }

  getTopCreators(tokens, limit) {
    const creatorCounts = {};
    tokens.forEach(token => {
      if (token.creator) {
        creatorCounts[token.creator] = (creatorCounts[token.creator] || 0) + 1;
      }
    });

    return Object.entries(creatorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([address, count]) => ({
        address,
        count,
        shortAddress: address.slice(0, 8) + '...' + address.slice(-4)
      }));
  }

  getTokensByDay(tokens, days) {
    const dayData = {};
    const now = new Date();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dayData[dateStr] = 0;
    }

    // Count tokens by day
    tokens.forEach(token => {
      const dateStr = token.createdAt.split('T')[0];
      if (dayData.hasOwnProperty(dateStr)) {
        dayData[dateStr]++;
      }
    });

    return Object.entries(dayData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({ date, count }));
  }

  // ================================
  // CLEANUP OPERATIONS
  // ================================
  async cleanup() {
    try {
      // Clean expired sessions
      const sessions = await this.loadSessions();
      const now = new Date();
      const validSessions = sessions.filter(s => new Date(s.expiresAt) > now);
      
      if (validSessions.length !== sessions.length) {
        await fs.writeJson(this.sessionsFile, validSessions, { spaces: 2 });
        logger.info('Cleaned up expired sessions', { 
          removed: sessions.length - validSessions.length 
        });
      }

      // Clear old cache entries
      this.cache.flushAll();

      return true;
    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
}

// ================================
// SINGLETON INSTANCE
// ================================
const databaseService = new DatabaseService();

// Export functions
export const saveTokenRecord = (tokenData) => 
  databaseService.saveTokenRecord(tokenData);

export const getTokenRecord = (tokenId) => 
  databaseService.getTokenRecord(tokenId);

export const getUserTokens = (walletAddress, page, limit) => 
  databaseService.getUserTokens(walletAddress, page, limit);

export const getAllTokens = (page, limit, filters) => 
  databaseService.getAllTokens(page, limit, filters);

export const updateTokenStatus = (tokenId, status, metadata) => 
  databaseService.updateTokenStatus(tokenId, status, metadata);

export const saveUserRecord = (userData) => 
  databaseService.saveUserRecord(userData);

export const getUserRecord = (walletAddress) => 
  databaseService.getUserRecord(walletAddress);

export const saveSession = (sessionData) => 
  databaseService.saveSession(sessionData);

export const getSession = (sessionId) => 
  databaseService.getSession(sessionId);

export const deleteSession = (sessionId) => 
  databaseService.deleteSession(sessionId);

export const getAnalytics = () => 
  databaseService.getAnalytics();

export const cleanup = () => 
  databaseService.cleanup();

export default databaseService;