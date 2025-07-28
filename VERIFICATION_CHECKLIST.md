# Deployment Verification Checklist

Use this comprehensive checklist to verify your Solana Meme Coin Creator deployment is complete and functioning properly.

## 🔧 Infrastructure Verification

### Supabase Project Setup

- [ ] **Supabase Project Active**
  ```bash
  # Verify connection to project
  supabase status
  ```

- [ ] **Database Tables Created**
  ```bash
  # List tables to verify schema deployment
  supabase db inspect --tables
  ```
  Expected tables:
  - tokens
  - sessions
  - images
  - metadata
  - health

- [ ] **Storage Buckets Created**
  ```bash
  # Verify storage buckets exist
  supabase storage list
  ```
  Expected buckets:
  - token-images
  - metadata-files

- [ ] **Storage Policies Configured**
  ```sql
  -- Run in SQL Editor to check policies
  SELECT bucket_id, name, definition FROM storage.policies;
  ```

### Edge Functions Deployment

- [ ] **All Functions Deployed**
  ```bash
  # Verify all 6 functions are deployed
  supabase functions list
  ```
  Expected functions:
  - auth
  - mint-token
  - generate-image
  - upload-metadata
  - token-metadata
  - health

- [ ] **Functions Responding**
  ```bash
  # Test health endpoint
  curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health
  ```
  Expected response: `{"success": true, "status": "healthy"}`

### Environment Configuration

- [ ] **All Required Secrets Set**
  ```bash
  # List secrets (values not shown)
  supabase secrets list
  ```
  Required secrets:
  - SOLANA_RPC_URL
  - SOLANA_PRIVATE_KEY
  - OPENAI_API_KEY
  - JWT_SECRET

- [ ] **Frontend URLs Updated**
  Check in `index.html` that all endpoints use your project reference:
  ```javascript
  const ENDPOINTS = {
      mintToken: 'https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/mint-token',
      // Check all other endpoints
  };
  ```

## 🔐 Security Verification

### Private Key Configuration

- [ ] **Private Key Format Correct**
  - Verify private key is in Base58 format
  - Should start with a different character pattern than a public key

- [ ] **Wallet Has Sufficient SOL**
  ```bash
  # Check balance using Solana CLI or explorer
  solana balance <PUBLIC_KEY> --url https://api.mainnet-beta.solana.com
  ```
  Minimum recommended: 0.1 SOL

### API Key Verification

- [ ] **OpenAI API Key Valid**
  ```bash
  # Test API key (replace with your key)
  curl https://api.openai.com/v1/models \
    -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
  ```
  Should return a list of available models.

- [ ] **OpenAI API Has Credits**
  - Check OpenAI dashboard for available credits
  - Verify billing is properly set up

### JWT Configuration

- [ ] **JWT Secret Properly Set**
  - Should be at least 32 characters
  - Should be cryptographically random
  - Verify auth function works with test login

## 🧪 Functional Testing

### Component Testing

- [ ] **Health Endpoint Returns Success**
  ```bash
  curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health
  ```

- [ ] **Authentication Challenge Generated**
  ```bash
  curl -X POST https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/auth/challenge \
    -H "Content-Type: application/json" \
    -d '{"walletAddress": "YOUR_PUBLIC_KEY"}'
  ```
  Should return a challenge message.

### Frontend Testing

- [ ] **Site Loads Successfully**
  ```bash
  # Serve locally
  python -m http.server 8000
  # Check in browser: http://localhost:8000
  ```

- [ ] **Phantom Wallet Connects**
  - Click "Connect Phantom Wallet" button
  - Verify wallet address displays correctly

- [ ] **Authentication Flow Works**
  - Wallet connection should trigger authentication
  - JWT token should be stored in localStorage
  - Check browser console for any errors

### Token Creation Testing

Start with minimal test parameters to save SOL:

- [ ] **Minimal Token Creation Succeeds**
  Test parameters:
  - Name: "Test Token"
  - Symbol: "TEST"
  - Supply: 1,000 (minimal)
  - No social links
  - No authority revocations

- [ ] **Token Appears on Solscan**
  - After creation, check the mint address on Solscan
  - URL format: `https://solscan.io/token/MINT_ADDRESS`

## ⚙️ Performance Verification

### Timing Benchmarks

Use browser dev tools to measure:

- [ ] **Wallet Connection**: < 5 seconds
- [ ] **Authentication**: < 3 seconds
- [ ] **Image Generation**: < 15 seconds
- [ ] **Metadata Upload**: < 5 seconds
- [ ] **Token Minting**: < 10 seconds
- [ ] **Total Process**: < 60 seconds

### Error Handling

Verify graceful handling of common errors:

- [ ] **Insufficient SOL**: Clear error message
- [ ] **Invalid Token Parameters**: Proper validation errors
- [ ] **Network Disconnection**: Appropriate retry or fallback

## 📊 Post-Deployment Monitoring

### Log Inspection

- [ ] **Function Logs Clean**
  ```bash
  # Check for errors in logs
  supabase functions logs mint-token | grep "error"
  supabase functions logs generate-image | grep "error"
  ```

- [ ] **Database Performance Normal**
  ```bash
  # Check database performance
  supabase db inspect
  ```

### Resource Usage

- [ ] **Function Invocation Count Reasonable**
  Check Supabase dashboard for function invocation metrics

- [ ] **Storage Usage Within Limits**
  Check Supabase dashboard for storage usage

## 🔄 Production Readiness

### Documentation

- [ ] **Deployment Process Documented**
  - Steps to deploy are clearly documented
  - Any manual steps are noted

- [ ] **Maintenance Procedures Documented**
  - Log checking procedures
  - Update procedures
  - Troubleshooting steps

### Backup and Recovery

- [ ] **Backup Plan Established**
  - Database backup strategy
  - Code backup in version control
  - Environment secrets securely documented

- [ ] **Recovery Plan Documented**
  - Steps to recover from database issues
  - Steps to redeploy functions if needed
  - Procedure for rotating compromised secrets

## 🚀 Final Verification

After completing all checks above, perform one final end-to-end test:

1. Create a complete token with all features enabled
2. Verify all steps complete successfully
3. Check the token appears on Solscan
4. Verify metadata and image are accessible
5. Confirm token attributes match your specifications

If all items above check out, your deployment is verified and ready for production use!

---

**Verification Status:** ⬜ Not Started / 🟡 In Progress / ✅ Complete  
**Date Completed:** _________________  
**Verified By:** _________________