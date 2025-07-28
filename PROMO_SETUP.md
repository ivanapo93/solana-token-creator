# 🌐 Promotional Website Generator Setup Guide

## Overview

The **Promotional Website Generator** automatically creates and deploys free promotional websites for every coin created on your platform. Each coin gets its own professional website with contract address, trading links, and social sharing features.

## 🚀 Features

- ✅ **Automatic Generation**: Creates promo site for every new coin
- ✅ **Free Hosting**: Uses Netlify/Vercel/GitHub Pages free tiers
- ✅ **Unique URLs**: Each coin gets its own domain/subdomain
- ✅ **Copy-Friendly CA**: One-click contract address copying
- ✅ **Social Ready**: Optimized for Twitter, Discord, Telegram sharing
- ✅ **SEO Optimized**: Rich meta tags for social media previews
- ✅ **Mobile Responsive**: Works perfectly on all devices
- ✅ **Error Handling**: Graceful fallbacks and error reporting

## 📋 Prerequisites

1. **Node.js** v16+ installed
2. **Hosting Platform Account** (choose one):
   - [Netlify](https://netlify.com) (Recommended)
   - [Vercel](https://vercel.com)
   - [GitHub](https://github.com) (for GitHub Pages)
3. **API Keys** from your chosen platform
4. **Custom Domain** (optional but recommended)

## 🔧 Installation

### 1. Install Dependencies

```bash
npm install node-fetch form-data jszip express-rate-limit
```

### 2. Copy Files

Ensure these files are in your project:
- `promo-template.html` - Website template
- `promo-generator.js` - Core generator logic
- `promo-config.js` - Configuration settings
- `promo-backend.js` - Express.js integration

### 3. Environment Variables

Create a `.env` file with your API keys:

```env
# Netlify (Primary - Recommended)
NETLIFY_API_TOKEN=your_netlify_token_here

# Vercel (Fallback)
VERCEL_API_TOKEN=your_vercel_token_here

# GitHub (Fallback)
GITHUB_TOKEN=your_github_token_here

# Optional: Custom domain
PROMO_BASE_DOMAIN=your-domain.com

# Optional: Webhook for notifications
DEPLOYMENT_WEBHOOK_URL=https://your-webhook-url.com

# Optional: Analytics
GA_TRACKING_ID=your_google_analytics_id
```

## 🔑 API Key Setup

### Netlify Setup (Recommended)

1. **Create Account**: Go to [netlify.com](https://netlify.com)
2. **Generate Token**:
   - Go to User Settings → Applications → Personal access tokens
   - Click "New access token"
   - Name it "SolMeme Promo Generator"
   - Copy the token to your `.env` file
3. **Free Limits**: 100 sites, 100GB bandwidth/month

### Vercel Setup (Fallback)

1. **Create Account**: Go to [vercel.com](https://vercel.com)
2. **Generate Token**:
   - Go to Settings → Tokens
   - Create new token
   - Copy to your `.env` file
3. **Free Limits**: 100 deployments/day, unlimited sites

### GitHub Setup (Fallback)

1. **Create Account**: Go to [github.com](https://github.com)
2. **Generate Token**:
   - Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` permissions
   - Copy to your `.env` file
3. **Free Limits**: 1GB storage, 100GB bandwidth/month

## 🛠 Backend Integration

### 1. Express.js Setup

```javascript
const express = require('express');
const { setupPromoMiddleware } = require('./promo-backend');

const app = express();

// Setup promotional website middleware
setupPromoMiddleware(app);

// Your existing routes...

app.listen(3000, () => {
    console.log('Server running with promo generator enabled');
});
```

### 2. Token Creation Integration

Update your token creation endpoint:

```javascript
const { autoGeneratePromoSite } = require('./promo-backend');

app.post('/api/tokens/create', async (req, res) => {
    try {
        // Your existing token creation logic
        const tokenResult = await createToken(req.body);
        
        // Auto-generate promotional website
        const promoResult = await autoGeneratePromoSite(tokenResult);
        
        // Include promo site in response
        res.json({
            ...tokenResult,
            promoSite: promoResult
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

## 🌍 Custom Domain Setup

### Option 1: Subdomain Approach

1. **Configure DNS**: Add wildcard CNAME record
   ```
   *.promo.yourdomain.com → netlify.com
   ```

2. **Update Config**:
   ```javascript
   baseDomain: 'promo.yourdomain.com'
   ```

3. **Results**: Sites like `dogecoin-abc123.promo.yourdomain.com`

### Option 2: Path Approach

1. **Configure DNS**: Point domain to hosting platform
   ```
   promo.yourdomain.com → netlify.com
   ```

2. **URL Structure**: `promo.yourdomain.com/dogecoin-abc123`

### Option 3: Use Platform Domains

1. **No setup required**
2. **Netlify**: `site-name.netlify.app`
3. **Vercel**: `site-name.vercel.app`
4. **GitHub**: `username.github.io/repo-name`

## 🧪 Testing

### 1. Test Configuration

```bash
node -e "
const { validateConfig } = require('./promo-config');
const result = validateConfig();
console.log('Config valid:', result.valid);
if (!result.valid) console.log('Errors:', result.errors);
if (result.warnings.length) console.log('Warnings:', result.warnings);
"
```

### 2. Test Generation

```javascript
const PromoWebsiteGenerator = require('./promo-generator');

const generator = new PromoWebsiteGenerator({
    deploymentService: 'netlify',
    apiKeys: { netlify: process.env.NETLIFY_API_TOKEN }
});

const testCoin = {
    name: 'Test Coin',
    symbol: 'TEST',
    description: 'A test meme coin for testing purposes',
    contractAddress: '11111111111111111111111111111111',
    imageUrl: 'https://via.placeholder.com/200'
};

generator.generatePromoSite(testCoin)
    .then(result => console.log('Test result:', result))
    .catch(error => console.error('Test error:', error));
```

### 3. Frontend Testing

1. **Create a test token** through your interface
2. **Check console** for promo generation logs
3. **Verify URL** opens and displays correctly
4. **Test sharing** buttons work properly

## 📊 Monitoring

### Health Check Endpoint

```bash
curl http://localhost:3000/api/promo/health
```

Expected response:
```json
{
    "status": "healthy",
    "config": { "valid": true },
    "stats": { "totalDeployments": 5 },
    "services": { "primary": "netlify" }
}
```

### Deployment Status

```bash
curl http://localhost:3000/api/promo/status/SITE_ID
```

### List All Deployments

```bash
curl http://localhost:3000/api/promo/deployments
```

## 🔧 Configuration Options

### Deployment Settings

```javascript
// promo-config.js
deployment: {
    primaryService: 'netlify',        // Primary hosting service
    fallbackServices: ['vercel'],     // Fallback options
    baseDomain: 'solmeme.site',       // Your custom domain
    deploymentTimeout: 300000,        // 5 minutes
    maxRetries: 3                     // Retry attempts
}
```

### Rate Limiting

```javascript
rateLimiting: {
    maxDeploymentsPerHour: 10,        // Limit per hour
    deploymentCooldown: 60000,        // 1 minute between deployments
    trackByIP: true                   // Track by IP address
}
```

### Template Customization

1. **Colors**: Edit CSS variables in `promo-template.html`
2. **Content**: Modify HTML structure
3. **Branding**: Add your logo and branding
4. **Features**: Add/remove sections as needed

## 🚨 Troubleshooting

### Common Issues

#### "Missing API key" Error
```bash
# Check environment variables
echo $NETLIFY_API_TOKEN
echo $VERCEL_API_TOKEN
```

#### "Template file not found"
```bash
# Verify file exists
ls -la promo-template.html
```

#### "Deployment timeout"
- Check internet connection
- Verify API key permissions
- Try fallback service

#### "Invalid contract address"
- Ensure 32-44 character Solana address format
- Check for special characters

### Debug Mode

Enable detailed logging:
```javascript
// In promo-config.js
monitoring: {
    enableLogging: true,
    logLevel: 'debug'
}
```

### Service Status

Check hosting platform status:
- [Netlify Status](https://netlifystatus.com)
- [Vercel Status](https://vercel-status.com)
- [GitHub Status](https://githubstatus.com)

## 📈 Scaling Considerations

### High Volume Deployments

1. **Multiple API Keys**: Rotate between multiple accounts
2. **Load Balancing**: Distribute across services
3. **Queue System**: Implement Redis queue for large volumes
4. **Caching**: Cache generated content

### Performance Optimization

1. **Template Caching**: Cache populated templates
2. **Image Optimization**: Compress images before deployment
3. **CDN**: Use CDN for static assets
4. **Monitoring**: Track generation times

## 🔒 Security Best Practices

### API Key Management

1. **Environment Variables**: Never commit API keys
2. **Key Rotation**: Regularly rotate API keys
3. **Least Privilege**: Use tokens with minimal required permissions
4. **Monitoring**: Monitor API usage for anomalies

### Input Validation

1. **Sanitization**: Clean all user inputs
2. **Contract Validation**: Verify Solana address format
3. **Rate Limiting**: Prevent abuse
4. **CORS**: Configure proper CORS settings

## 🎯 Production Checklist

- [ ] API keys configured and tested
- [ ] Custom domain setup (if using)
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Monitoring enabled
- [ ] Backup service configured
- [ ] SSL certificates validated
- [ ] Social sharing tested
- [ ] Mobile responsiveness verified
- [ ] SEO meta tags working

## 📞 Support

### Getting Help

1. **Check Logs**: Review server logs for errors
2. **Test Endpoints**: Use health check and status endpoints
3. **Platform Docs**: Consult hosting platform documentation
4. **Community**: Ask on Solana Discord or GitHub

### Reporting Issues

When reporting issues, include:
- Error messages
- Configuration (without API keys)
- Steps to reproduce
- Platform versions
- Deployment logs

---

## 🎉 Success!

Once set up, every new token will automatically get:

1. ✅ **Professional website** with contract address
2. ✅ **Unique URL** for sharing
3. ✅ **Social media optimization**
4. ✅ **Mobile-responsive design**
5. ✅ **Free hosting** on reliable platforms

Your users will love having professional promotional websites for their tokens at no extra cost!

**Generated websites include:**
- Token name, symbol, and description
- Copy-friendly contract address
- Links to Solscan, DexScreener, and Raydium
- Social sharing buttons
- SEO-optimized meta tags
- Professional design and animations

**Built for Scale • Production Ready • Completely Free for Users**