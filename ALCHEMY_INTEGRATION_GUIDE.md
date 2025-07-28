# Alchemy Integration Guide for SPL Token Monitoring

This guide explains how to configure and use the Alchemy webhook and transaction debug integration for monitoring SPL tokens on Solana.

## Overview

The integration provides:
- Real-time monitoring of token minting and transfers
- Transaction debugging and status tracking
- Automatic transaction retry for failed operations
- IPFS metadata validation

## Prerequisites

1. An Alchemy account with API key
2. A backend server to receive webhook notifications
3. The SolMeme Creator platform set up

## Configuration

### 1. Set Up Alchemy API Key

The system is pre-configured with a default API key. For production use, replace it with your own:

```javascript
// In solana-integration.js
this.alchemyConfig = {
    apiKey: 'YOUR_ALCHEMY_API_KEY',
    webhookUrl: null,
    webhookId: null,
    notificationEmail: null,
    maxRetries: 3
};
```

### 2. Configure Webhook URL

Set up a webhook endpoint to receive real-time notifications:

```javascript
// Example: Configure webhook from frontend
const webhookUrl = 'https://your-backend.com/api/webhooks/solana';
await window.setupTransactionMonitoring(webhookUrl);
```

Or use the backend API:

```bash
curl -X POST https://your-api.com/api/tokens/webhook \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://your-backend.com/api/webhooks/solana",
    "addresses": ["TOKEN_MINT_ADDRESS"],
    "notificationTypes": ["TOKEN_MINT", "TOKEN_TRANSFER"]
  }'
```

### 3. Enable Monitoring When Creating Tokens

Add the webhook URL and monitoring flags when creating tokens:

```javascript
// In your token creation form
const tokenData = {
  name: "My Token",
  symbol: "MTK",
  decimals: 9,
  supply: 1000000000,
  // ... other token properties
  
  // Monitoring configuration
  webhookUrl: "https://your-backend.com/api/webhooks/solana",
  enableTransactionMonitoring: true,
  enableAutoRetry: true
};

// Create the token with monitoring enabled
const result = await solanaInstance.createTokenWithMetadata(tokenData);
```

## Webhook Event Types

Your webhook endpoint will receive the following event types:

| Event | Description |
|-------|-------------|
| `token.mintStarted` | Triggered when token minting begins |
| `token.created` | Triggered when token is successfully created |
| `transaction.status` | Updates on transaction status |
| `transaction.confirmed` | When a transaction is confirmed |
| `token.transferred` | When tokens are transferred |

## Sample Webhook Payload

```json
{
  "event": "token.created",
  "data": {
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "tokenName": "My Token",
    "tokenSymbol": "MTK",
    "supply": 1000000000,
    "decimals": 9,
    "signature": "5UJpjTBrTv4di3UXYw9DHjA2JKRNS9KrKfbUzWuqnr7bHwfGrPXMZP5quyZAy4KUVY8UwLp5RrwHtBguPc24sRTc",
    "metadataAddress": "8Wqqw3FxWPJyaM7dE8QhNCJFcaNZ6TbQmoK7xQXANJ2Y",
    "creationTime": "15.24",
    "timestamp": 1718939738597
  },
  "webhookId": "wh_1234567890",
  "timestamp": 1718939738597
}
```

## Transaction Debugging

Debug transaction status and details using:

```javascript
// Get transaction status
const status = await solanaInstance.getTransactionStatus(signature);

// Get detailed transaction information
const details = await fetch(`https://your-api.com/api/tokens/transaction/${signature}`);
```

## Automatic Retry for Failed Transactions

When `enableAutoRetry` is set to `true`, the system will:

1. Detect failed transactions due to network congestion
2. Attempt to retry them with exponential backoff
3. Notify about retry status via webhook

Configure retry parameters:

```javascript
// In solana-integration.js
this.alchemyConfig = {
    // ... other config
    maxRetries: 3,     // Maximum retry attempts
    retryDelay: 2000   // Initial delay between retries (ms)
};
```

## IPFS Metadata Validation

The system validates IPFS metadata before token creation:

```javascript
// Manual validation
const isValid = await solanaInstance.validateIpfsMetadata(metadataUri);
```

This validation:
1. Checks if the URI is properly formatted
2. Attempts to access the metadata via public IPFS gateways
3. Prevents minting if metadata is inaccessible

## Best Practices

1. **Error Handling**: Always handle webhook delivery failures gracefully
2. **Idempotency**: Design your webhook handlers to be idempotent (can receive the same event multiple times)
3. **Monitoring**: Set up alerts for failed transactions
4. **Scaling**: For high-volume applications, use a queue system for webhook processing

## Troubleshooting

Common issues:

- **Webhook not receiving events**: Verify the URL is publicly accessible and properly configured
- **Transaction monitoring not working**: Check Alchemy API key permissions and network connectivity
- **Retry mechanism not triggered**: Ensure error type matches the retry conditions

## Support

For issues with this integration, please contact:
- Alchemy Support: https://dashboard.alchemy.com/support
- SolMeme Creator Support: support@solmeme-creator.com