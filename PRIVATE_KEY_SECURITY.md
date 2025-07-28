# Private Key and API Key Security Guide

This guide provides best practices for securely handling private keys and API keys during deployment of your Solana Meme Coin Creator project.

## ⚠️ Private Key Security: Critical Practices

### Understanding Private Key Formats

Solana uses multiple private key formats:

1. **Keypair File** - JSON array of 64 bytes
2. **Base58 String** - The encoded format used by Phantom and CLI
3. **Secret Key Array** - Raw byte array in code

For your Supabase deployment, you need the **Base58 format**.

### Converting Private Keys to Base58

#### From Phantom Wallet (Easiest)

1. Open Phantom wallet
2. Click the gear icon (Settings)
3. Navigate to "Security & Privacy"
4. Select "Export Private Key"
5. Enter your password
6. Copy the displayed key (already in Base58 format)

#### From Keypair File

```javascript
// create-base58.js - Run with: node create-base58.js
const fs = require('fs');
const bs58 = require('bs58');

// Load keypair file (replace with your keypair path)
const keypairFile = JSON.parse(fs.readFileSync('/path/to/keypair.json', 'utf8'));
const secretKey = Uint8Array.from(keypairFile);
const base58Key = bs58.encode(secretKey);
console.log(base58Key);
```

#### From Secret Key Array

```javascript
// convert-array.js - Run with: node convert-array.js
const bs58 = require('bs58');

// Replace with your actual private key bytes
const privateKeyBytes = [
  // Your 64 bytes here
];

const base58Key = bs58.encode(Buffer.from(privateKeyBytes));
console.log(base58Key);
```

### Secure Storage Options for Private Keys

#### 1. Hardware Wallets (Most Secure)

For production environments, consider using a hardware wallet like Ledger:
- Store keys in secure hardware
- Sign transactions without exposing private keys
- Additional physical protection

#### 2. Key Management Services

For professional deployments:
- AWS Key Management Service
- Google Cloud KMS
- Azure Key Vault
- HashiCorp Vault

#### 3. Secure Local Storage (For Development)

If you must store locally:
- Use encrypted files with strong passwords
- Consider tools like `age` or `gpg` for encryption
- Store on encrypted drives

```bash
# Example: Encrypt private key with age
echo "your_private_key" | age -p > key.age

# Decrypt when needed
age -d key.age
```

### Private Key Usage in Supabase

When setting the `SOLANA_PRIVATE_KEY` secret in Supabase:

```bash
# Set the secret directly without saving to shell history
# (Add a space before the command to prevent history recording in most shells)
 supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key_here
```

## OpenAI API Key Security

### Obtain a Dedicated API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key dedicated to this project
3. Set usage limits to prevent unexpected charges
4. Note the key (shown only once)

### Set Usage Limits

1. Go to [OpenAI Usage Limits](https://platform.openai.com/account/limits)
2. Set hard limits for your API key
3. Configure billing alerts at 50% and 80% of your budget

### Securely Store in Supabase

```bash
# Set the secret
 supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

## JWT Secret Security

### Generate a Cryptographically Strong Secret

```bash
# Method 1: Using OpenSSL (recommended)
JWT_SECRET=$(openssl rand -base64 32)
echo $JWT_SECRET  # Copy this value

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'));"
```

### Set the JWT Secret in Supabase

```bash
 supabase secrets set JWT_SECRET="your_generated_jwt_secret_here"
```

## Securely Managing Local Development Files

### Environment File Security

If using `.env` files locally:

1. **Never commit .env files to git**
   ```bash
   # Add to .gitignore
   echo ".env*" >> .gitignore
   ```

2. **Use .env.example for templates**
   ```
   # .env.example
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   OPENAI_API_KEY=your_key_here
   JWT_SECRET=your_secret_here
   # NEVER include real SOLANA_PRIVATE_KEY here, even in examples
   ```

3. **Encrypt sensitive local files when not in use**
   ```bash
   # Encrypt .env file when not developing
   gpg -c .env
   
   # Decrypt when needed
   gpg .env.gpg
   ```

## Key Rotation Practices

### Scheduled Rotations

Implement regular key rotation schedule:

| Key Type | Rotation Frequency | Notes |
|----------|-------------------|-------|
| Solana Private Key | Quarterly | Transfer funds to new wallet |
| OpenAI API Key | Quarterly | Update with minimal downtime |
| JWT Secret | Quarterly | Requires user reauth |

### Emergency Rotations

Immediately rotate keys if:
- Any compromise is suspected
- Team members with access leave
- Unusual activity is detected
- After security incidents

### Rotation Procedure

1. **Generate new key/secret**
2. **Update in Supabase secrets**
   ```bash
   supabase secrets set KEY_NAME=new_value
   ```
3. **Verify functionality**
4. **Revoke old key/secret**

## Monitoring and Alerts

### Set Up Monitoring

1. **Monitor function logs**
   ```bash
   supabase functions logs auth
   ```

2. **Check for unauthorized access attempts**
   ```bash
   supabase functions logs auth | grep "failed"
   ```

3. **Monitor API usage in respective dashboards**
   - OpenAI usage dashboard
   - Supabase function invocations
   - Solana wallet transactions

### Security Audit Procedure

Conduct monthly security audits:

1. Review all access logs
2. Check for unusual patterns
3. Verify no unintended function invocations
4. Confirm no unexpected wallet transactions
5. Review OpenAI API usage for anomalies

## Red Flags to Watch For

Be alert for these warning signs:

- Unexpected authentication attempts
- Unusual geographic access patterns
- Spikes in API usage or costs
- Unrecognized token creation attempts
- Function invocations during off-hours
- Unexpected SOL transfers from your wallet

## Emergency Response

If a key compromise is suspected:

1. **Immediately rotate all secrets**
2. **Temporarily disable functions if needed**
   ```bash
   # Remove functions to disable temporarily
   supabase functions delete function-name
   ```
3. **Transfer any SOL to a new wallet**
4. **Review all logs and transactions**
5. **Document the incident and response**

Remember that security is an ongoing process, not a one-time task. Regularly review and update your security practices to protect your assets and user data.