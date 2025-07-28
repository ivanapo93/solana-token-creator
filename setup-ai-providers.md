# Advanced AI Image Generation Setup Guide

This guide will help you set up multiple AI image generation providers for your SolMeme Creator platform.

## 🚀 Quick Setup Overview

The Advanced AI Image Generation System supports multiple providers:
- **DALL·E 3** (OpenAI) - High quality, reliable
- **Flux** (Replicate) - Fast, creative outputs  
- **Stable Diffusion XL** (Stability AI) - Customizable, cost-effective
- **Midjourney** (Optional) - Artistic, premium quality

## 🔑 API Keys Setup

### 1. OpenAI (DALL·E 3) - **RECOMMENDED**

**Why DALL·E 3?**
- Highest quality meme-style images
- Best prompt understanding
- Reliable and fast generation
- Perfect for token mascots

**Setup Steps:**
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create account and add billing
3. Go to API Keys section
4. Create new API key
5. Add to your environment or `ai-config.js`:
   ```javascript
   apiKeys: {
       openai: 'sk-your-openai-key-here'
   }
   ```

**Pricing:** ~$0.04 per image (1024x1024, HD quality)

### 2. Replicate (Flux) - **FAST & CREATIVE**

**Why Flux?**
- Very fast generation (30-60 seconds)
- Great for experimental/artistic styles
- Good cost-performance ratio
- Excellent for meme content

