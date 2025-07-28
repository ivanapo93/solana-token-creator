# 🚀 Production Deployment Checklist
## Promotional Website Generator - Final Setup

Use this checklist to ensure your promotional website generator is properly configured and ready for production deployment.

## 📋 Pre-Deployment Checklist

### ✅ Backend Infrastructure

- [ ] **Supabase MCP Tool Enabled**
  - [ ] Enabled Supabase in MCP marketplace
  - [ ] Supabase account created
  - [ ] Project created with database
  - [ ] All database tables created (see `BACKEND_SETUP_GUIDE.md`)
  - [ ] Row Level Security (RLS) policies configured
  - [ ] API keys copied from project settings

- [ ] **API Keys Obtained**
  - [ ] Netlify API token generated and tested
  - [ ] Vercel API token generated and tested (optional)
  - [ ] GitHub personal access token generated and tested (optional)
  - [ ] All tokens have correct permissions

- [ ] **Environment Configuration**
  - [ ] `.env` file created from `.env.example`
  - [ ] All required environment variables configured
  - [ ] Environment variables secured (not in version control)
  - [ ] Production environment variables set on hosting platform

### ✅ File Structure

- [ ] **Core Files Present**
  - [ ] `promo-template.html` - Original template
  - [ ] `promo-template-branded.html` - Customized template
  - [ ] `promo-generator.js` - Core generation logic
  - [ ] `promo-config.js` - Configuration management
  - [ ] `promo-backend.js` - Express.js integration
  - [ ] `supabase-client.js` - Database client
  - [ ] `setup-validator.js` - Validation script

- [ ] **Dependencies Installed**
  - [ ] `npm install` completed successfully
  - [ ] All promotional website dependencies present
  - [ ] No dependency conflicts or warnings

### ✅ Configuration Validation

- [ ] **Run Setup Validator**
  ```bash
  npm run validate-setup
  ```
  - [ ] All environment variables validated
  - [ ] Supabase connection tested
  - [ ] API keys verified
  - [ ] File structure confirmed
  - [ ] Template syntax validated
  - [ ] No critical errors reported

- [ ] **Manual Tests**
  - [ ] Supabase dashboard accessible
  - [ ] Database tables visible and queryable
  - [ ] API endpoints respond correctly
  - [ ] Template placeholders work correctly

### ✅ Branding Customization

- [ ] **Template Customization**
  - [ ] Colors updated to match your brand
  - [ ] Platform name configured in environment
  - [ ] Platform URL configured
  - [ ] Logo/branding elements added
  - [ ] Social sharing messages customized

- [ ] **Domain Configuration**
  - [ ] Custom domain purchased (if using)
  - [ ] DNS configured for promotional sites
  - [ ] SSL certificates configured
  - [ ] Subdomain wildcard setup (if using subdomains)

## 🔧 Configuration Summary

### Required Environment Variables
```bash
# Essential for basic functionality
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NETLIFY_API_TOKEN=your-netlify-token
PROMO_BASE_DOMAIN=your-domain.com
PLATFORM_NAME=Your Platform Name
PLATFORM_URL=https://your-platform.com
```

### Recommended Optional Variables
```bash
# For enhanced functionality
VERCEL_API_TOKEN=your-vercel-token
GITHUB_TOKEN=your-github-token
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
WEBHOOK_URL=https://your-webhook-url.com
```

## 🧪 Testing Procedures

### 1. Backend Validation
```bash
# Run complete validation
npm run validate-setup

# Expected output: All green checkmarks, no critical errors
```

### 2. API Endpoint Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/promo/health

# Expected: {"status":"healthy","timestamp":"..."}
```

### 3. Database Connection Testing
```bash
# Test Supabase connection
node -e "
const { initializeSupabase } = require('./supabase-client');
initializeSupabase().then(() => console.log('✅ Success')).catch(console.error);
"
```

### 4. Template Generation Testing
Create a test promotional website:
```bash
# Test template generation
node -e "
const generator = require('./promo-generator');
const testCoin = {
  name: 'Test Coin',
  symbol: 'TEST',
  description: 'A test token for validation',
  contractAddress: '11111111111111111111111111111111',
  imageUrl: 'https://via.placeholder.com/200'
};
// Test template population
console.log('Testing template generation...');
"
```

## 🚀 Deployment Steps

### 1. Start Production Server
```bash
# Install dependencies
npm install

# Validate setup
npm run validate-setup

# Start server
npm start
```

### 2. Verify Promotional Website Generation

1. **Create a test token** through your main application
2. **Monitor server logs** for promotional website generation
3. **Check database** for deployment record
4. **Test generated URL** opens correctly
5. **Verify social sharing** works on all platforms

### 3. Monitor System Health

```bash
# Check health endpoint
curl http://localhost:3000/api/promo/health

# Check deployment statistics
curl http://localhost:3000/api/promo/deployments
```

## 🔍 Troubleshooting Guide

### Common Issues & Solutions

#### "Supabase connection failed"
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify in Supabase dashboard:
# 1. Project is active
# 2. Database is running
# 3. Tables exist
# 4. API keys are correct
```

#### "API key invalid"
```bash
# Test each API key individually
curl -H "Authorization: Bearer $NETLIFY_API_TOKEN" https://api.netlify.com/api/v1/user
curl -H "Authorization: Bearer $VERCEL_API_TOKEN" https://api.vercel.com/v1/user
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

#### "Template generation failed"
```bash
# Check template files exist
ls -la promo-template*.html

# Validate template syntax
npm run validate-setup
```

#### "Deployment timeout"
```bash
# Check network connectivity
ping netlify.com
ping vercel.com
ping github.com

# Increase timeout in environment
export DEPLOYMENT_TIMEOUT_MS=600000
```

## 📊 Monitoring & Maintenance

### Daily Checks
- [ ] Monitor deployment success rate
- [ ] Check error logs for issues
- [ ] Verify API quota usage
- [ ] Review promotional website performance

### Weekly Maintenance
- [ ] Update deployment statistics
- [ ] Clean up old deployment records
- [ ] Review and rotate API keys if needed
- [ ] Monitor hosting platform limits

### Monthly Reviews
- [ ] Analyze promotional website analytics
- [ ] Review and optimize template performance
- [ ] Update dependencies and security patches
- [ ] Review and adjust rate limiting if needed

## 🎯 Success Metrics

Your promotional website generator is working correctly when:

✅ **Token Creation Flow**
- Users create tokens successfully
- Promotional websites generate automatically
- No errors in server logs
- Users receive promotional website URLs

✅ **Website Quality**
- All promotional websites load correctly
- Contract addresses copy properly
- Social sharing works on all platforms
- Mobile responsiveness verified

✅ **System Performance**
- Sub-30 second generation time
- 99%+ deployment success rate
- No API rate limit errors
- Database queries complete quickly

✅ **User Experience**
- Zero additional steps for users
- Professional website appearance
- Easy social media sharing
- Clear contract address display

## 🎉 Production Ready!

Once all items in this checklist are complete, your promotional website generator is ready for production use. Your users will now automatically receive professional promotional websites for every token they create!

### Final Verification Commands

```bash
# Complete system check
npm run validate-setup

# Start production server
npm start

# Test health endpoint
curl http://localhost:3000/api/promo/health

# Monitor logs
tail -f logs/app.log
```

### Go Live!

1. ✅ Deploy your server to production
2. ✅ Update DNS records if using custom domain
3. ✅ Create your first real token to test
4. ✅ Monitor promotional website generation
5. ✅ Celebrate! 🎉

Your users now get completely free, professional promotional websites for every token they create - a unique competitive advantage in the Solana token creation space!