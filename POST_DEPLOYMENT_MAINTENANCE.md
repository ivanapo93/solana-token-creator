# Post-Deployment Maintenance & Troubleshooting Guide

## 🔧 Maintenance Tasks

### Daily Monitoring

```bash
# Check system health
curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# View recent function logs
supabase functions logs --tail -f
```

### Weekly Tasks

1. **Review Function Performance:**
   ```bash
   supabase functions logs mint-token | grep "execution time"
   supabase functions logs generate-image | grep "execution time"
   ```

2. **Check Database Usage:**
   ```bash
   supabase db inspect
   ```

3. **Monitor SOL Balance:**
   - Check your wallet balance for adequate SOL
   - Each token creation costs ~0.01-0.02 SOL

### Monthly Tasks

1. **Review API Usage:**
   - OpenAI API usage and billing
   - Supabase function invocation limits
   - Database storage usage

2. **Update Dependencies:**
   ```bash
   npm update -g supabase
   ```

3. **Backup Critical Data:**
   - Export token creation records
   - Backup environment secrets securely

## 🚨 Troubleshooting Common Issues

### Issue: Token Creation Fails

**Symptoms:** Error messages during token creation process

**Diagnosis Steps:**
```bash
# Check function logs
supabase functions logs mint-token

# Test health endpoint
curl https://obbbcwkgctvfejsjmjrt.supabase.co/functions/v1/health

# Verify secrets are set
supabase secrets list
```

**Common Causes & Solutions:**

1. **Insufficient SOL Balance:**
   - Solution: Add more SOL to your wallet
   - Minimum required: 0.05 SOL for safety

2. **RPC Rate Limiting:**
   - Solution: Upgrade to paid RPC (Helius, QuickNode)
   - Or add delays between requests

3. **OpenAI API Issues:**
   - Check API key validity
   - Verify billing account has credits
   - Test image generation separately

### Issue: Image Generation Fails

**Symptoms:** Token creation stops at image generation step

**Diagnosis:**
```bash
supabase functions logs generate-image
```

**Solutions:**
1. **API Key Issues:** Update OpenAI API key
2. **Content Policy:** Modify prompts to be less specific
3. **Rate Limiting:** Add exponential backoff

### Issue: IPFS Upload Failures

**Symptoms:** Metadata upload step fails

**Diagnosis:**
```bash
supabase functions logs upload-metadata
```

**Solutions:**
1. **Storage Permissions:** Check bucket policies
2. **File Size:** Ensure images are < 5MB
3. **Network Issues:** Retry mechanism built-in

### Issue: Authentication Problems

**Symptoms:** Wallet connection or signature verification fails

**Diagnosis:**
```bash
supabase functions logs auth
```

**Solutions:**
1. **JWT Secret:** Regenerate if compromised
2. **Wallet Network:** Ensure user is on mainnet
3. **Phantom Updates:** Update Phantom wallet extension

### Issue: Database Errors

**Symptoms:** Data not saving or retrieving properly

**Diagnosis:**
```bash
supabase db inspect
supabase db logs
```

**Solutions:**
1. **Migration Issues:** Re-run migrations
2. **RLS Policies:** Check row-level security settings
3. **Connection Limits:** Monitor concurrent connections

## 📊 Performance Optimization

### Function Performance

1. **Monitor Response Times:**
   ```bash
   supabase functions logs mint-token | grep "Duration"
   ```

2. **Optimize Cold Starts:**
   - Keep functions warm with periodic health checks
   - Use Supabase function scheduling

3. **Memory Usage:**
   - Monitor function memory consumption
   - Optimize image processing routines

### Database Performance

1. **Query Optimization:**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX idx_tokens_creator ON tokens(creator_wallet);
   CREATE INDEX idx_tokens_created_at ON tokens(created_at);
   ```

2. **Connection Pooling:**
   - Monitor connection usage
   - Configure appropriate pool sizes

### RPC Performance

1. **Upgrade RPC Provider:**
   ```bash
   # Switch to premium RPC for better performance
   supabase secrets set SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

2. **Load Balancing:**
   - Configure multiple RPC endpoints
   - Implement failover logic

## 🔐 Security Maintenance

### Regular Security Tasks

1. **Rotate Secrets (Quarterly):**
   ```bash
   # Generate new JWT secret
   supabase secrets set JWT_SECRET=$(openssl rand -base64 32)
   
   # Update OpenAI API key if needed
   supabase secrets set OPENAI_API_KEY=new_key
   ```

