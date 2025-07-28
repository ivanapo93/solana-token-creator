import OpenAI from 'openai';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { uploadToArweave, uploadToIPFS } from './storageService.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// AI IMAGE SERVICE CONFIGURATION
// ================================
class ImageService {
  constructor() {
    // Initialize OpenAI client
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Stability AI client
    if (process.env.STABILITY_API_KEY) {
      this.stabilityApiKey = process.env.STABILITY_API_KEY;
      this.stabilityEndpoint = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
    }

    // Default configuration
    this.defaultConfig = {
      openai: {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        style: 'natural'
      },
      stability: {
        engine: 'stable-diffusion-xl-1024-v1-0',
        width: 1024,
        height: 1024,
        cfg_scale: 7,
        steps: 30,
        samples: 1
      }
    };

    logger.info('Image service initialized', {
      openaiEnabled: !!this.openai,
      stabilityEnabled: !!this.stabilityApiKey
    });
  }

  // ================================
  // OPENAI DALL-E INTEGRATION
  // ================================
  async generateWithOpenAI(prompt, options = {}) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const {
        size = this.defaultConfig.openai.size,
        quality = this.defaultConfig.openai.quality,
        style = this.defaultConfig.openai.style,
        count = 1
      } = options;

      logger.info('Generating image with OpenAI DALL-E', { 
        prompt: prompt.slice(0, 50) + '...', 
        size, 
        quality, 
        style, 
        count 
      });

      // Generate multiple images if requested
      const promises = Array.from({ length: count }, async () => {
        const response = await this.openai.images.generate({
          model: 'dall-e-3',
          prompt: this.enhancePromptForToken(prompt),
          size,
          quality,
          style,
          n: 1
        });

        return response.data[0].url;
      });

      const imageUrls = await Promise.all(promises);

      logger.info('OpenAI image generation successful', { 
        count: imageUrls.length,
        prompt: prompt.slice(0, 30) + '...'
      });

