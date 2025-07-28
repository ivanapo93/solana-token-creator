# Quick Deployment Commands for Solana Meme Coin Creator

## 🚀 Step-by-Step Deployment Commands

**Your Supabase Project:** `obbbcwkgctvfejsjmjrt`

### 1. Initial Setup Commands

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref obbbcwkgctvfejsjmjrt

# Verify connection
supabase status
```

### 2. Deploy Database Schema

```bash
# Deploy database migrations
supabase db push

# Create storage buckets
supabase storage create token-images --public
supabase storage create metadata-files --public
```

### 3. Configure Environment Secrets

**⚠️ Replace placeholders with your real values:**

```bash
# Solana mainnet RPC (free tier)
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# For better performance (recommended):
# supabase secrets set SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY

# Your OpenAI API key (required for image generation)
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Generate a strong JWT secret
supabase secrets set JWT_SECRET=$(openssl rand -base64 32)

# Your Solana wallet private key in Base58 format
# ⚠️ CRITICAL: Keep this secret secure
supabase secrets set SOLANA_PRIVATE_KEY=YOUR_BASE58_PRIVATE_KEY_HERE
```

### 4. Deploy All Edge Functions

```bash
# Deploy all 6 Edge Functions
supabase functions deploy auth --no-verify-jwt
supabase functions deploy mint-token --no-verify-jwt
supabase functions deploy generate-image --no-verify-jwt
supabase functions deploy upload-metadata --no-verify-jwt
supabase functions deploy token-metadata --no-verify-jwt
supabase functions deploy health --no-verify-jwt

# Verify deployment
supabase functions list
```

### 5. Test Deployment

```bash
# Test health endpoint
curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# Expected response: {"success": true, "status": "healthy"}
```

### 6. Update Frontend URLs

Replace the placeholder URLs in `index.html` with:

```javascript
const ENDPOINTS = {
    mintToken: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/mint-token',
    generateImage: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/generate-image',
    uploadMetadata: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/upload-metadata',
    tokenMetadata: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/token-metadata',
    auth: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/auth',
    health: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health'
};
```

## 🔐 Security Reminders

1. **Never commit secrets to Git**
2. **Store private keys securely** 
3. **Use environment variables only**
4. **Test with small amounts first**

## 🧪 Testing Commands

```bash
# Start local server to test frontend
python -m http.server 8000
# or
npx http-server -p 8000

# Open http://localhost:8000 in browser
# Connect Phantom wallet and test token creation
```

## 📊 Monitoring Commands

```bash
# View function logs
supabase functions logs mint-token
supabase functions logs generate-image
supabase functions logs auth

# Check database status
supabase db inspect

# Monitor secrets (does not show values)
supabase secrets list
```

## 🔄 Update Commands

```bash
# Redeploy specific function after changes
supabase functions deploy mint-token --no-verify-jwt

# Update a secret
supabase secrets set OPENAI_API_KEY=new_key_value

# Restart all functions
supabase functions deploy --all --no-verify-jwt
```

## 🚨 Emergency Commands

```bash
# Check if functions are responding
curl -I https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# View recent errors
supabase functions logs --tail

# Reset database (CAUTION: This deletes all data)
# supabase db reset --linked
```

## 💰 Cost Estimates

- **Token Creation:** ~0.01-0.02 SOL per token
- **Edge Functions:** 2M free invocations/month
- **OpenAI Images:** ~$0.02 per generation
- **Storage:** 1GB free

## 📝 Quick Troubleshooting

**Function fails to deploy:**
```bash
supabase functions logs function-name
supabase functions deploy function-name --no-verify-jwt
```

**Authentication errors:**
```bash
# Check JWT secret is set
supabase secrets list | grep JWT_SECRET
```

**Solana connection issues:**
```bash
# Verify RPC endpoint is reachable
curl https://api.mainnet-beta.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

**IPFS upload failures:**
```bash
# Check OpenAI API key
curl -H "Authorization: Bearer YOUR_OPENAI_KEY" https://api.openai.com/v1/models
```