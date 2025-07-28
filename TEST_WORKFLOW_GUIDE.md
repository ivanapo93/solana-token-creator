# Mainnet Testing Workflow Guide

## ⚠️ IMPORTANT: Real SOL Testing

**This guide covers testing with REAL SOL on Solana mainnet. Start with small amounts!**

## 🧪 Pre-Testing Checklist

### Prerequisites
- [ ] All Edge Functions deployed successfully
- [ ] Environment secrets configured
- [ ] Frontend URLs updated to your Supabase project
- [ ] Phantom wallet with minimum 0.1 SOL for testing
- [ ] OpenAI API key with available credits

### Test Environment Setup

```bash
# Verify health endpoint
curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# Expected response:
# {"success": true, "services": {"database": "healthy", "solana": "connected", "openai": "available"}}
```

## 🔍 Testing Strategy

### Phase 1: Component Testing (5-10 minutes)

Test each function individually before full workflow:

1. **Health Check:**
   ```bash
   curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health
   ```

2. **Authentication Test:**
   - Connect Phantom wallet on your frontend
   - Check browser console for authentication success
   - Verify JWT token is stored in localStorage

3. **Image Generation Test:**
   ```bash
   # Test via frontend or direct API call (requires auth token)
   # Should generate a test image within 10-15 seconds
   ```

### Phase 2: Minimal Token Test (Cost: ~0.01 SOL)

Create a test token with minimal parameters:

**Test Token Specifications:**
- **Name:** "Test Token"
- **Symbol:** "TEST" 
- **Description:** "Testing token creation"
- **Supply:** 1,000 (minimal)
- **Decimals:** 9
- **No social links**
- **No authority revocations**

**Expected Results:**
- Token creation completes in 30-60 seconds
- Receive mint address
- Metadata uploaded to IPFS
- Token visible on Solscan

### Phase 3: Full Feature Test (Cost: ~0.02 SOL)

Test complete workflow with all features:

**Full Test Specifications:**
```json
{
  "name": "SolMeme Test Pro",
  "symbol": "SMTEST",
  "description": "Professional test of SolMeme Creator with all features enabled",
  "supply": 1000000000,
  "decimals": 9,
  "imagePrompt": "professional test token logo",
  "website": "https://example.com",
  "socialLinks": {
    "twitter": "https://twitter.com/test",
    "telegram": "https://t.me/test"
  },
  "revokeMintAuthority": true,
  "revokeFreezeAuthority": true,
  "revokeUpdateAuthority": true
}
```

**Expected Results:**
- AI-generated logo
- Complete metadata with social links
- All authorities revoked as requested
- Token ready for DEX listing

## 📝 Test Documentation Template

### Test Case: Token Creation

**Date:** [Date]  
**Tester:** [Your Name]  
**Environment:** Mainnet  
**SOL Balance Before:** [Amount] SOL  

#### Test Parameters
- **Name:** [Token Name]
- **Symbol:** [Token Symbol]
- **Supply:** [Token Supply]
- **Features:** [List enabled features]

#### Test Results
- **Status:** ✅ Success / ❌ Failed
- **Duration:** [Time taken]
- **SOL Cost:** [Actual cost]
- **Mint Address:** [Generated address]
- **Transaction:** [Solscan link]
- **Metadata URI:** [IPFS link]

#### Issues Encountered
- [List any issues or errors]
- [Include error messages]
- [Note workarounds used]

#### Performance Metrics
- **Auth Time:** [Seconds]
- **Image Generation:** [Seconds]
- **Metadata Upload:** [Seconds]
- **Token Minting:** [Seconds]
- **Total Time:** [Seconds]

## 🔧 Debugging Failed Tests

### Common Failure Points

1. **Authentication Failures:**
   ```javascript
   // Check browser console for:
   console.log('Auth token:', localStorage.getItem('authToken'));
   
   // If null, authentication failed
   // Check Phantom wallet connection
   ```

2. **Image Generation Failures:**
   ```bash
   # Check function logs
   supabase functions logs generate-image
   
   # Common issues:
   # - OpenAI API key invalid
   # - Content policy violation
   # - Rate limiting
   ```