      return imageUrls;

    } catch (error) {
      logger.error('OpenAI image generation failed', { 
        error: error.message,
        prompt: prompt.slice(0, 50) + '...'
      });

      // Handle specific OpenAI errors
      if (error.status === 400 && error.message.includes('safety')) {
        throw new Error('Image prompt violates OpenAI content policy. Please modify your prompt.');
      } else if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('Invalid OpenAI API key configuration.');
      }

      throw new Error(`OpenAI image generation failed: ${error.message}`);
    }
  }

  // ================================
  // STABILITY AI INTEGRATION
  // ================================
  async generateWithStability(prompt, options = {}) {
    if (!this.stabilityApiKey) {
      throw new Error('Stability AI API key not configured');
    }

    try {
      const {
        width = this.defaultConfig.stability.width,
        height = this.defaultConfig.stability.height,
        cfg_scale = this.defaultConfig.stability.cfg_scale,
        steps = this.defaultConfig.stability.steps,
        samples = this.defaultConfig.stability.samples,
        style = 'enhance'
      } = options;

      logger.info('Generating image with Stability AI', { 
        prompt: prompt.slice(0, 50) + '...', 
        width, 
        height, 
        samples 
      });

      const enhancedPrompt = this.enhancePromptForToken(prompt);

      const response = await axios.post(
        this.stabilityEndpoint,
        {
          text_prompts: [
            {
              text: enhancedPrompt,
              weight: 1
            },
            {
              text: 'blurry, bad quality, distorted, low resolution',
              weight: -1
            }
          ],
          cfg_scale,
          height,
          width,
          steps,
          samples,
          style_preset: style
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.stabilityApiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.data.artifacts) {
        // Convert base64 images to URLs by saving temporarily
        const imageUrls = await Promise.all(
          response.data.artifacts.map(async (artifact, index) => {
            const filename = `stability-${uuidv4()}-${index}.png`;
            const tempPath = path.join('./temp', filename);
            
            await fs.ensureDir('./temp');
            await fs.writeFile(tempPath, artifact.base64, 'base64');
            
            // Upload to storage and return URL
            try {
              const storageUrl = await this.uploadImageToStorage(tempPath, filename);
              await fs.remove(tempPath); // Clean up
              return storageUrl;
            } catch (uploadError) {
              await fs.remove(tempPath); // Clean up on error
              throw uploadError;
            }
          })
        );

        logger.info('Stability AI image generation successful', { 
          count: imageUrls.length,
          prompt: prompt.slice(0, 30) + '...'
        });

        return imageUrls;
      } else {
        throw new Error('No images returned from Stability AI');
      }

    } catch (error) {
      logger.error('Stability AI image generation failed', { 
        error: error.message,
        prompt: prompt.slice(0, 50) + '...'
      });

      // Handle specific Stability AI errors
      if (error.response?.status === 400) {
        throw new Error('Invalid request parameters for Stability AI.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Stability AI API key configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('Stability AI rate limit exceeded. Please try again later.');
      }

      throw new Error(`Stability AI image generation failed: ${error.message}`);
    }
  }

  // ================================
  // MAIN IMAGE GENERATION FUNCTION
  // ================================
  async generateTokenImage(prompt, tokenName = '', options = {}) {
    try {
      const {
        provider = 'openai', // 'openai' or 'stability'
        fallback = true,
        ...providerOptions
      } = options;

      logger.info('Starting image generation', { 
        provider, 
        prompt: prompt.slice(0, 50) + '...', 
        tokenName 
      });

      // Try primary provider
      try {
        if (provider === 'openai' && this.openai) {
          return await this.generateWithOpenAI(prompt, providerOptions);
        } else if (provider === 'stability' && this.stabilityApiKey) {
          return await this.generateWithStability(prompt, providerOptions);
        } else {
          throw new Error(`Provider ${provider} not available or not configured`);
        }
      } catch (primaryError) {
        logger.warn('Primary provider failed', { 
          provider, 
          error: primaryError.message 
        });

        if (!fallback) {
          throw primaryError;
        }

        // Try fallback provider
        const fallbackProvider = provider === 'openai' ? 'stability' : 'openai';
        
        logger.info('Attempting fallback provider', { fallbackProvider });

        if (fallbackProvider === 'openai' && this.openai) {
          return await this.generateWithOpenAI(prompt, providerOptions);
        } else if (fallbackProvider === 'stability' && this.stabilityApiKey) {
          return await this.generateWithStability(prompt, providerOptions);
        } else {
          throw new Error('All image generation providers failed or unavailable');
        }
      }

    } catch (error) {
      logger.error('Image generation completely failed', { 
        error: error.message,
        prompt: prompt.slice(0, 50) + '...'
      });

      // Return fallback images if all else fails
      return this.generateFallbackImages(tokenName, options.count || 1);
    }
  }

  // ================================
  // PROMPT ENHANCEMENT
  // ================================
  enhancePromptForToken(originalPrompt) {
    const tokenKeywords = [
      'cryptocurrency logo',
      'digital token design',
      'blockchain symbol',
      'clean geometric design',
      'professional icon',
      'high contrast',
      'suitable for small sizes',
      'memorable symbol'
    ];

    const qualityKeywords = [
      'high quality',
      'professional',
      'clean',
      'modern',
      'vector style',
      'sharp edges',
      'distinctive'
    ];

    const avoidKeywords = [
      'text overlay',
      'words',
      'letters',
      'numbers',
      'copyright symbols'
    ];

    return `${originalPrompt}, ${tokenKeywords.join(', ')}, ${qualityKeywords.join(', ')}, no ${avoidKeywords.join(', no ')}`;
  }

  // ================================
  // FALLBACK IMAGE GENERATION
  // ================================
  generateFallbackImages(tokenName = 'TOKEN', count = 1) {
    logger.info('Generating fallback images', { tokenName, count });

    const colors = [
      { bg: '667eea', fg: 'ffffff' },
      { bg: '764ba2', fg: 'ffffff' },
      { bg: 'f093fb', fg: '000000' },
      { bg: 'f5576c', fg: 'ffffff' },
      { bg: '4facfe', fg: 'ffffff' }
    ];

    return Array.from({ length: count }, (_, index) => {
      const color = colors[index % colors.length];
      const size = 512;
      const text = tokenName.slice(0, 4).toUpperCase() || 'TOK';
      
      return `https://via.placeholder.com/${size}x${size}/${color.bg}/${color.fg}?text=${encodeURIComponent(text)}`;
    });
  }

  // ================================
  // IMAGE UPLOAD TO STORAGE
  // ================================
  async uploadImageToStorage(imagePath, filename) {
    try {
      // Try Arweave first, then IPFS as fallback
      try {
        return await uploadToArweave(imagePath, 'image');
      } catch (arweaveError) {
        logger.warn('Arweave upload failed, trying IPFS', { 
          error: arweaveError.message 
        });
        return await uploadToIPFS(imagePath);
      }
    } catch (error) {
      logger.error('All storage uploads failed', { 
        error: error.message, 
        filename 
      });
      throw new Error(`Failed to upload image to decentralized storage: ${error.message}`);
    }
  }

  // ================================
  // IMAGE OPTIMIZATION
  // ================================
  async optimizeImage(imageBuffer, options = {}) {
    try {
      const sharp = await import('sharp');
      
      const {
        width = 512,
        height = 512,
        quality = 90,
        format = 'png'
      } = options;

      return await sharp.default(imageBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .toFormat(format, { quality })
        .toBuffer();

    } catch (error) {
      logger.error('Image optimization failed', { error: error.message });
      throw new Error(`Image optimization failed: ${error.message}`);
    }
  }

  // ================================
  // BATCH IMAGE GENERATION
  // ================================
  async generateBatch(prompts, options = {}) {
    try {
      const {
        provider = 'openai',
        maxConcurrent = 3,
        ...providerOptions
      } = options;

      logger.info('Starting batch image generation', { 
        count: prompts.length, 
        provider, 
        maxConcurrent 
      });

      // Process in batches to avoid rate limits
      const results = [];
      for (let i = 0; i < prompts.length; i += maxConcurrent) {
        const batch = prompts.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (prompt, index) => {
          try {
            const images = await this.generateTokenImage(prompt, `token-${i + index}`, {
              provider,
              count: 1,
              ...providerOptions
            });
            return { prompt, images, success: true };
          } catch (error) {
            logger.warn('Batch item failed', { prompt, error: error.message });
            return { 
              prompt, 
              images: this.generateFallbackImages(`token-${i + index}`, 1), 
              success: false, 
              error: error.message 
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + maxConcurrent < prompts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      logger.info('Batch generation complete', { 
        total: results.length, 
        successful: results.filter(r => r.success).length 
      });

      return results;

    } catch (error) {
      logger.error('Batch generation failed', { error: error.message });
      throw new Error(`Batch image generation failed: ${error.message}`);
    }
  }
}

// ================================
// SINGLETON INSTANCE
// ================================
const imageService = new ImageService();

// Export functions
export const generateTokenImage = (prompt, tokenName, options) => 
  imageService.generateTokenImage(prompt, tokenName, options);

export const uploadImageToStorage = (imagePath, filename) => 
  imageService.uploadImageToStorage(imagePath, filename);

export const optimizeImage = (imageBuffer, options) => 
  imageService.optimizeImage(imageBuffer, options);

export const generateBatch = (prompts, options) => 
  imageService.generateBatch(prompts, options);

export default imageService;