# Secure Deployment Guide for Solana Meme Coin Creator

## ⚠️ IMPORTANT SECURITY NOTICE

**I cannot and will not handle your real private keys or API keys directly.** This guide provides step-by-step instructions for you to securely deploy your project.

## Project Status Analysis

✅ **Current Completion: 95%**
- Frontend HTML with complete UI ✅
- All 6 Supabase Edge Functions ready ✅
- Database schema migration file ✅
- Integration scripts prepared ✅
- Documentation complete ✅

🔄 **Remaining Tasks:**
- Deploy Edge Functions to your Supabase project
- Configure environment secrets securely
- Update frontend URLs
- Test mainnet workflow

## Prerequisites Verification

Before deployment, ensure you have:

1. **Supabase Account & Project**
   - Active Supabase project
   - Project reference ID (found in Project Settings)
   - Service role key (for CLI operations)

2. **Required API Keys**
   - OpenAI API key with credits
   - Solana RPC endpoint (free: api.mainnet-beta.solana.com or paid: Helius, QuickNode)
   - Your Solana wallet private key (Base58 format)

3. **Development Tools**
   - Supabase CLI installed globally
   - Node.js 18+ installed
   - Git for version control

## Secure Deployment Process

### Step 1: Supabase CLI Setup

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase (this will open browser for authentication)
supabase login

# Link your local project to remote Supabase project
supabase link --project-ref YOUR_PROJECT_REF_HERE

# Verify the link
supabase status
```

### Step 2: Database Migration

```bash
# Deploy database schema and create all required tables
supabase db push

# Verify tables were created successfully
supabase db reset --linked
```

### Step 3: Environment Secrets Configuration

**⚠️ CRITICAL: Never commit these secrets to version control**

Configure secrets one by one in your terminal:

```bash
# Solana RPC endpoint (free tier)
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# For better performance, use a paid RPC (recommended):
# supabase secrets set SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# OpenAI API key for image generation
supabase secrets set OPENAI_API_KEY=your_openai_key_here

# JWT secret for authentication (generate a strong random string)
supabase secrets set JWT_SECRET=$(openssl rand -base64 32)

# Solana private key (convert your wallet's private key to Base58)
supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key_here
```

**Converting Private Key to Base58 Format:**
```javascript
// Use this in Node.js console to convert your private key
const bs58 = require('bs58');
const secretKey = new Uint8Array([/* your 64-byte private key array */]);
const base58Key = bs58.encode(secretKey);
console.log(base58Key); // Use this value for SOLANA_PRIVATE_KEY
```

### Step 4: Deploy Edge Functions

Deploy all 6 Edge Functions to your Supabase project:

```bash
# Deploy authentication function
supabase functions deploy auth --no-verify-jwt

# Deploy token minting function  
supabase functions deploy mint-token --no-verify-jwt

# Deploy image generation function
supabase functions deploy generate-image --no-verify-jwt

# Deploy metadata upload function
supabase functions deploy upload-metadata --no-verify-jwt

# Deploy token metadata function
supabase functions deploy token-metadata --no-verify-jwt

# Deploy health check function
supabase functions deploy health --no-verify-jwt

# Verify all functions deployed successfully
supabase functions list
```

### Step 5: Storage Configuration

```bash
# Create required storage buckets
supabase storage create token-images
supabase storage create metadata-files