3. **Solana Transaction Failures:**
   ```bash
   # Check mint-token function logs
   supabase functions logs mint-token
   
   # Common issues:
   # - Insufficient SOL
   # - RPC connection issues
   # - Private key format problems
   ```

4. **Metadata Upload Failures:**
   ```bash
   # Check upload-metadata function logs
   supabase functions logs upload-metadata
   
   # Common issues:
   # - Storage bucket permissions
   # - File size limits
   # - Network connectivity
   ```

### Error Investigation Steps

1. **Function Logs:**
   ```bash
   # View recent logs for all functions
   supabase functions logs --tail
   
   # View specific function logs
   supabase functions logs mint-token
   ```

2. **Browser Developer Tools:**
   - Network tab: Check API calls and responses
   - Console: Look for JavaScript errors
   - Application tab: Verify localStorage tokens

3. **Solana Explorer:**
   - Check transaction status on Solscan
   - Verify wallet balance changes
   - Confirm token mint creation

## 📊 Performance Benchmarks

### Expected Performance Targets

| Operation | Target Time | Acceptable Range |
|-----------|-------------|------------------|
| Wallet Connection | < 5s | 2-10s |
| Authentication | < 3s | 1-5s |
| Image Generation | < 15s | 10-30s |
| Metadata Upload | < 5s | 3-10s |
| Token Minting | < 10s | 5-20s |
| **Total Process** | **< 40s** | **30-60s** |

### Performance Issues

**If processes exceed acceptable ranges:**

1. **Slow Image Generation:**
   - Check OpenAI API status
   - Reduce image complexity
   - Implement caching

2. **Slow Token Minting:**
   - Upgrade RPC provider
   - Check network congestion
   - Verify SOL balance

3. **Slow Metadata Upload:**
   - Check IPFS gateway health
   - Reduce image file sizes
   - Implement retry logic

## 🎯 Test Scenarios

### Scenario 1: Basic Meme Token
```json
{
  "mode": "ai",
  "concept": "funny cat token",
  "supply": 1000000,
  "authorities": "default"
}
```

### Scenario 2: Professional Token
```json
{
  "mode": "manual",
  "name": "Professional Token",
  "symbol": "PRO",
  "description": "A professional cryptocurrency token",
  "supply": 1000000000,
  "website": "https://example.com",
  "socialLinks": "all",
  "authorities": "all_revoked"
}
```

### Scenario 3: Minimal Test Token
```json
{
  "mode": "manual",
  "name": "Minimal Test",
  "symbol": "MIN",
  "description": "Minimal test token",
  "supply": 100,
  "authorities": "default"
}
```

## 🚨 Emergency Procedures

### If Testing Fails Completely

1. **Stop Testing:** Don't waste more SOL
2. **Check Logs:** Review all function logs
3. **Verify Secrets:** Ensure all environment variables are set
4. **Test Components:** Test each function individually
5. **Contact Support:** Use provided support channels

### SOL Recovery

**If SOL is lost due to failed transactions:**
- Check transaction status on Solscan
- Failed transactions typically return SOL minus network fees
- Contact Solana support for network issues

### Data Recovery

**If tokens are created but not tracked:**
- Check database tables for missing records
- Use mint address to verify token existence
- Manually add records if necessary

## ✅ Success Criteria

### Minimal Success (Must Have)
- [ ] Token successfully created on mainnet
- [ ] Mint address generated and valid
- [ ] Token visible on Solscan
- [ ] Basic metadata attached

### Full Success (Nice to Have)
- [ ] AI-generated logo working
- [ ] IPFS metadata fully accessible
- [ ] Social links properly attached
- [ ] Authorities revoked as requested
- [ ] Token ready for DEX listing
- [ ] Process completed within time targets

### Production Ready
- [ ] Multiple successful test tokens
- [ ] Consistent performance metrics
- [ ] Error handling working properly
- [ ] All edge cases tested
- [ ] Documentation complete

---

**Testing Status:** 🟡 Ready for Testing  
**Last Updated:** 2025-07-26  
**Next Review:** After first test results