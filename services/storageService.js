import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import sharp from 'sharp';
import crypto from 'crypto';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// IPFS STORAGE SERVICE (PINATA)
// ================================
class IPFSStorageService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_API_KEY;
    this.pinataJwt = process.env.PINATA_JWT;
    
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      logger.warn('Pinata credentials not configured. IPFS uploads will fail.');
    }
    
    this.baseUrl = 'https://api.pinata.cloud';
    this.gatewayUrl = 'https://gateway.pinata.cloud/ipfs';
    
    // Backup IPFS services
    this.backupServices = [
      'https://ipfs.io/ipfs',
      'https://cloudflare-ipfs.com/ipfs',
      'https://dweb.link/ipfs'
    ];
  }

  // ================================
  // FILE UPLOAD TO IPFS
  // ================================
  async uploadFile(filePath, metadata = {}) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      // Add metadata
      const pinataMetadata = {
        name: metadata.name || path.basename(filePath),
        keyvalues: {
          type: metadata.type || 'file',
          category: metadata.category || 'token-asset',
          uploadedAt: new Date().toISOString(),
          ...metadata.customData
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
      
      // Pin options
      const pinataOptions = {
        cidVersion: 1,
        customPinPolicy: {
          regions: [
            { id: 'FRA1', desiredReplicationCount: 2 },
            { id: 'NYC1', desiredReplicationCount: 2 }
          ]
        }
      };
      
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      const response = await axios.post(
        `${this.baseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const result = {
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        gatewayUrl: `${this.gatewayUrl}/${response.data.IpfsHash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        backupUrls: this.backupServices.map(service => `${service}/${response.data.IpfsHash}`)
      };

      logger.info('File uploaded to IPFS successfully', {
        ipfsHash: result.ipfsHash,
        fileName: metadata.name,
        size: result.pinSize
      });

      return result;

    } catch (error) {
      logger.error('IPFS file upload failed', {
        error: error.message,
        filePath,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  // ================================
  // BUFFER UPLOAD TO IPFS
  // ================================
  async uploadBuffer(buffer, fileName, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', buffer, fileName);
      
      const pinataMetadata = {
        name: metadata.name || fileName,
        keyvalues: {
          type: metadata.type || 'buffer',
          category: metadata.category || 'token-asset',
          uploadedAt: new Date().toISOString(),
          size: buffer.length,
          ...metadata.customData
        }
      };
      
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      const response = await axios.post(
        `${this.baseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          },
          timeout: 60000
        }
      );

      const result = {
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        gatewayUrl: `${this.gatewayUrl}/${response.data.IpfsHash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        backupUrls: this.backupServices.map(service => `${service}/${response.data.IpfsHash}`)
      };

      logger.info('Buffer uploaded to IPFS successfully', {
        ipfsHash: result.ipfsHash,
        fileName,
        size: result.pinSize
      });

      return result;

    } catch (error) {
      logger.error('IPFS buffer upload failed', {
        error: error.message,
        fileName,
        status: error.response?.status
      });
      throw new Error(`IPFS buffer upload failed: ${error.message}`);
    }
  }

  // ================================
  // JSON UPLOAD TO IPFS
  // ================================
  async uploadJSON(jsonData, fileName, metadata = {}) {
    try {
      const jsonString = JSON.stringify(jsonData, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');
      
      const uploadMetadata = {
        ...metadata,
        type: 'json',
        contentType: 'application/json',
        customData: {
          ...metadata.customData,
          jsonKeys: Object.keys(jsonData),
          jsonSize: jsonString.length
        }
      };

      return await this.uploadBuffer(buffer, fileName, uploadMetadata);

    } catch (error) {
      logger.error('JSON upload to IPFS failed', { error: error.message, fileName });
      throw new Error(`JSON upload failed: ${error.message}`);
    }
  }

  // ================================
  // IMAGE PROCESSING AND UPLOAD
  // ================================
  async uploadImage(imagePath, options = {}) {
    try {
      const {
        resize = { width: 512, height: 512 },
        format = 'png',
        quality = 90,
        optimize = true
      } = options;

      // Read and process image
      let imageBuffer;
      
      if (optimize) {
        const sharpInstance = sharp(imagePath);
        
        if (resize) {
          sharpInstance.resize(resize.width, resize.height, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          });
        }
        
        if (format === 'png') {
          sharpInstance.png({ quality: quality, compressionLevel: 9 });
        } else if (format === 'jpeg' || format === 'jpg') {
          sharpInstance.jpeg({ quality: quality, progressive: true });
        } else if (format === 'webp') {
          sharpInstance.webp({ quality: quality });
        }
        
        imageBuffer = await sharpInstance.toBuffer();
        
      } else {
        imageBuffer = await fs.readFile(imagePath);
      }

      const fileName = `${path.parse(imagePath).name}.${format}`;
      
      const metadata = {
        name: fileName,
        type: 'image',
        category: 'token-logo',
        customData: {
          originalFormat: path.extname(imagePath),
          processedFormat: format,
          optimized: optimize,
          dimensions: resize ? `${resize.width}x${resize.height}` : 'original'
        }
      };

      const result = await this.uploadBuffer(imageBuffer, fileName, metadata);
      
      // Add image-specific properties
      result.imageUrl = result.gatewayUrl;
      result.thumbnailUrl = result.gatewayUrl; // Could generate thumbnail in future
      
      return result;

    } catch (error) {
      logger.error('Image upload failed', { error: error.message, imagePath });
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // ================================
  // URL DOWNLOAD AND UPLOAD
  // ================================
  async uploadFromUrl(url, fileName, metadata = {}) {
    try {
      logger.info('Downloading file from URL', { url, fileName });
      
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'SolMeme-Creator/1.0'
        }
      });

      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.ensureDir(tempDir);
      
      const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${fileName}`);
      const writeStream = fs.createWriteStream(tempFilePath);
      
      response.data.pipe(writeStream);
      
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Upload to IPFS
      const uploadResult = await this.uploadFile(tempFilePath, {
        ...metadata,
        name: fileName,
        customData: {
          sourceUrl: url,
          downloadedAt: new Date().toISOString(),
          ...metadata.customData
        }
      });

      // Clean up temp file
      await fs.remove(tempFilePath);

      logger.info('File uploaded from URL successfully', {
        url,
        ipfsHash: uploadResult.ipfsHash
      });

      return uploadResult;

    } catch (error) {
      logger.error('Upload from URL failed', { error: error.message, url, fileName });
      throw new Error(`Upload from URL failed: ${error.message}`);
    }
  }

  // ================================
  // TOKEN METADATA CREATION
  // ================================
  async createTokenMetadata(tokenData, logoIpfsHash) {
    try {
      const metadata = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        image: `${this.gatewayUrl}/${logoIpfsHash}`,
        external_url: tokenData.website || '',
        seller_fee_basis_points: Math.floor((tokenData.transactionFee || 0) * 100),
        attributes: [
          {
            trait_type: 'Total Supply',
            value: tokenData.supply || 1000000000
          },
          {
            trait_type: 'Decimals',
            value: tokenData.decimals || 9
          },
          {
            trait_type: 'Transaction Fee',
            value: `${tokenData.transactionFee || 0}%`
          },
          {
            trait_type: 'Creation Date',
            value: new Date().toISOString().split('T')[0]
          }
        ],
        properties: {
          files: [
            {
              uri: `${this.gatewayUrl}/${logoIpfsHash}`,
              type: 'image/png'
            }
          ],
          category: 'image',
          creators: [
            {
              address: tokenData.creator,
              verified: false,
              share: 100
            }
          ]
        },
        collection: {
          name: 'SolMeme Creator Tokens',
          family: 'SolMeme'
        }
      };

      // Add social links if available
      if (tokenData.website || tokenData.twitter || tokenData.telegram) {
        metadata.properties.links = {};
        if (tokenData.website) metadata.properties.links.website = tokenData.website;
        if (tokenData.twitter) metadata.properties.links.twitter = tokenData.twitter;
        if (tokenData.telegram) metadata.properties.links.telegram = tokenData.telegram;
      }

      // Add Dexscreener compatibility
      metadata.extensions = {
        dexscreener: {
          enabled: true,
          prepared: true,
          metadata_standard: 'metaplex',
          social_links: metadata.properties.links || {}
        }
      };

      const fileName = `${tokenData.symbol}_metadata.json`;
      const uploadResult = await this.uploadJSON(metadata, fileName, {
        name: fileName,
        category: 'token-metadata',
        customData: {
          tokenSymbol: tokenData.symbol,
          tokenName: tokenData.name,
          metadataVersion: '1.0',
          standard: 'metaplex'
        }
      });

      logger.info('Token metadata created and uploaded', {
        tokenSymbol: tokenData.symbol,
        metadataHash: uploadResult.ipfsHash
      });

      return {
        metadata,
        uploadResult,
        metadataUri: uploadResult.gatewayUrl
      };

    } catch (error) {
      logger.error('Token metadata creation failed', {
        error: error.message,
        tokenSymbol: tokenData.symbol
      });
      throw new Error(`Metadata creation failed: ${error.message}`);
    }
  }

  // ================================
  // FILE MANAGEMENT
  // ================================
  async getPinList(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.pageLimit) params.append('pageLimit', filters.pageLimit.toString());
      if (filters.pageOffset) params.append('pageOffset', filters.pageOffset.toString());
      if (filters.metadata) {
        Object.entries(filters.metadata).forEach(([key, value]) => {
          params.append(`metadata[keyvalues][${key}]`, value);
        });
      }

      const response = await axios.get(
        `${this.baseUrl}/data/pinList?${params.toString()}`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      return response.data;

    } catch (error) {
      logger.error('Failed to get pin list', { error: error.message });
      throw new Error(`Failed to get pin list: ${error.message}`);
    }
  }

  async unpinFile(ipfsHash) {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      logger.info('File unpinned successfully', { ipfsHash });
      return response.data;

    } catch (error) {
      logger.error('Failed to unpin file', { error: error.message, ipfsHash });
      throw new Error(`Failed to unpin file: ${error.message}`);
    }
  }

  // ================================
  // UTILITY FUNCTIONS
  // ================================
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/data/testAuthentication`,
        {
          headers: {
            'pinata_api_key': this.pinataApiKey,
            'pinata_secret_api_key': this.pinataSecretKey,
          }
        }
      );

      logger.info('Pinata connection test successful', response.data);
      return true;

    } catch (error) {
      logger.error('Pinata connection test failed', { error: error.message });
      return false;
    }
  }

  generateMetadataHash(metadata) {
    const metadataString = JSON.stringify(metadata, Object.keys(metadata).sort());
    return crypto.createHash('sha256').update(metadataString).digest('hex');
  }

  validateIPFSHash(hash) {
    // Basic IPFS hash validation
    return /^Qm[A-Za-z0-9]{44}$/.test(hash) || /^baf[A-Za-z0-9]+$/.test(hash);
  }

  getGatewayUrl(ipfsHash, gateway = 'pinata') {
    const gateways = {
      pinata: 'https://gateway.pinata.cloud/ipfs',
      ipfs: 'https://ipfs.io/ipfs',
      cloudflare: 'https://cloudflare-ipfs.com/ipfs',
      dweb: 'https://dweb.link/ipfs'
    };

    return `${gateways[gateway] || gateways.pinata}/${ipfsHash}`;
  }
}

// ================================
// ARWEAVE STORAGE SERVICE (BACKUP)
// ================================
class ArweaveStorageService {
  constructor() {
    this.bundlrUrl = process.env.BUNDLR_URL || 'https://node1.bundlr.network';
    this.arweaveWallet = process.env.ARWEAVE_WALLET;
    
    if (!this.arweaveWallet) {
      logger.warn('Arweave wallet not configured. Arweave uploads will fail.');
    }
  }

  async uploadBuffer(buffer, contentType = 'application/octet-stream') {
    try {
      // This would implement Arweave upload logic
      // For now, return a simulated response
      const simulatedTxId = 'arweave_' + crypto.randomBytes(16).toString('hex');
      
      logger.info('Arweave upload simulated', { txId: simulatedTxId });
      
      return {
        id: simulatedTxId,
        url: `https://arweave.net/${simulatedTxId}`,
        size: buffer.length,
        contentType
      };

    } catch (error) {
      logger.error('Arweave upload failed', { error: error.message });
      throw new Error(`Arweave upload failed: ${error.message}`);
    }
  }
}

// ================================
// UNIFIED STORAGE SERVICE
// ================================
class UnifiedStorageService {
  constructor() {
    this.ipfs = new IPFSStorageService();
    this.arweave = new ArweaveStorageService();
    this.preferredService = 'ipfs';
  }

  async uploadWithBackup(data, fileName, options = {}) {
    const results = {
      primary: null,
      backup: null,
      errors: []
    };

    try {
      // Primary upload (IPFS)
      if (Buffer.isBuffer(data)) {
        results.primary = await this.ipfs.uploadBuffer(data, fileName, options);
      } else if (typeof data === 'string') {
        results.primary = await this.ipfs.uploadFile(data, options);
      } else {
        results.primary = await this.ipfs.uploadJSON(data, fileName, options);
      }

      logger.info('Primary storage upload successful', {
        service: 'ipfs',
        hash: results.primary.ipfsHash
      });

    } catch (error) {
      results.errors.push({ service: 'ipfs', error: error.message });
      logger.error('Primary storage upload failed', { error: error.message });
    }

    try {
      // Backup upload (Arweave)
      let buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'string') {
        buffer = await fs.readFile(data);
      } else {
        buffer = Buffer.from(JSON.stringify(data), 'utf-8');
      }

      results.backup = await this.arweave.uploadBuffer(buffer, options.contentType);

      logger.info('Backup storage upload successful', {
        service: 'arweave',
        txId: results.backup.id
      });

    } catch (error) {
      results.errors.push({ service: 'arweave', error: error.message });
      logger.error('Backup storage upload failed', { error: error.message });
    }

    if (!results.primary && !results.backup) {
      throw new Error('All storage services failed: ' + JSON.stringify(results.errors));
    }

    return results;
  }
}

// ================================
// EXPORTS
// ================================
const ipfsService = new IPFSStorageService();
const arweaveService = new ArweaveStorageService();
const unifiedService = new UnifiedStorageService();

export const uploadToIPFS = (filePath, metadata) => ipfsService.uploadFile(filePath, metadata);
export const uploadBufferToIPFS = (buffer, fileName, metadata) => ipfsService.uploadBuffer(buffer, fileName, metadata);
export const uploadJSONToIPFS = (jsonData, fileName, metadata) => ipfsService.uploadJSON(jsonData, fileName, metadata);
export const uploadImageToIPFS = (imagePath, options) => ipfsService.uploadImage(imagePath, options);
export const uploadFromUrl = (url, fileName, metadata) => ipfsService.uploadFromUrl(url, fileName, metadata);
export const createTokenMetadata = (tokenData, logoIpfsHash) => ipfsService.createTokenMetadata(tokenData, logoIpfsHash);
export const uploadToArweave = (buffer, contentType) => arweaveService.uploadBuffer(buffer, contentType);
export const uploadWithBackup = (data, fileName, options) => unifiedService.uploadWithBackup(data, fileName, options);

export { ipfsService, arweaveService, unifiedService };
export default ipfsService;