2. **Audit Access Logs:**
   ```bash
   supabase logs --type=auth
   ```

3. **Review Function Permissions:**
   - Ensure functions have minimal required permissions
   - Review CORS settings for production

### Security Monitoring

1. **Failed Authentication Attempts:**
   ```bash
   supabase functions logs auth | grep "failed"
   ```

2. **Unusual Activity Patterns:**
   - Monitor for rapid token creation
   - Check for suspicious wallet addresses
   - Review error patterns

## 📈 Scaling Considerations

### Traffic Growth

1. **Function Scaling:**
   - Supabase auto-scales Edge Functions
   - Monitor invocation limits

2. **Database Scaling:**
   - Upgrade Supabase plan if needed
   - Consider read replicas for heavy read workloads

3. **Storage Scaling:**
   - Monitor image storage usage
   - Implement image optimization

### Cost Management

1. **Monitor Costs:**
   - Supabase dashboard for usage metrics
   - OpenAI billing dashboard
   - SOL transaction costs

2. **Optimize Costs:**
   - Implement caching for metadata
   - Optimize image generation parameters
   - Use efficient RPC providers

## 🔄 Update Procedures

### Code Updates

1. **Function Updates:**
   ```bash
   # Update specific function
   supabase functions deploy mint-token --no-verify-jwt
   
   # Update all functions
   supabase functions deploy --all --no-verify-jwt
   ```

2. **Database Schema Updates:**
   ```bash
   # Create new migration
   supabase migration new add_new_feature
   
   # Apply migrations
   supabase db push
   ```

3. **Frontend Updates:**
   - Update HTML/CSS/JS files
   - Test thoroughly before deployment
   - Consider versioning for rollback capability

### Dependency Updates

1. **Supabase CLI:**
   ```bash
   npm update -g supabase
   ```

2. **Edge Function Dependencies:**
   - Update import maps in functions
   - Test compatibility thoroughly

## 💾 Backup & Recovery

### Automated Backups

1. **Database Backups:**
   - Supabase provides automatic backups
   - Configure point-in-time recovery

2. **Code Backups:**
   - Use Git for version control
   - Tag releases for easy rollback

### Manual Backup Procedures

1. **Export Token Data:**
   ```sql
   COPY (SELECT * FROM tokens) TO 'tokens_backup.csv' CSV HEADER;
   ```

2. **Backup Secrets:**
   - Document all secret names (not values)
   - Store recovery procedures securely

### Recovery Procedures

1. **Function Recovery:**
   ```bash
   # Redeploy from source
   supabase functions deploy --all --no-verify-jwt
   ```

2. **Database Recovery:**
   ```bash
   # Point-in-time recovery via Supabase dashboard
   # Or restore from backup
   ```

3. **Secret Recovery:**
   ```bash
   # Reset all secrets with new values
   supabase secrets set SOLANA_PRIVATE_KEY=new_key
   supabase secrets set OPENAI_API_KEY=new_key
   supabase secrets set JWT_SECRET=new_secret
   ```

## 📞 Support Resources

### Getting Help

1. **Supabase Issues:**
   - [Supabase Discord](https://discord.supabase.com/)
   - [Supabase Documentation](https://supabase.com/docs)

2. **Solana Issues:**
   - [Solana Stack Exchange](https://solana.stackexchange.com/)
   - [Solana Discord](https://discord.gg/solana)

3. **OpenAI Issues:**
   - [OpenAI Support](https://help.openai.com/)
   - [OpenAI Status Page](https://status.openai.com/)

### Emergency Contacts

1. **Critical Issues:**
   - Document escalation procedures
   - Maintain emergency contact list
   - Keep backup RPC endpoints ready

2. **Incident Response:**
   - Disable problematic functions temporarily
   - Switch to backup services
   - Communicate with users if needed

## 📊 Monitoring Dashboard

### Key Metrics to Track

1. **System Health:**
   - Function response times
   - Error rates
   - Database connection health

2. **Business Metrics:**
   - Tokens created per day
   - User wallet connections
   - Revenue/SOL consumption

3. **Cost Metrics:**
   - Function invocations
   - OpenAI API usage
   - Database operations

### Alerting Setup

1. **Critical Alerts:**
   - Function failures > 5%
   - Database connection issues
   - SOL balance below threshold

2. **Warning Alerts:**
   - High response times
   - Approaching usage limits
   - Cost thresholds exceeded

---

**Last Updated:** 2025-07-26  
**Next Review:** 2025-08-26