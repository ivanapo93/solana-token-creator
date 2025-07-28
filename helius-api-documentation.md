# Helius API Integration Documentation

## Complete Solana Token Creation Workflow

This documentation provides all the REST API calls and workflow steps for creating Solana tokens using the Helius API.

### API Configuration

```javascript
const HELIUS_API_KEY = '85e4288c-67e9-48fa-bf0a-2c03ed1aa0f7';
const HELIUS_BASE_URL = 'https://api.helius.xyz/v0';

// Standard headers for all requests
const headers = {
    'Authorization': `Bearer ${HELIUS_API_KEY}`,
    'Content-Type': 'application/json'
};
```

## Step-by-Step Workflow

### 1. Upload Token Image to IPFS

**Endpoint:** `POST /ipfs`
**Purpose:** Upload token image to IPFS for permanent storage

```javascript
async function uploadImageToIPFS(imageUrl) {
    const response = await fetch(`${HELIUS_BASE_URL}/ipfs`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELIUS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: imageUrl,
            type: 'image'
        })
    });

    if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ipfsHash; // Returns: "QmX1234567890abcdef..."
}
```

**Response Format:**
```json
{
    "success": true,
    "ipfsHash": "QmX1234567890abcdef",
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmX1234567890abcdef"
}
```

### 2. Create and Upload Metadata JSON

**Endpoint:** `POST /ipfs`
**Purpose:** Create Metaplex-compliant metadata with social links

```javascript
async function createMetadataJSON(tokenData, imageHash) {
    const metadata = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        description: tokenData.description,
        image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
        attributes: [
            {
                trait_type: "Transaction Fee",
                value: `${tokenData.transactionFee}%`
            },
            {
                trait_type: "Initial Supply",
                value: tokenData.initialSupply.toString()
            }
        ],
        properties: {
            files: [
                {
                    uri: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
                    type: "image/png"
                }
            ],
            category: "image"
        },
        external_url: tokenData.website || "",
        extensions: {
            website: tokenData.website || "",
            twitter: tokenData.twitter || "",
            telegram: tokenData.telegram || "",
            discord: tokenData.discord || ""
        }
    };

    const response = await fetch(`${HELIUS_BASE_URL}/ipfs`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELIUS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: metadata,
            type: 'json'
        })
    });

    if (!response.ok) {
        throw new Error(`Metadata upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ipfsHash;
}
```

### 3. Create Solana Token with Advanced Features

**Endpoint:** `POST /token/create`
**Purpose:** Mint the actual SPL token with transaction fees and authority settings

```javascript
async function createSolanaToken(tokenData, metadataUri) {
    const tokenPayload = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: parseInt(tokenData.decimals),
        initialSupply: parseInt(tokenData.initialSupply),
        metadataUri: `https://gateway.pinata.cloud/ipfs/${metadataUri}`,
        
        // Transaction fee configuration
        transactionFee: parseFloat(tokenData.transactionFee), // 1% = 0.01
        feeRecipient: "liquidity_pool", // Fees go to liquidity pool
        
        // Authority settings (revoke = set to null)
        authorities: {
            mintAuthority: !tokenData.revokeMint,
            freezeAuthority: !tokenData.revokeFreeze,
            updateAuthority: !tokenData.revokeUpdate
        },
        
        // Additional settings
        transferHook: tokenData.transactionFee > 0 ? "enabled" : "disabled"
    };

    const response = await fetch(`${HELIUS_BASE_URL}/token/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELIUS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token creation failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return {
        tokenAddress: result.mintAddress,
        transactionId: result.signature,
        metadataAddress: result.metadataAddress
    };
}
```

**Response Format:**
```json
{
    "success": true,
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "signature": "5VERv8NMvQUboqKDyqqr2DEGo55wFXGFYhBAqpYFE8tJZ1234567890abcdef",
    "metadataAddress": "8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgXxY",
    "authorities": {
        "mintAuthority": null,
        "freezeAuthority": null,
        "updateAuthority": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    }
}
```

### 4. Register Token on DexScreener with Verified Badge

**Endpoint:** `POST /dexscreener/register`
**Purpose:** Fast-track token listing with premium verification (⚡ symbol)

```javascript
async function registerOnDexScreener(tokenAddress) {
    const payload = {
        tokenAddress: tokenAddress,
        verificationTier: 'premium', // Options: 'basic', 'premium', 'ultimate'
        fastTrack: true,
        boostLevel: 500 // This creates the ⚡500 badge
    };

    const response = await fetch(`${HELIUS_BASE_URL}/dexscreener/register`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELIUS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Non-critical error - token creation continues
        console.warn(`DexScreener registration failed: ${response.statusText}`);
        return { success: false, error: response.statusText };
    }

    const result = await response.json();
    return result;
}
```

**Response Format:**
```json
{
    "success": true,
    "dexscreenerUrl": "https://dexscreener.com/solana/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "verificationStatus": "premium",
    "boostBadge": "⚡500",
    "estimatedListingTime": "5-10 minutes"
}
```

## Complete Workflow Implementation

### Main Workflow Function

```javascript
class HeliusTokenCreator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.helius.xyz/v0';
    }

    async createCompleteToken(tokenData) {
        try {
            // Step 1: Upload image to IPFS
            console.log('📸 Uploading image to IPFS...');
            let imageHash = null;
            if (tokenData.imageUrl) {
                imageHash = await this.uploadImageToIPFS(tokenData.imageUrl);
            }

            // Step 2: Create and upload metadata
            console.log('📋 Creating metadata...');
            const metadataHash = await this.createMetadataJSON(tokenData, imageHash);

            // Step 3: Create the token
            console.log('🪙 Creating Solana token...');
            const tokenResult = await this.createSolanaToken(tokenData, metadataHash);

            // Step 4: Register on DexScreener
            console.log('📊 Registering on DexScreener...');
            const dexResult = await this.registerOnDexScreener(tokenResult.tokenAddress);

            return {
                success: true,
                tokenAddress: tokenResult.tokenAddress,
                transactionId: tokenResult.transactionId,
                metadataAddress: tokenResult.metadataAddress,
                dexscreener: dexResult,
                instructions: {
                    raydiumUrl: `https://raydium.io/liquidity/create/?token=${tokenResult.tokenAddress}`,
                    dexscreenerUrl: `https://dexscreener.com/solana/${tokenResult.tokenAddress}`
                }
            };

        } catch (error) {
            console.error('Token creation failed:', error);
            throw error;
        }
    }
}
```

### Usage Example

```javascript
// Initialize the creator
const creator = new HeliusTokenCreator('85e4288c-67e9-48fa-bf0a-2c03ed1aa0f7');

