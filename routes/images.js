import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { body, validationResult } from 'express-validator';
import { generateTokenImage, uploadImageToStorage } from '../services/imageService.js';
import { verifyWallet } from '../middleware/auth.js';
import winston from 'winston';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// MULTER CONFIGURATION
// ================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  }
});

// ================================
// AI IMAGE GENERATION
// ================================
router.post('/generate', verifyWallet, [
  body('prompt')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Prompt must be between 5 and 500 characters'),
  body('style')
    .optional()
    .isIn(['realistic', 'cartoon', 'abstract', 'minimalist', 'cyberpunk', 'retro'])
    .withMessage('Invalid style option'),
  body('size')
    .optional()
    .isIn(['256x256', '512x512', '1024x1024'])
    .withMessage('Invalid size option'),
  body('count')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Count must be between 1 and 4')
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

    const { 
      prompt, 
      style = 'realistic', 
      size = '512x512', 
      count = 1 
    } = req.body;

    logger.info('AI image generation request', { 
      prompt: prompt.slice(0, 50) + '...', 
      style, 
      size, 
      count,
      user: req.walletAddress.slice(0, 8) + '...'
    });

    // Generate enhanced prompt based on style
    const stylePrompts = {
      realistic: 'photorealistic, high quality, detailed',
      cartoon: 'cartoon style, colorful, animated, playful',
      abstract: 'abstract art, geometric, modern, artistic',
      minimalist: 'minimalist design, clean, simple, elegant',
      cyberpunk: 'cyberpunk style, neon colors, futuristic, digital',
      retro: 'retro style, vintage, nostalgic, classic'
    };

    const enhancedPrompt = `${prompt}, ${stylePrompts[style]}, token logo design, cryptocurrency`;

    // Generate image(s)
    const images = await generateTokenImage(enhancedPrompt, '', {
      size,
      count,
      style
    });

    // Upload to decentralized storage
    const uploadPromises = images.map(async (imageUrl, index) => {
      try {
        const storageUrl = await uploadImageToStorage(imageUrl, `ai-generated-${uuidv4()}`);
        return {
          id: uuidv4(),
          url: imageUrl,
          storageUrl,
          prompt,
          style,
          size,
          index: index + 1
        };
      } catch (uploadError) {
        logger.warn('Failed to upload image to storage', { error: uploadError.message });
        return {
          id: uuidv4(),
          url: imageUrl,
          storageUrl: imageUrl, // Fallback to original URL
          prompt,
          style,
          size,
          index: index + 1
        };
      }
    });

    const results = await Promise.all(uploadPromises);

    logger.info('AI images generated successfully', { 
      count: results.length,
      user: req.walletAddress.slice(0, 8) + '...'
    });

    res.json({
      success: true,
      data: {
        images: results,
        prompt,
        style,
        size,
        generatedAt: new Date().toISOString()
      },
      message: `Generated ${results.length} image(s) successfully`
    });

  } catch (error) {
    logger.error('AI image generation failed', { 
      error: error.message, 
      stack: error.stack,
      user: req.walletAddress?.slice(0, 8) + '...'
    });

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to generate image';

    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'AI service rate limit exceeded. Please try again later.';
    } else if (error.message.includes('inappropriate') || error.message.includes('policy')) {
      statusCode = 400;
      errorMessage = 'Image prompt violates content policy. Please modify your prompt.';
    } else if (error.message.includes('API key') || error.message.includes('authentication')) {
      statusCode = 503;
      errorMessage = 'AI service temporarily unavailable. Please try again later.';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// IMAGE UPLOAD
// ================================
router.post('/upload', verifyWallet, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { buffer, mimetype, originalname, size } = req.file;

    logger.info('Image upload request', { 
      originalname, 
      mimetype, 
      size,
      user: req.walletAddress.slice(0, 8) + '...'
    });

    // Process and optimize image
    const optimizedBuffer = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 90 })
      .toBuffer();

    // Generate unique filename
    const filename = `token-image-${uuidv4()}.png`;
    
    // Create temporary file for upload
    const tempDir = './temp';
    await fs.ensureDir(tempDir);
    const tempPath = path.join(tempDir, filename);
    await fs.writeFile(tempPath, optimizedBuffer);

    try {
      // Upload to decentralized storage
      const storageUrl = await uploadImageToStorage(tempPath, filename);

      // Clean up temp file
      await fs.remove(tempPath);

      logger.info('Image uploaded successfully', { 
        filename, 
        storageUrl,
        user: req.walletAddress.slice(0, 8) + '...'
      });

      res.json({
        success: true,
        data: {
          id: uuidv4(),
          filename,
          originalName: originalname,
          url: storageUrl,
          size: optimizedBuffer.length,
          dimensions: '512x512',
          uploadedAt: new Date().toISOString()
        },
        message: 'Image uploaded successfully'
      });

    } catch (uploadError) {
      // Clean up temp file on upload failure
      await fs.remove(tempPath).catch(() => {});
      throw uploadError;
    }

  } catch (error) {
    logger.error('Image upload failed', { 
      error: error.message, 
      stack: error.stack,
      user: req.walletAddress?.slice(0, 8) + '...'
    });

    let statusCode = 500;
    let errorMessage = 'Failed to upload image';

    if (error.message.includes('File too large')) {
      statusCode = 413;
      errorMessage = 'Image file too large. Maximum size is 5MB.';
    } else if (error.message.includes('Invalid file type')) {
      statusCode = 400;
      errorMessage = 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.';
    } else if (error.message.includes('storage')) {
      statusCode = 503;
      errorMessage = 'Storage service temporarily unavailable. Please try again.';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// IMAGE OPTIMIZATION
// ================================
router.post('/optimize', verifyWallet, [
  body('imageUrl')
    .isURL()
    .withMessage('Valid image URL is required'),
  body('width')
    .optional()
    .isInt({ min: 100, max: 2048 })
    .withMessage('Width must be between 100 and 2048 pixels'),
  body('height')
    .optional()
    .isInt({ min: 100, max: 2048 })
    .withMessage('Height must be between 100 and 2048 pixels'),
  body('quality')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Quality must be between 10 and 100')
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

    const { 
      imageUrl, 
      width = 512, 
      height = 512, 
      quality = 90 
    } = req.body;

    logger.info('Image optimization request', { 
      imageUrl: imageUrl.slice(0, 50) + '...', 
      width, 
      height, 
      quality,
      user: req.walletAddress.slice(0, 8) + '...'
    });

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to download image from URL');
    }

    const imageBuffer = await response.arrayBuffer();

    // Optimize image
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize(width, height, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality })
      .toBuffer();

    // Upload optimized version
    const filename = `optimized-${uuidv4()}.png`;
    const tempDir = './temp';
    await fs.ensureDir(tempDir);
    const tempPath = path.join(tempDir, filename);
    await fs.writeFile(tempPath, optimizedBuffer);

    try {
      const storageUrl = await uploadImageToStorage(tempPath, filename);
      await fs.remove(tempPath);

      logger.info('Image optimized successfully', { 
        originalUrl: imageUrl.slice(0, 50) + '...', 
        optimizedUrl: storageUrl,
        user: req.walletAddress.slice(0, 8) + '...'
      });

      res.json({
        success: true,
        data: {
          originalUrl: imageUrl,
          optimizedUrl: storageUrl,
          originalSize: imageBuffer.byteLength,
          optimizedSize: optimizedBuffer.length,
          compression: Math.round((1 - optimizedBuffer.length / imageBuffer.byteLength) * 100),
          dimensions: `${width}x${height}`,
          quality,
          optimizedAt: new Date().toISOString()
        },
        message: 'Image optimized successfully'
      });

    } catch (uploadError) {
      await fs.remove(tempPath).catch(() => {});
      throw uploadError;
    }

  } catch (error) {
    logger.error('Image optimization failed', { 
      error: error.message, 
      user: req.walletAddress?.slice(0, 8) + '...'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to optimize image',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ================================
// IMAGE TEMPLATES
// ================================
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'defi',
        name: 'DeFi Token',
        description: 'Professional DeFi-themed token designs',
        preview: 'https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=DeFi',
        prompts: [
          'futuristic financial graph, blue and gold, cryptocurrency symbol',
          'abstract blockchain network, geometric patterns, professional',
          'golden coin with circuit patterns, technological, sleek design'
        ]
      },
      {
        id: 'gaming',
        name: 'Gaming Token',
        description: 'Gaming and metaverse-inspired designs',
        preview: 'https://via.placeholder.com/200x200/8B5CF6/FFFFFF?text=GAME',
        prompts: [
          'fantasy game emblem, magical symbols, vibrant colors',
          'cyberpunk gaming logo, neon effects, futuristic',
          'retro arcade coin, pixel art style, nostalgic'
        ]
      },
      {
        id: 'meme',
        name: 'Meme Token',
        description: 'Fun and viral meme-inspired designs',
        preview: 'https://via.placeholder.com/200x200/F59E0B/FFFFFF?text=MEME',
        prompts: [
          'cartoon animal mascot, friendly and approachable, bright colors',
          'space rocket with cute characters, adventure theme',
          'diamond hands symbol, community-driven, bold design'
        ]
      },
      {
        id: 'art',
        name: 'Art Token',
        description: 'Artistic and creative token designs',
        preview: 'https://via.placeholder.com/200x200/EC4899/FFFFFF?text=ART',
        prompts: [
          'abstract artistic composition, colorful brushstrokes',
          'minimalist geometric art, clean lines, modern',
          'digital art palette, creative tools, inspiration'
        ]
      }
    ];

    res.json({
      success: true,
      data: templates,
      message: 'Image templates retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get image templates', { error: error.message });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve image templates'
    });
  }
});

export default router;