**Setup Steps:**
1. Visit [replicate.com](https://replicate.com)
2. Sign up and get API token
3. Add billing method
4. Update configuration:
   ```javascript
   apiKeys: {
       replicate: 'r8_your-replicate-token-here'
   }
   ```

**Pricing:** ~$0.02-0.05 per image

### 3. Stability AI (Stable Diffusion XL) - **COST-EFFECTIVE**

**Why Stability AI?**
- Very affordable
- High customization
- Good for bulk generation
- Open source model

**Setup Steps:**
1. Visit [stability.ai](https://platform.stability.ai)
2. Create account and get API key
3. Add credits to account
4. Configure:
   ```javascript
   apiKeys: {
       stabilityai: 'sk-your-stability-key-here'
   }
   ```

**Pricing:** ~$0.01-0.03 per image

### 4. Midjourney (Optional) - **PREMIUM QUALITY**

**Why Midjourney?**
- Highest artistic quality
- Best for premium tokens
- Unique artistic style
- Great for marketing

**Setup Steps:**
1. Requires special integration setup
2. Not directly available via API
3. Consider using third-party services
4. Enable only for premium tokens

## 🔧 Configuration

### Environment Variables (.env)
```bash
# OpenAI (DALL·E)
OPENAI_API_KEY=sk-your-openai-key-here

# Replicate (Flux)
REPLICATE_API_KEY=r8_your-replicate-token-here

# Stability AI
STABILITY_API_KEY=sk-your-stability-key-here

# Optional: Midjourney (if available)
MIDJOURNEY_API_KEY=your-midjourney-key-here
```

### Provider Priority Configuration

Edit `ai-config.js` to set provider priorities:

```javascript
providers: {
    dalle: {
        enabled: true,
        priority: 1,        // Try first
        timeout: 60000      // 60 seconds
    },
    flux: {
        enabled: true,
        priority: 2,        // Try second
        timeout: 180000     // 3 minutes
    },
    stabilityai: {
        enabled: true,
        priority: 3,        // Try third
        timeout: 120000     // 2 minutes
    }
}
```

## 🎨 Advanced Prompt Engineering

The system includes sophisticated prompt engineering:

### Meme-Optimized Prompts
- Automatically detects token themes
- Adds meme-specific style keywords
- Includes quality enhancers
- Applies negative prompts to avoid unwanted elements

### Example Generated Prompt
```
Input: "ToasterDuck" - "A duck that brings breakfast chaos to crypto"

Generated Prompt:
"Create a hilarious meme-style illustration of a bright yellow rubber duck wearing tiny chef's hat sitting inside a chrome toaster with two pieces of bread shaped like golden coins popping out, kitchen countertop background with colorful breakfast items scattered around, vibrant cartoon style, high contrast colors, exaggerated features, memetic visual appeal, ultra-detailed, 4K quality, perfect for social media sharing, funny, absurd, entertaining, viral-worthy. Avoid: blurry, low quality, text overlays, watermarks, generic stock photos, realistic photography, dark or scary themes. The image should clearly represent the 'ToasterDuck' (TDUCK) token concept. Make it viral-worthy, instantly recognizable, and perfect for cryptocurrency marketing"
```

## 🔍 Quality Assessment System

The system automatically selects the best image based on:

### Quality Metrics
- **Provider Reliability** (30%) - Track record and consistency
- **Prompt Relevance** (40%) - How well image matches token concept  
- **Technical Quality** (30%) - Resolution, clarity, composition

### Automatic Selection
1. Generate images from all enabled providers in parallel
2. Score each image using quality metrics
3. Select highest-scoring image
4. Store alternatives for manual review

## 💾 Storage & Uniqueness Tracking

### Supabase Integration (Recommended)

**Enable Supabase for:**
- Token uniqueness verification
- Image storage and CDN delivery
- Generation history tracking
- Performance analytics

**Setup Steps:**
1. Enable Supabase in MCP marketplace
2. Create `generated_tokens` table:
   ```sql
   CREATE TABLE generated_tokens (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       token_name TEXT NOT NULL,
       token_symbol TEXT NOT NULL,
       description TEXT,
       image_url TEXT,
       provider TEXT,
       quality_score JSONB,
       metadata JSONB,
       created_at TIMESTAMP DEFAULT NOW(),
       UNIQUE(token_name, token_symbol)
   );
   ```
3. Create storage bucket for images
4. Configure in `ai-config.js`

### Alternative Storage
- Local file system (development)
- AWS S3 / CloudFlare R2
- Google Cloud Storage
- Any CDN provider

## 🚦 Rate Limiting & Cost Management

### Built-in Rate Limits
```javascript
rateLimits: {
    dalle: {
        requestsPerMinute: 5,
        requestsPerHour: 100
    },
    flux: {
        requestsPerMinute: 3,
        requestsPerHour: 60
    }
}
```

### Cost Optimization
- **Primary Provider**: Use DALL·E for quality
- **Fallback**: Use Flux for speed
- **Bulk Generation**: Use Stability AI
- **Smart Retry**: Avoid unnecessary API calls

## 🧪 Testing Your Setup

### Test Individual Providers
```javascript
// Test DALL·E
const dalleResult = await aiImageGenerator.generateFromProvider('dalle', promptData);

// Test Flux
const fluxResult = await aiImageGenerator.generateFromProvider('flux', promptData);

// Test complete system
const tokenResult = await aiImageGenerator.generateMemeTokenWithImage();
console.log('Generated token:', tokenResult);
```

### Verify Integration
1. Load your webpage
2. Check browser console for: "🎨 Advanced AI Image Generation System initialized"
3. Try generating a token with AI mode
4. Verify image generation in Network tab

## 📊 Monitoring & Analytics

### Generation Statistics
The system tracks:
- Success rates per provider
- Average generation times
- Quality scores
- Cost per image
- Error rates

### Performance Optimization
- Monitor which providers perform best
- Adjust priorities based on success rates
- Implement caching for repeated requests
- Use CDN for faster image delivery

## 🆘 Troubleshooting

### Common Issues

**1. "Provider authentication failed"**
- Check API keys are correct
- Verify billing is set up
- Check rate limits

**2. "All providers failed"**
- Check internet connectivity
- Verify API endpoints are accessible
- Check provider status pages

**3. "Images not displaying"**
- Verify CORS settings
- Check image URLs are valid
- Test CDN configuration

**4. "Poor image quality"**
- Adjust quality thresholds
- Review prompt engineering
- Check provider settings

### Debug Mode
Enable detailed logging:
```javascript
// In browser console
localStorage.setItem('AI_DEBUG', 'true');
location.reload();
```

## 💡 Best Practices

### For Production
1. **Use multiple providers** for redundancy
2. **Cache generated images** to reduce costs
3. **Monitor API usage** and costs
4. **Implement fallbacks** for failures
5. **Store metadata** for analytics

### For Quality
1. **Test prompts extensively** before production
2. **Review generated images** manually
3. **Adjust quality thresholds** based on feedback
4. **Use appropriate providers** for different token types

### For Performance
1. **Generate in parallel** for speed
2. **Use CDN** for image delivery
3. **Implement caching** for repeated requests
4. **Monitor response times** and optimize

## 🔄 Updates & Maintenance

### Regular Tasks
- Update API keys before expiration
- Monitor usage and costs
- Review quality metrics
- Update prompt templates
- Clean up old generated data

### Version Updates
- Check for provider API updates
- Update model versions
- Test new features
- Backup configuration

---

**🎉 You're Ready!**

With this setup, your SolMeme Creator will generate unique, high-quality meme token images automatically using multiple AI providers. The system will select the best image from each generation and ensure every token is unique and engaging.

For support, check the troubleshooting section or enable debug mode for detailed logging.