// Token configuration
const tokenData = {
    name: "My Awesome Token",
    symbol: "MAT",
    description: "A revolutionary token with built-in transaction fees",
    imageUrl: "https://example.com/logo.png",
    decimals: 9,
    initialSupply: 1000000,
    transactionFee: 1.0, // 1%
    
    // Social links
    website: "https://mytoken.com",
    twitter: "https://x.com/mytoken",
    telegram: "https://t.me/mytoken",
    discord: "https://discord.gg/mytoken",
    
    // Authority settings
    revokeMint: true,      // No more tokens can be created
    revokeFreeze: true,    // Accounts cannot be frozen
    revokeUpdate: false    // Metadata can still be updated
};

// Create the token
creator.createCompleteToken(tokenData)
    .then(result => {
        console.log('✅ Token created successfully!');
        console.log('Token Address:', result.tokenAddress);
        console.log('Transaction ID:', result.transactionId);
        console.log('DexScreener:', result.dexscreener.dexscreenerUrl);
    })
    .catch(error => {
        console.error('❌ Token creation failed:', error);
    });
```

## Error Handling

### Common Error Responses

```javascript
// Network/API errors
{
    "error": "NETWORK_ERROR",
    "message": "Failed to connect to Helius API",
    "statusCode": 500
}

// Validation errors
{
    "error": "VALIDATION_ERROR",
    "message": "Invalid token symbol length",
    "field": "symbol",
    "statusCode": 400
}

// Insufficient funds
{
    "error": "INSUFFICIENT_FUNDS",
    "message": "Wallet does not have enough SOL for transaction",
    "required": "0.01 SOL",
    "statusCode": 402
}
```

### Error Handling Implementation

```javascript
async function handleApiCall(apiFunction, errorMessage) {
    try {
        return await apiFunction();
    } catch (error) {
        if (error.response) {
            // API returned an error response
            const errorData = await error.response.json();
            throw new Error(`${errorMessage}: ${errorData.message}`);
        } else if (error.message.includes('fetch')) {
            // Network error
            throw new Error(`${errorMessage}: Network connection failed`);
        } else {
            // Other errors
            throw new Error(`${errorMessage}: ${error.message}`);
        }
    }
}
```

## Integration for No-Code/Low-Code Platforms

### Webhook Configuration

```javascript
// For platforms like Zapier, Make.com, etc.
const webhookEndpoint = 'https://your-platform.com/webhook/token-created';

// Send results to webhook after token creation
async function notifyWebhook(tokenResult) {
    await fetch(webhookEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_WEBHOOK_SECRET'
        },
        body: JSON.stringify({
            event: 'token_created',
            data: tokenResult,
            timestamp: new Date().toISOString()
        })
    });
}
```

### Environment Variables

For secure deployment, use these environment variables:

```javascript
const config = {
    HELIUS_API_KEY: process.env.HELIUS_API_KEY || '85e4288c-67e9-48fa-bf0a-2c03ed1aa0f7',
    HELIUS_BASE_URL: process.env.HELIUS_BASE_URL || 'https://api.helius.xyz/v0',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your-webhook-secret'
};
```

## Next Steps After Token Creation

### 1. Adding Liquidity on Raydium

```javascript
function generateRaydiumInstructions(tokenAddress) {
    return {
        url: `https://raydium.io/liquidity/create/?token=${tokenAddress}`,
        steps: [
            "Connect your wallet to Raydium",
            "Select SOL as the base token",
            "Paste your token address for the quote token",
            "Add desired liquidity amounts (minimum 1 SOL recommended)",
            "Confirm the transaction",
            "Your token is now live for trading!"
        ]
    };
}
```

### 2. Monitoring on DexScreener

```javascript
function generateDexScreenerInfo(tokenAddress, boostLevel = 500) {
    return {
        url: `https://dexscreener.com/solana/${tokenAddress}`,
        badge: `⚡${boostLevel}`,
        features: [
            "Real-time price tracking",
            "Volume and liquidity metrics",
            "Holder count and distribution",
            "Social sentiment analysis",
            "Trading history and patterns"
        ]
    };
}
```

## Security Best Practices

1. **API Key Management**: Never expose API keys in client-side code
2. **Wallet Security**: Private keys should never be transmitted
3. **Input Validation**: Always validate user inputs before API calls
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Error Logging**: Log errors securely without exposing sensitive data

This documentation provides everything needed to integrate Helius API token creation into any development environment or no-code platform.