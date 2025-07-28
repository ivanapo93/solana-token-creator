# Complete Deployment Guide for Solana Meme Coin Creator

This comprehensive guide will walk you through the entire deployment process for your Solana Meme Coin Creator, with a focus on security and practical steps.

## Prerequisites

Before starting, ensure you have:

1. **Development Environment:**
   - Node.js v18+ installed
   - Visual Studio Code or similar editor
   - Terminal/Command Prompt access

2. **Accounts and Keys:**
   - Supabase account with your project set up (`obbbcwkgctvfejsjmjrt`)
   - OpenAI API key with credits
   - Solana wallet with private key access
   - Solana wallet with at least 0.1 SOL for testing

## Step 1: Set Up Supabase CLI

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase (this will open your browser)
supabase login

# Link your local project to your Supabase project
cd /path/to/project
supabase link --project-ref obbbcwkgctvfejsjmjrt

# Verify connection is successful
supabase status
```

## Step 2: Deploy Database Schema

```bash
# Deploy database migrations to create all tables
supabase db push

# Create storage buckets for images and metadata
supabase storage create token-images --public
supabase storage create metadata-files --public
```

Next, run these SQL commands in the Supabase SQL Editor (Dashboard > SQL Editor):

```sql
-- Create storage policies for public access
CREATE POLICY "Anyone can view token images" ON storage.objects
FOR SELECT USING (bucket_id = 'token-images');

CREATE POLICY "Anyone can view metadata" ON storage.objects  
FOR SELECT USING (bucket_id = 'metadata-files');

-- Allow uploads from authenticated users
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'token-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload metadata" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'metadata-files' AND auth.role() = 'authenticated');
```

## Step 3: Securely Configure Environment Secrets

### Generating a Secure JWT Secret

```bash
# Generate a cryptographically secure random string for JWT_SECRET
# Method 1: Using OpenSSL (most secure)
JWT_SECRET=$(openssl rand -base64 32)
echo $JWT_SECRET  # Copy this value

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'));"
```

### Preparing Your Solana Private Key

**⚠️ EXTREME CAUTION: Never share, commit, or expose your private key**

Your private key should be in Base58 format. If you have a keypair file or array:

```javascript
// Node.js script to convert array to Base58
// Save this as convert-key.js and run with: node convert-key.js
const bs58 = require('bs58');

// Replace this with your actual private key bytes if you have them as an array
const privateKeyBytes = [
  // Your 64 bytes here from keypair.secretKey
];

const base58Key = bs58.encode(Buffer.from(privateKeyBytes));
console.log(base58Key);
```

For Phantom wallet:
1. Open Phantom
2. Click the gear icon
3. Go to "Export Private Key"
4. Enter your password
5. Copy the displayed private key (it's already Base58 format)

### Setting Environment Secrets

```bash
# Set Solana RPC URL (free tier)
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Set JWT secret
supabase secrets set JWT_SECRET="your_generated_jwt_secret_here"

# Set Solana private key (HANDLE WITH EXTREME CARE)
supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key_here

# Verify secrets are set (doesn't show values)
supabase secrets list
```

## Step 4: Deploy Edge Functions

Deploy all 6 Edge Functions to your Supabase project:

```bash
# Deploy functions one by one
supabase functions deploy auth --no-verify-jwt
supabase functions deploy mint-token --no-verify-jwt
supabase functions deploy generate-image --no-verify-jwt
supabase functions deploy upload-metadata --no-verify-jwt
supabase functions deploy token-metadata --no-verify-jwt
supabase functions deploy health --no-verify-jwt

# Verify all functions deployed successfully
supabase functions list
```

## Step 5: Update Frontend Configuration

Your `index.html` file already contains the updated URLs with your project reference (`obbbcwkgctvfejsjmjrt`). Verify the following section in your `index.html`:

```javascript
// Supabase Edge Function Endpoints - Updated with your project reference
const ENDPOINTS = {
    mintToken: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/mint-token',
    generateImage: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/generate-image',
    uploadMetadata: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/upload-metadata',
    tokenMetadata: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/token-metadata',
    auth: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/auth',
    health: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health'
};
```

If you need to use a different Supabase project, update the project reference ID in all URLs.

## Step 6: Test Deployment

### Test Health Endpoint

```bash
# Test health endpoint to verify all services are operational
curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# Expected response: {"success": true, "status": "healthy"}
```

### Test Frontend Locally

```bash
# Serve the HTML file locally using Python
python -m http.server 8000