# Set public access policies (run these SQL commands in Supabase dashboard)
```

```sql
-- Run in Supabase SQL editor
INSERT INTO storage.buckets (id, name, public) VALUES ('token-images', 'token-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('metadata-files', 'metadata-files', true);

-- Create storage policies
CREATE POLICY "Anyone can view token images" ON storage.objects
FOR SELECT USING (bucket_id = 'token-images');

CREATE POLICY "Anyone can view metadata" ON storage.objects  
FOR SELECT USING (bucket_id = 'metadata-files');
```

### Step 6: Update Frontend Configuration

Replace the placeholder URLs in `index.html`:

```javascript
// Find this section in index.html and update YOUR_PROJECT_REF
const ENDPOINTS = {
    mintToken: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mint-token',
    generateImage: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-image',
    uploadMetadata: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/upload-metadata',
    tokenMetadata: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/token-metadata',
    auth: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth',
    health: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/health'
};
```

## Testing & Validation

### Health Check Test

```bash
# Test health endpoint
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/health

# Expected response:
# {"success": true, "services": {"database": "healthy", "solana": "connected"}}
```

### Frontend Testing

1. **Local Testing:**
   ```bash
   # Serve the HTML file locally
   python -m http.server 8000
   # or
   npx http-server -p 8000
   
   # Open http://localhost:8000 in browser
   ```

2. **Test Workflow:**
   - Connect Phantom wallet
   - Try creating a test token with minimal supply (1,000 tokens)
   - Verify all steps complete successfully

### Mainnet Testing Strategy

**⚠️ MAINNET TESTING USES REAL SOL**

1. **Start Small:** Create a test token with minimal supply
2. **Monitor Costs:** Each token creation costs ~0.01-0.02 SOL
3. **Verify Functions:** Ensure all Edge Functions respond correctly
4. **Check Metadata:** Verify IPFS upload and metadata links work

## Production Security Checklist

### ✅ Environment Security
- [ ] All secrets configured via Supabase CLI (never in code)
- [ ] JWT secret is cryptographically random
- [ ] Private keys never exposed in logs or client-side code
- [ ] RPC endpoints have appropriate rate limits

### ✅ Database Security  
- [ ] Row Level Security (RLS) policies enabled
- [ ] Service role key secured and not exposed
- [ ] Database backups configured
- [ ] Connection limits appropriate for expected load

### ✅ Frontend Security
- [ ] HTTPS enabled for production deployment
- [ ] No hardcoded secrets in JavaScript
- [ ] CSP headers configured
- [ ] CORS properly configured for your domain

### ✅ Function Security
- [ ] All Edge Functions validate inputs
- [ ] Authentication verified for protected endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured but doesn't log secrets

## Monitoring & Maintenance

### Health Monitoring

Set up monitoring for:
- Edge Function response times
- Database connection health  
- Solana RPC connectivity
- IPFS upload success rates

### Log Management

```bash
# View function logs
supabase functions logs mint-token
supabase functions logs generate-image
supabase functions logs auth
```

### Database Maintenance

```bash
# Monitor database performance
supabase db inspect
supabase db backup list
```

## Troubleshooting Common Issues

### Edge Function Deployment Failures
```bash
# Check function logs for errors
supabase functions logs --function-name mint-token

# Redeploy specific function
supabase functions deploy mint-token --no-verify-jwt
```

### Authentication Issues
- Verify JWT_SECRET is set correctly
- Check wallet signature validation in auth function
- Ensure CORS allows your frontend domain

### Solana Connection Issues
- Verify SOLANA_RPC_URL is reachable
- Check private key format (must be Base58)
- Monitor RPC rate limits

### IPFS Upload Failures  
- Verify OpenAI API key has credits
- Check image generation logs
- Ensure storage buckets are properly configured

## Cost Optimization

### Solana Network Costs
- Each token creation: ~0.01-0.02 SOL
- Metadata account creation: ~0.002 SOL  
- Associated token account: ~0.002 SOL

### Supabase Costs
- Edge Function invocations: 2M free/month
- Database queries: 50GB free transfer
- Storage: 1GB free

### Third-Party Services
- OpenAI API: ~$0.02 per image generation
- IPFS storage: Usually free for metadata

## Backup & Recovery

### Critical Data to Backup
- Database (automatic with Supabase)
- Environment secrets (securely document)
- Source code (Git repository)
- Generated token addresses and metadata URIs

### Recovery Procedures
1. **Function Failures:** Redeploy from source code
2. **Database Issues:** Use Supabase point-in-time recovery
3. **Secret Loss:** Regenerate and update all secrets
4. **RPC Issues:** Switch to backup RPC provider

## Support & Documentation

### Getting Help
- Supabase Discord for platform issues
- Solana Stack Exchange for blockchain questions
- OpenAI documentation for API issues

### Documentation Links
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Program](https://spl.solana.com/token)