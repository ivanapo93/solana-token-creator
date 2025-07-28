# 🚀 Complete Backend Setup Guide
## Promotional Website Generator Production Environment

This guide will walk you through setting up the complete backend environment for the automatic promotional website generator system.

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Access to Youware platform settings
- [ ] Email accounts for creating service accounts
- [ ] Credit card for platform verification (most services offer generous free tiers)
- [ ] Domain name (optional but recommended for custom branding)

---

## 🗄️ Step 1: Enable Supabase Backend

### Why Supabase?
Supabase provides essential backend functionality for the promotional website system:
- **Database Storage**: Track all generated promotional websites
- **Real-time Updates**: Monitor deployment status
- **User Authentication**: Secure API access
- **Built-in APIs**: REST and GraphQL endpoints
- **Generous Free Tier**: 500MB database, 50MB file storage

### ⚠️ IMPORTANT: Enable Supabase First

**You need to enable the Supabase MCP tool before proceeding:**

1. **Access MCP Marketplace**: Go to the MCP tools marketplace in your Youware platform
2. **Find Supabase**: Look for the Supabase tool in the available tools list
3. **Enable Supabase**: Click to enable the Supabase integration
4. **Configure Connection**: Follow the prompts to connect your Supabase account

**This is CRITICAL** - the promotional website system requires database functionality that only works with Supabase enabled.

### Supabase Account Setup

Once enabled in MCP marketplace:

1. **Create Account**: Visit [supabase.com](https://supabase.com) and sign up
2. **Create Project**: 
   - Project name: `solmeme-promo-sites`
   - Database password: Generate a strong password
   - Region: Choose closest to your users
3. **Get Credentials**: Copy these values from Project Settings → API:
   - Project URL
   - Anon public key
   - Service role key (keep this secret!)

---

## 🗃️ Step 2: Database Schema Setup

### Required Tables

You'll need these tables in Supabase for the promotional website system:

#### Table 1: `promo_deployments`
```sql
CREATE TABLE promo_deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id VARCHAR(100) UNIQUE NOT NULL,
    coin_name VARCHAR(100) NOT NULL,
    coin_symbol VARCHAR(20) NOT NULL,
    contract_address VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    deployment_id VARCHAR(100),
    platform VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'deployed',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_promo_deployments_site_id ON promo_deployments(site_id);
CREATE INDEX idx_promo_deployments_symbol ON promo_deployments(coin_symbol);
CREATE INDEX idx_promo_deployments_created ON promo_deployments(created_at);
```

#### Table 2: `deployment_stats`
```sql
CREATE TABLE deployment_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_deployments INTEGER DEFAULT 0,
    successful_deployments INTEGER DEFAULT 0,
    failed_deployments INTEGER DEFAULT 0,
    platform_usage JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date)
);
```

#### Table 3: `api_usage_logs`
```sql
CREATE TABLE api_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    endpoint VARCHAR(100),
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for monitoring queries
CREATE INDEX idx_api_usage_platform_date ON api_usage_logs(platform, created_at);
```

### Row Level Security (RLS)

Enable RLS for security:

```sql
-- Enable RLS
ALTER TABLE promo_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your authentication needs)
CREATE POLICY "Allow all operations for authenticated users" ON promo_deployments
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access for service role" ON deployment_stats
    FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "Allow all operations for service role" ON api_usage_logs
    FOR ALL USING (auth.role() = 'service_role');
```

---

## 🔑 Step 3: Hosting Platform API Keys

### 3.1 Netlify Setup (Primary Recommended)

**Step-by-Step Netlify Configuration:**

1. **Create Account**:
   - Go to [netlify.com](https://netlify.com)
   - Sign up with email or GitHub
   - Verify your email address

2. **Generate API Token**:
   - Click your avatar → User settings
   - Go to "Applications" tab
   - Scroll to "Personal access tokens"
   - Click "New access token"
   - Name: `SolMeme Promo Generator`
   - Expiration: Never (or 1 year for security)
   - Copy the token immediately (it won't be shown again)

3. **Free Tier Limits**:
   - 100 sites per account
   - 100GB bandwidth per month
   - 300 build minutes per month
   - Custom domains supported

4. **Test the Token**:
```bash
curl -H "Authorization: Bearer YOUR_NETLIFY_TOKEN" \
     https://api.netlify.com/api/v1/user
```

### 3.2 Vercel Setup (Fallback)

**Step-by-Step Vercel Configuration:**

1. **Create Account**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub, GitLab, or Bitbucket
   - Complete account verification

2. **Generate API Token**:
   - Go to Settings → Tokens
   - Click "Create Token"
   - Name: `SolMeme Promo Generator`
   - Scope: Full Account
   - Expiration: No expiration
   - Copy the token

3. **Free Tier Limits**:
   - 100 deployments per day
   - Unlimited static sites
   - 100GB bandwidth per month
   - Custom domains supported

4. **Test the Token**:
```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
     https://api.vercel.com/v1/user
```

### 3.3 GitHub Pages Setup (Secondary Fallback)

**Step-by-Step GitHub Configuration:**

1. **Create Account**:
   - Go to [github.com](https://github.com)
   - Sign up and verify email
   - Enable 2FA for security

2. **Generate Personal Access Token**:
   - Go to Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Name: `SolMeme Promo Generator`
   - Expiration: No expiration (or 1 year)
   - Scopes needed:
     - `repo` (Full control of private repositories)
     - `workflow` (Update GitHub Action workflows)
   - Copy the token

3. **Free Tier Limits**:
   - Unlimited public repositories
   - 1GB storage per repository
   - 100GB bandwidth per month
   - Custom domains supported

4. **Test the Token**:
```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
     https://api.github.com/user
```

---

## 🌍 Step 4: Environment Configuration

### 4.1 Create Environment File

Create a `.env` file in your project root:

```env
# ================================
# PROMOTIONAL WEBSITE GENERATOR
# PRODUCTION ENVIRONMENT CONFIG
# ================================

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Primary Hosting Service (Netlify Recommended)
NETLIFY_API_TOKEN=your-netlify-token-here

# Fallback Hosting Services
VERCEL_API_TOKEN=your-vercel-token-here
GITHUB_TOKEN=your-github-token-here

# Domain Configuration
PROMO_BASE_DOMAIN=your-domain.com
# Example: solmeme.site (results in coin-abc123.solmeme.site)

# Deployment Configuration
PRIMARY_DEPLOYMENT_SERVICE=netlify
FALLBACK_SERVICES=vercel,github
MAX_DEPLOYMENTS_PER_HOUR=50
DEPLOYMENT_TIMEOUT_MS=300000

# Monitoring and Logging
ENABLE_DETAILED_LOGGING=true
LOG_LEVEL=info
WEBHOOK_URL=https://your-webhook-endpoint.com/notifications

# Security
JWT_SECRET=your-super-secret-jwt-key-here
API_RATE_LIMIT_PER_HOUR=100

# Optional: Analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
ENABLE_ANALYTICS=false

# Optional: Email Notifications
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
NOTIFICATION_EMAIL=admin@your-domain.com

# Development/Production Environment
NODE_ENV=production
PORT=3000
```

### 4.2 Environment Security

**CRITICAL SECURITY NOTES:**

1. **Never commit `.env` to version control**:
```bash
echo ".env" >> .gitignore
```

2. **Use environment variables in production**:
   - Netlify: Site settings → Environment variables
   - Vercel: Project settings → Environment Variables
   - VPS: Use systemd environment files

3. **Rotate API keys regularly** (every 3-6 months)

4. **Use principle of least privilege** for API permissions

---

## 🎨 Step 5: Template Customization & Branding

### 5.1 Color Scheme Customization

Edit `promo-template.html` to match your brand:

```css
<!-- Update the CSS variables in the <style> section -->
<style>
    :root {
        /* Primary Brand Colors */
        --primary-color: #your-primary-color;    /* Replace with your brand primary */
        --secondary-color: #your-secondary-color; /* Replace with your brand secondary */
        --accent-color: #your-accent-color;      /* Replace with your brand accent */
        
        /* Example SolMeme Colors */
        --primary-color: #667eea;   /* Purple-blue */
        --secondary-color: #764ba2;  /* Deep purple */
        --accent-color: #f093fb;     /* Pink accent */
        
        /* Additional Brand Colors */
        --success-color: #10b981;    /* Green for success messages */
        --warning-color: #f59e0b;    /* Yellow for warnings */
        --error-color: #ef4444;      /* Red for errors */
        --text-primary: #1f2937;     /* Dark text */
        --text-secondary: #6b7280;   /* Light text */
    }
    
    /* Update gradient backgrounds */
    .gradient-bg {
        background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    }
    
    /* Update text gradients */
    .gradient-text {
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
```

### 5.2 Logo and Branding

Replace placeholder content with your branding:

```html
<!-- Update the header section in promo-template.html -->
<div class="text-center mb-12">
    <!-- Add your logo -->
    <div class="mb-6">
        <img src="{{PLATFORM_LOGO_URL}}" alt="Your Platform Logo" class="mx-auto h-12 w-auto mb-4">
        <p class="text-white opacity-80 text-sm">Powered by Your Platform Name</p>
    </div>
    
    <!-- Coin Image (this stays dynamic) -->
    <div class="mb-8">
        <img src="{{COIN_IMAGE_URL}}" alt="{{COIN_NAME}} Logo" class="coin-image floating mx-auto w-32 h-32 md:w-48 md:h-48 object-cover">
    </div>
    
    <!-- Rest of the template... -->
</div>
```

### 5.3 Footer Customization

Update the footer with your platform information:

```html
<!-- Update footer section -->
<div class="mt-12 text-center">
    <p class="text-white opacity-60 text-sm">
        Created with 💜 on Solana • Generated by Your Platform Name
    </p>
    <p class="text-white opacity-40 text-xs mt-2">
        {{GENERATION_DATE}} • <a href="https://your-platform.com" class="hover:opacity-60">Visit Your Platform</a>
    </p>
</div>
```

### 5.4 Social Media Branding

Update sharing messages to include your platform name:

```javascript
// Update the sharing functions in promo-template.html
function shareOnTwitter() {
    const resultName = document.getElementById('resultName').textContent;
    const resultSymbol = document.getElementById('resultSymbol').textContent;
    const promoUrl = document.getElementById('promoWebsiteUrl').textContent;
    
    const text = `🚀 Check out ${resultName} ($${resultSymbol}) created on YourPlatform! ${promoUrl} #Solana #YourPlatform #Crypto`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    window.open(twitterUrl, '_blank');
}
```

---

## ⚙️ Step 6: Production Configuration Updates

### 6.1 Update Promo Config

Edit `promo-config.js` with your production settings:

```javascript
const PROMO_CONFIG = {
    // Update deployment settings
    deployment: {
        primaryService: process.env.PRIMARY_DEPLOYMENT_SERVICE || 'netlify',
        fallbackServices: (process.env.FALLBACK_SERVICES || 'vercel,github').split(','),
        baseDomain: process.env.PROMO_BASE_DOMAIN || 'your-domain.com',
        deploymentTimeout: parseInt(process.env.DEPLOYMENT_TIMEOUT_MS) || 300000,
        maxRetries: 3
    },
    
    // Update API keys from environment
    apiKeys: {
        netlify: process.env.NETLIFY_API_TOKEN || '',
        vercel: process.env.VERCEL_API_TOKEN || '',
        github: process.env.GITHUB_TOKEN || ''
    },
    
    // Update storage to use Supabase
    storage: {
        provider: 'supabase',
        supabase: {
            url: process.env.SUPABASE_URL || '',
            key: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            table: 'promo_deployments'
        }
    },
    
    // Update rate limiting
    rateLimiting: {
        maxDeploymentsPerHour: parseInt(process.env.MAX_DEPLOYMENTS_PER_HOUR) || 50,
        deploymentCooldown: 60000, // 1 minute
        trackByIP: true
    }
};
```

### 6.2 Supabase Integration

Create a new file `supabase-client.js`:

```javascript
/**
 * Supabase Client Configuration
 * For promotional website system integration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Database operations for promotional websites
 */
class SupabasePromoManager {
    
    // Store deployment information
    async storeDeployment(deploymentData) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .insert([{
                site_id: deploymentData.siteId,
                coin_name: deploymentData.coinData.name,
                coin_symbol: deploymentData.coinData.symbol,
                contract_address: deploymentData.coinData.contractAddress,
                url: deploymentData.url,
                deployment_id: deploymentData.deploymentId,
                platform: deploymentData.platform,
                status: 'deployed',
                metadata: {
                    imageUrl: deploymentData.coinData.imageUrl,
                    description: deploymentData.coinData.description,
                    generatedAt: deploymentData.generatedAt
                }
            }]);
        
        if (error) {
            console.error('Error storing deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // Get deployment by site ID
    async getDeployment(siteId) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('*')
            .eq('site_id', siteId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // Not found error
            console.error('Error getting deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // List all deployments with pagination
    async listDeployments(limit = 50, offset = 0) {
        const { data, error, count } = await supabase
            .from('promo_deployments')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        
        if (error) {
            console.error('Error listing deployments:', error);
            throw error;
        }
        
        return { deployments: data, total: count };
    }
    
    // Update deployment status
    async updateDeploymentStatus(siteId, status) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .update({ 
                status,
                updated_at: new Date().toISOString()
            })
            .eq('site_id', siteId);
        
        if (error) {
            console.error('Error updating deployment status:', error);
            throw error;
        }
        
        return data;
    }
    
    // Delete deployment record
    async deleteDeployment(siteId) {
        const { data, error } = await supabase
            .from('promo_deployments')
            .delete()
            .eq('site_id', siteId);
        
        if (error) {
            console.error('Error deleting deployment:', error);
            throw error;
        }
        
        return data;
    }
    
    // Log API usage for monitoring
    async logApiUsage(platform, endpoint, statusCode, responseTime, errorMessage = null) {
        const { error } = await supabase
            .from('api_usage_logs')
            .insert([{
                platform,
                endpoint,
                status_code: statusCode,
                response_time_ms: responseTime,
                error_message: errorMessage
            }]);
        
        if (error) {
            console.error('Error logging API usage:', error);
        }
    }
    
    // Get deployment statistics
    async getDeploymentStats(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
            .from('promo_deployments')
            .select('platform, status, created_at')
            .gte('created_at', startDate.toISOString());
        
        if (error) {
            console.error('Error getting deployment stats:', error);
            throw error;
        }
        
        // Process stats
        const stats = {
            total: data.length,
            successful: data.filter(d => d.status === 'deployed').length,
            failed: data.filter(d => d.status === 'failed').length,
            platformBreakdown: {}
        };
        
        data.forEach(deployment => {
            stats.platformBreakdown[deployment.platform] = 
                (stats.platformBreakdown[deployment.platform] || 0) + 1;
        });
        
        return stats;
    }
}

module.exports = {
    supabase,
    SupabasePromoManager
};
```

---

## 🧪 Step 7: Testing & Validation

### 7.1 Environment Validation

Create a test script `test-setup.js`:

```javascript
const { validateConfig } = require('./promo-config');
const { SupabasePromoManager } = require('./supabase-client');

async function validateSetup() {
    console.log('🧪 Testing Promotional Website Generator Setup...\n');
    
    // Test configuration
    console.log('1. Testing configuration...');
    const configResult = validateConfig();
    if (configResult.valid) {
        console.log('✅ Configuration is valid');
    } else {
        console.log('❌ Configuration errors:', configResult.errors);
        return false;
    }
    
    // Test Supabase connection
    console.log('\n2. Testing Supabase connection...');
    try {
        const promoManager = new SupabasePromoManager();
        const stats = await promoManager.getDeploymentStats(1);
        console.log('✅ Supabase connection successful');
    } catch (error) {
        console.log('❌ Supabase connection failed:', error.message);
        return false;
    }
    
    // Test API keys
    console.log('\n3. Testing API keys...');
    const apis = [
        { name: 'Netlify', token: process.env.NETLIFY_API_TOKEN, url: 'https://api.netlify.com/api/v1/user' },
        { name: 'Vercel', token: process.env.VERCEL_API_TOKEN, url: 'https://api.vercel.com/v1/user' },
        { name: 'GitHub', token: process.env.GITHUB_TOKEN, url: 'https://api.github.com/user' }
    ];
    
    for (const api of apis) {
        if (api.token) {
            try {
                const response = await fetch(api.url, {
                    headers: {
                        'Authorization': api.name === 'GitHub' ? `token ${api.token}` : `Bearer ${api.token}`
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ ${api.name} API key is valid`);
                } else {
                    console.log(`❌ ${api.name} API key is invalid (${response.status})`);
                }
            } catch (error) {
                console.log(`❌ ${api.name} API test failed:`, error.message);
            }
        } else {
            console.log(`⚠️ ${api.name} API key not configured`);
        }
    }
    
    console.log('\n✅ Setup validation complete!');
    return true;
}

// Run validation
validateSetup().catch(console.error);
```

### 7.2 Run Setup Test

```bash
# Install required dependencies first
npm install @supabase/supabase-js node-fetch

# Run the validation test
node test-setup.js
```

---

## 📋 Step 8: Production Deployment Checklist

### Pre-Deployment Checklist

- [ ] **Supabase Enabled**: MCP tool activated and configured
- [ ] **Database Schema**: All tables created with proper indexes and RLS
- [ ] **API Keys Obtained**: Netlify, Vercel, and GitHub tokens generated
- [ ] **Environment Variables**: `.env` file configured with all required values
- [ ] **Template Customized**: Branding, colors, and logos updated
- [ ] **Supabase Integration**: Database client configured and tested
- [ ] **Security Settings**: Row Level Security enabled, API keys secured
- [ ] **Rate Limiting**: Proper limits configured for production load
- [ ] **Monitoring**: Logging and webhook notifications configured
- [ ] **Testing**: All components validated with test script

### Security Checklist

- [ ] **Environment Variables**: Never committed to version control
- [ ] **API Keys**: Stored securely in environment variables
- [ ] **Database Access**: RLS policies properly configured
- [ ] **HTTPS Only**: All API calls use HTTPS
- [ ] **Input Validation**: All user inputs properly sanitized
- [ ] **Rate Limiting**: Protection against abuse enabled
- [ ] **Error Handling**: Sensitive information not exposed in errors
- [ ] **Access Logs**: API usage properly logged for monitoring

### Performance Checklist

- [ ] **Database Indexes**: Proper indexes on frequently queried columns
- [ ] **Connection Pooling**: Database connections properly managed
- [ ] **Caching**: Template caching implemented where possible
- [ ] **Error Retry Logic**: Automatic retries with exponential backoff
- [ ] **Monitoring**: Performance metrics being tracked
- [ ] **Scaling**: Rate limits appropriate for expected load

---

## 🎉 You're Ready for Production!

Once you complete all steps above, your promotional website generator will be fully configured for production use with:

✅ **Robust Database**: Supabase backend with proper schema and security
✅ **Multi-Platform Deployment**: Netlify, Vercel, and GitHub integration
✅ **Custom Branding**: Template customized with your brand identity
✅ **Production Security**: Proper API key management and access controls
✅ **Monitoring & Logging**: Complete visibility into system performance
✅ **Scalable Architecture**: Ready to handle thousands of token creations

Your users will now get completely free, professional promotional websites for every token they create!

## 🆘 Need Help?

If you encounter issues:
1. Check the validation test results
2. Verify all environment variables are set
3. Ensure Supabase is properly enabled in MCP marketplace
4. Test API keys individually
5. Check service status pages for outages

The system is designed to be resilient with fallbacks, so even if one service fails, others will take over automatically.