# OR using Node.js
npx http-server -p 8000

# Open http://localhost:8000 in your browser
```

## Step 7: Test Token Creation on Mainnet

**⚠️ WARNING: Testing with REAL SOL**

Follow this minimal testing strategy to avoid unnecessary SOL expenditure:

1. **Connect wallet** - Verify Phantom connection works
2. **Test authentication** - Check if you can authenticate with your wallet
3. **Create minimal test token** - Use these parameters for your first test:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Supply: 1,000 (minimum to save SOL)
   - No social links
   - No authority revocations

Expected SOL cost: ~0.01 SOL

## Security Best Practices for Key Management

### Private Keys

1. **Never store private keys in code or version control**
   - Use environment variables or secrets managers only
   - Consider hardware wallets for production deployments

2. **Rotate keys periodically**
   - Generate new wallet keypairs quarterly
   - Transfer funds to new wallets securely

3. **Limit access and permissions**
   - Use separate wallets for testing and production
   - Consider multisig for production deployments

### API Keys

1. **Restrict API key permissions**
   - For OpenAI, limit to only required models
   - Set usage limits to prevent unexpected charges

2. **Monitor API usage**
   - Set up billing alerts
   - Check usage dashboards weekly

3. **Rotate API keys periodically**
   - Regenerate OpenAI API keys quarterly
   - Update environment secrets immediately

### JWT Secrets

1. **Use cryptographically strong random values**
   - At least 32 bytes of entropy
   - Generated using secure methods (OpenSSL, crypto libraries)

2. **Never reuse JWT secrets**
   - Use different secrets for different environments
   - Rotate secrets if compromise is suspected

## Post-Deployment Verification Checklist

Use this checklist to confirm your deployment is complete and secure:

### Infrastructure Verification

- [ ] All 6 Edge Functions deployed successfully
- [ ] Database schema deployed with all tables created
- [ ] Storage buckets created with correct permissions
- [ ] Environment secrets properly configured

### Security Verification

- [ ] JWT secret is strong and properly set
- [ ] Private key is secure and in correct format
- [ ] No secrets exposed in code or frontend
- [ ] CORS policies properly configured

### Functionality Verification

- [ ] Health endpoint returns successful response
- [ ] Authentication flow works (challenge + login)
- [ ] Image generation works with OpenAI
- [ ] Token creation completes successfully
- [ ] Metadata uploads to IPFS correctly
- [ ] Created token appears on Solscan

### Performance Verification

- [ ] Authentication completes in < 3 seconds
- [ ] Image generation completes in < 15 seconds
- [ ] Token creation completes in < 30 seconds
- [ ] Function logs show no errors or timeout issues

## Monitoring and Maintenance

### Routine Monitoring

```bash
# Check function logs for errors
supabase functions logs mint-token
supabase functions logs generate-image

# Monitor database usage and performance
supabase db inspect
```

### Handling Updates

```bash
# Update specific function after code changes
supabase functions deploy mint-token --no-verify-jwt

# Update a specific secret
supabase secrets set OPENAI_API_KEY=new_key_value
```

## Troubleshooting Common Issues

### Authentication Failures

**Problem:** Wallet connection or authentication doesn't work

**Solution:**
```bash
# Check auth function logs
supabase functions logs auth

# Verify JWT secret is set
supabase secrets list | grep JWT_SECRET
```

### Token Creation Failures

**Problem:** Token creation fails or timeouts

**Solutions:**
1. Check if you have enough SOL (minimum 0.05 SOL recommended)
2. Verify RPC endpoint is responding:
   ```bash
   curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```
3. Check mint-token function logs:
   ```bash
   supabase functions logs mint-token
   ```

### Image Generation Issues

**Problem:** AI image generation fails

**Solutions:**
1. Verify OpenAI API key has sufficient credits
2. Check function logs:
   ```bash
   supabase functions logs generate-image
   ```
3. Try simpler prompts that don't trigger content filters

## Emergency Procedures

If something goes wrong during deployment:

1. **Check logs immediately:**
   ```bash
   supabase functions logs --tail
   ```

2. **Verify all secrets are set:**
   ```bash
   supabase secrets list
   ```

3. **Test health endpoint:**
   ```bash
   curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health
   ```

4. **If necessary, redeploy specific function:**
   ```bash
   supabase functions deploy function-name --no-verify-jwt
   ```

---

By following this comprehensive guide, you should have a fully functional Solana Meme Coin Creator deployed to your Supabase project with all necessary security measures in place.