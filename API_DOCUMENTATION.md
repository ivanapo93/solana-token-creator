# 📚 SolMeme Creator API Documentation

**Complete API reference for the SolMeme Creator backend service.**

## 🌐 Base URL

```
Production: https://yourdomain.com/api
Development: http://localhost:3001/api
```

## 🔐 Authentication

### Overview
The API uses JWT-based authentication with Solana wallet signature verification.

### Authentication Flow
1. **Get Challenge**: Request authentication challenge
2. **Sign Message**: Sign challenge with Phantom wallet
3. **Login**: Send signed message to get JWT token
4. **Use Token**: Include JWT in `Authorization` header

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 🔑 Authentication Endpoints

### Get Authentication Challenge

**Endpoint:** `POST /auth/challenge`

Generate a challenge message for wallet signature authentication.

#### Request Body
```json
{
  "walletAddress": "string" // Solana wallet address (32-44 chars)
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "message": "Sign this message to authenticate with SolMeme Creator...",
    "timestamp": 1699123456789,
    "nonce": "abc123xyz",
    "walletAddress": "8K7qY...", 
  },
  "instructions": "Sign this message with your wallet to authenticate..."
}
```

#### Example
```javascript
const response = await fetch('/api/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '8K7qY1ZZ1aXjKGGQ3t2m8jQ5K2bD9VYv6pZ4hTqK7Mh9'
  })
});
```

---

### Wallet Login

**Endpoint:** `POST /auth/login`

Authenticate wallet with signed challenge message.

#### Request Body
```json
{
  "walletAddress": "string",    // Solana wallet address
  "signature": "string",        // Base58 encoded signature
  "message": "string",          // Original challenge message
  "timestamp": "number"         // Challenge timestamp
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "sessionId": "uuid-v4",
    "walletAddress": "8K7qY...",
    "expiresIn": "24h",
    "loginAt": "2023-11-01T12:00:00.000Z"
  },
  "message": "Login successful"
}
```

#### Example
```javascript
// Sign message with Phantom
const signedMessage = await window.solana.signMessage(
  new TextEncoder().encode(challenge.message),
  'utf8'
);

// Login request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '8K7qY...',
    signature: bs58.encode(signedMessage.signature),
    message: challenge.message,
    timestamp: challenge.timestamp
  })
});
```

---

### Verify Session

**Endpoint:** `GET /auth/verify`

Verify current authentication session.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-v4",
    "walletAddress": "8K7qY...",
    "authenticated": true,
    "session": {
      "loginAt": "2023-11-01T12:00:00.000Z",
      "lastActivity": "2023-11-01T12:30:00.000Z"
    }
  },
  "message": "Session is valid"
}
```

---

### Logout

**Endpoint:** `POST /auth/logout`

Invalidate current session.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### User Profile

**Endpoint:** `GET /auth/profile`

Get authenticated user's profile information.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "success": true,
  "data": {
    "walletAddress": "8K7qY...",
    "firstLogin": "2023-10-01T10:00:00.000Z",
    "lastLogin": "2023-11-01T12:00:00.000Z",
    "loginCount": 42,
    "preferences": {
      "theme": "light",
      "notifications": true,
      "defaultImageProvider": "openai"
    },
    "stats": {
      "tokensCreated": 15,
      "imagesGenerated": 23,
      "totalSpent": 0.125
    }
  }
}
```

---

### Update Profile

**Endpoint:** `PUT /auth/profile`

Update user preferences.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "preferences": {
    "theme": "dark",              // "light" | "dark"
    "notifications": false,       // boolean
    "defaultImageProvider": "stability" // "openai" | "stability"
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "notifications": false,
    "defaultImageProvider": "stability"
  },
  "message": "Preferences updated successfully"
}
```

---

## 🪙 Token Endpoints

### Create Token

**Endpoint:** `POST /tokens/create`

Create a new SPL token on Solana mainnet with metadata.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "name": "string",             // Token name (1-32 chars)
  "symbol": "string",           // Token symbol (1-10 alphanumeric)
  "description": "string",      // Token description (1-1000 chars)
  "decimals": 9,               // Optional: Token decimals (0-18)
  "supply": 1000000000,        // Optional: Initial supply
  "imagePrompt": "string",     // Optional: AI image prompt (max 500 chars)
  "useAI": true,               // Optional: Use AI for image generation
  "walletAddress": "string",   // Creator wallet address
  "imageUrl": "string"         // Optional: Custom image URL
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "name": "My Token",
    "symbol": "MTK",
    "description": "A revolutionary token",
    "imageUrl": "https://arweave.net/abc123",
    "metadataUri": "https://arweave.net/metadata123",
    "transactionSignature": "5VERv8NMvQXs9VqcVZeYBorhHvTKkMV3ajsnpQpHzx8BoBm",
    "explorerUrl": "https://solscan.io/token/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "raydiumUrl": "https://raydium.io/liquidity/create/?token=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "createdAt": "2023-11-01T12:00:00.000Z"
  },
  "message": "Token 'My Token' (MTK) created successfully!"
}
```

#### Example
```javascript
const response = await fetch('/api/tokens/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Amazing Token',
    symbol: 'AMZG',
    description: 'An amazing cryptocurrency token',
    useAI: true,
    imagePrompt: 'futuristic cryptocurrency logo',
    walletAddress: '8K7qY1ZZ1aXjKGGQ3t2m8jQ5K2bD9VYv6pZ4hTqK7Mh9'
  })
});
```

---

### Get Token Info

**Endpoint:** `GET /tokens/:mintAddress`

Get detailed information about a specific token.

#### Parameters
- `mintAddress` (path): Token mint address (32-44 chars)

#### Response
```json
{
  "success": true,
  "data": {
    "id": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "name": "My Token",
    "symbol": "MTK",
    "description": "A revolutionary token",
    "decimals": 9,
    "supply": "1000000000",
    "creator": "8K7qY...",
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "metadataUri": "https://arweave.net/metadata123",
    "imageUrl": "https://arweave.net/abc123",
    "transactionSignature": "5VERv8NMvQXs...",
    "createdAt": "2023-11-01T12:00:00.000Z",
    "network": "solana-mainnet",
    "status": "completed",
    "explorerUrl": "https://solscan.io/token/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "raydiumUrl": "https://raydium.io/liquidity/create/?token=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
  }
}
```

---

### Get User Tokens

**Endpoint:** `GET /tokens/user/:walletAddress`

Get all tokens created by a specific wallet address.

#### Parameters
- `walletAddress` (path): Creator wallet address

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)

#### Response
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "id": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "name": "My Token",
        "symbol": "MTK",
        "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        "createdAt": "2023-11-01T12:00:00.000Z",
        "status": "completed"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": true
  }
}
```

---

### Get Token Metadata

**Endpoint:** `GET /tokens/:mintAddress/metadata`

Get token metadata from decentralized storage.

#### Parameters
- `mintAddress` (path): Token mint address

#### Response
```json
{
  "success": true,
  "data": {
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "metadataUri": "https://arweave.net/metadata123",
    "metadata": {
      "name": "My Token",
      "symbol": "MTK",
      "description": "A revolutionary token",
      "image": "https://arweave.net/abc123",
      "attributes": [
        { "trait_type": "Creator", "value": "8K7qY..." },
        { "trait_type": "Creation Date", "value": "2023-11-01T12:00:00.000Z" },
        { "trait_type": "Network", "value": "Solana" }
      ],
      "properties": {
        "files": [
          {
            "uri": "https://arweave.net/abc123",
            "type": "image/png"
          }
        ],
        "category": "image",
        "creators": [
          {
            "address": "8K7qY...",
            "share": 100
          }
        ]
      }
    }
  }
}
```

---

### Mint Additional Tokens

**Endpoint:** `POST /tokens/:mintAddress/mint`

Mint additional tokens (requires mint authority).

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Parameters
- `mintAddress` (path): Token mint address

#### Request Body
```json
{
  "amount": 1000000,           // Amount to mint
  "destination": "string"      // Destination wallet address
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "destination": "8K7qY...",
    "amount": 1000000,
    "transactionSignature": "5VERv8NMvQXs...",
    "explorerUrl": "https://solscan.io/tx/5VERv8NMvQXs..."
  },
  "message": "Successfully minted 1000000 tokens"
}
```

---

## 🎨 Image Endpoints

### Generate AI Image

**Endpoint:** `POST /images/generate`

Generate AI images for token logos using OpenAI DALL-E or Stability AI.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "prompt": "string",          // Image description (5-500 chars)
  "style": "string",           // Optional: "realistic" | "cartoon" | "abstract" | "minimalist" | "cyberpunk" | "retro"
  "size": "string",            // Optional: "256x256" | "512x512" | "1024x1024"
  "count": 1                   // Optional: Number of images (1-4)
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "uuid-v4",
        "url": "https://openai-generated-url.com/image.png",
        "storageUrl": "https://arweave.net/abc123",
        "prompt": "cryptocurrency token logo",
        "style": "realistic",
        "size": "512x512",
        "index": 1
      }
    ],
    "prompt": "cryptocurrency token logo",
    "style": "realistic",
    "size": "512x512",
    "generatedAt": "2023-11-01T12:00:00.000Z"
  },
  "message": "Generated 1 image(s) successfully"
}
```

#### Example
```javascript
const response = await fetch('/api/images/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'futuristic cryptocurrency logo with geometric patterns',
    style: 'realistic',
    size: '512x512',
    count: 1
  })
});
```

---

### Upload Image

**Endpoint:** `POST /images/upload`

Upload custom images for tokens.

#### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### Request Body
```
Form Data:
- image: File (JPEG, PNG, WebP, GIF, max 5MB)
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "filename": "token-image-uuid.png",
    "originalName": "my-logo.png",
    "url": "https://arweave.net/uploaded-image",
    "size": 204800,
    "dimensions": "512x512",
    "uploadedAt": "2023-11-01T12:00:00.000Z"
  },
  "message": "Image uploaded successfully"
}
```

#### Example
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/images/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`
  },
  body: formData
});
```

---

### Optimize Image

**Endpoint:** `POST /images/optimize`

Optimize images for token usage.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Request Body
```json
{
  "imageUrl": "string",        // URL of image to optimize
  "width": 512,               // Optional: Target width (100-2048)
  "height": 512,              // Optional: Target height (100-2048)
  "quality": 90               // Optional: Quality (10-100)
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "originalUrl": "https://example.com/original.jpg",
    "optimizedUrl": "https://arweave.net/optimized",
    "originalSize": 1048576,
    "optimizedSize": 204800,
    "compression": 80,
    "dimensions": "512x512",
    "quality": 90,
    "optimizedAt": "2023-11-01T12:00:00.000Z"
  },
  "message": "Image optimized successfully"
}
```

---

### Image Templates

**Endpoint:** `GET /images/templates`

Get predefined image templates for different token categories.

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "defi",
      "name": "DeFi Token",
      "description": "Professional DeFi-themed token designs",
      "preview": "https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=DeFi",
      "prompts": [
        "futuristic financial graph, blue and gold, cryptocurrency symbol",
        "abstract blockchain network, geometric patterns, professional"
      ]
    },
    {
      "id": "gaming",
      "name": "Gaming Token", 
      "description": "Gaming and metaverse-inspired designs",
      "preview": "https://via.placeholder.com/200x200/8B5CF6/FFFFFF?text=GAME",
      "prompts": [
        "fantasy game emblem, magical symbols, vibrant colors",
        "cyberpunk gaming logo, neon effects, futuristic"
      ]
    }
  ],
  "message": "Image templates retrieved successfully"
}
```

---

## 🏥 Health & System Endpoints

### Basic Health Check

**Endpoint:** `GET /health`

Basic service health check.

#### Response
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-11-01T12:00:00.000Z",
    "uptime": 3600.123,
    "version": "1.0.0",
    "environment": "production",
    "responseTime": 15
  },
  "message": "Service is healthy"
}
```

---

### Detailed Health Check

**Endpoint:** `GET /health/detailed`

Comprehensive system status check.

#### Response
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-11-01T12:00:00.000Z",
    "uptime": 3600.123,
    "version": "1.0.0",
    "environment": "production",
    "responseTime": 25,
    "services": {
      "solana": {
        "status": "healthy",
        "data": {
          "healthy": true,
          "slot": 123456789,
          "epoch": 456
        }
      },
      "storage": {
        "status": "healthy",
        "data": {
          "arweave": { "available": true },
          "ipfs": { "available": true, "connected": true }
        }
      },
      "database": {
        "status": "healthy",
        "data": {
          "type": "file-based",
          "available": true
        }
      }
    },
    "dependencies": {
      "openai": {
        "configured": true,
        "status": "configured"
      },
      "stability": {
        "configured": true,
        "status": "configured"
      },
      "arweave": {
        "configured": true,
        "status": "configured"
      }
    }
  },
  "message": "Service is healthy"
}
```

---

### Readiness Check

**Endpoint:** `GET /health/ready`

Check if service is ready to handle requests.

#### Response
```json
{
  "success": true,
  "data": {
    "ready": true,
    "timestamp": "2023-11-01T12:00:00.000Z",
    "checks": {
      "solana_rpc": true,
      "solana_wallet": true,
      "jwt_secret": true,
      "ai_service": true,
      "storage_service": true
    }
  },
  "message": "Service is ready"
}
```

---

### System Metrics

**Endpoint:** `GET /health/metrics`

Get system performance metrics.

#### Response
```json
{
  "success": true,
  "data": {
    "timestamp": "2023-11-01T12:00:00.000Z",
    "system": {
      "uptime": 3600.123,
      "memory": {
        "rss": 67108864,
        "heapTotal": 33554432,
        "heapUsed": 16777216
      },
      "cpu": {
        "user": 1234567,
        "system": 987654
      },
      "nodeVersion": "v18.17.0",
      "platform": "linux",
      "arch": "x64"
    },
    "application": {
      "totalTokens": 1500,
      "totalUsers": 250,
      "successfulTokens": 1485,
      "failedTokens": 15,
      "tokens24h": 45,
      "tokens7d": 289,
      "tokens30d": 1200
    }
  },
  "message": "Metrics retrieved successfully"
}
```

---

## ❌ Error Responses

### Error Format
All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2023-11-01T12:00:00.000Z",
  "requestId": "uuid-v4"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Access denied |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service temporarily unavailable |

### Error Codes

#### Authentication Errors
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Access denied
- `INVALID_SIGNATURE` - Wallet signature verification failed
- `SESSION_EXPIRED` - Session has expired

#### Validation Errors
- `VALIDATION_ERROR` - Request validation failed
- `INVALID_WALLET_ADDRESS` - Invalid Solana address format
- `INVALID_TOKEN_DATA` - Invalid token parameters

#### Blockchain Errors
- `SOLANA_ERROR` - General Solana blockchain error
- `INSUFFICIENT_FUNDS` - Not enough SOL for transaction
- `TOKEN_CREATION_FAILED` - Token creation failed
- `NETWORK_ERROR` - Blockchain network issues

#### Service Errors
- `AI_SERVICE_ERROR` - AI image generation failed
- `STORAGE_ERROR` - Decentralized storage error
- `RATE_LIMIT` - API rate limit exceeded
- `SERVICE_UNAVAILABLE` - External service unavailable

### Example Error Responses

#### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "timestamp": "2023-11-01T12:00:00.000Z",
  "requestId": "uuid-v4",
  "details": [
    {
      "field": "name",
      "message": "Token name must be between 1 and 32 characters"
    }
  ]
}
```

#### Authentication Error
```json
{
  "success": false,
  "error": "Invalid signature",
  "code": "INVALID_SIGNATURE",
  "timestamp": "2023-11-01T12:00:00.000Z",
  "requestId": "uuid-v4"
}
```

#### Rate Limit Error
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "timestamp": "2023-11-01T12:00:00.000Z",
  "requestId": "uuid-v4",
  "retryAfter": 60
}
```

---

## 📝 Examples

### Complete Token Creation Flow

```javascript
// 1. Get authentication challenge
const challengeResponse = await fetch('/api/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'your_wallet_address'
  })
});
const challenge = await challengeResponse.json();

// 2. Sign message with Phantom
const signedMessage = await window.solana.signMessage(
  new TextEncoder().encode(challenge.data.message),
  'utf8'
);

// 3. Login with signed message
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: 'your_wallet_address',
    signature: bs58.encode(signedMessage.signature),
    message: challenge.data.message,
    timestamp: challenge.data.timestamp
  })
});
const authData = await loginResponse.json();

// 4. Create token
const tokenResponse = await fetch('/api/tokens/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authData.data.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Amazing Token',
    symbol: 'MAT', 
    description: 'A revolutionary cryptocurrency token',
    useAI: true,
    imagePrompt: 'futuristic crypto logo',
    walletAddress: 'your_wallet_address'
  })
});
const tokenData = await tokenResponse.json();

console.log('Token created:', tokenData.data.mintAddress);
```

### Image Generation Example

```javascript
// Generate AI image
const imageResponse = await fetch('/api/images/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'professional cryptocurrency logo, blue and gold, geometric design',
    style: 'realistic',
    size: '512x512',
    count: 1
  })
});
const imageData = await imageResponse.json();

// Use generated image in token creation
const tokenResponse = await fetch('/api/tokens/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Visual Token',
    symbol: 'VTK',
    description: 'Token with AI-generated image',
    imageUrl: imageData.data.images[0].storageUrl,
    walletAddress: 'your_wallet_address'
  })
});
```

---

## 🔄 Rate Limits

### Default Limits

| Endpoint | Limit | Window |
|----------|--------|---------|
| Authentication | 10 requests | 15 minutes |
| Token Creation | 10 tokens | 1 hour |
| Image Generation | 50 images | 1 hour |
| General API | 100 requests | 15 minutes |

### Rate Limit Headers

Response headers include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699123456
```

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retryAfter": 900
}
```

---

## 🛠️ SDKs and Libraries

### JavaScript/TypeScript SDK

```javascript
import { SolMemeCreatorAPI } from 'solmeme-creator-sdk';

const api = new SolMemeCreatorAPI({
  baseURL: 'https://api.solmeme.com',
  // Will be automatically set after authentication
  authToken: null
});

// Authenticate
const authData = await api.auth.loginWithWallet(walletAddress, signMessage);

// Create token
const token = await api.tokens.create({
  name: 'My Token',
  symbol: 'MTK',
  description: 'Amazing token',
  useAI: true
});
```

### Python SDK

```python
from solmeme_creator import SolMemeCreatorAPI

api = SolMemeCreatorAPI(base_url='https://api.solmeme.com')

# Authenticate
auth_data = api.auth.login_with_wallet(wallet_address, signature, message)

# Create token
token = api.tokens.create(
    name='My Token',
    symbol='MTK', 
    description='Amazing token',
    use_ai=True
)
```

---

## 📞 Support

### API Support
- **Documentation Issues**: [GitHub Issues](https://github.com/yourusername/solmeme-creator/issues)
- **API Questions**: [GitHub Discussions](https://github.com/yourusername/solmeme-creator/discussions)

### Rate Limit Increases
Contact support for higher rate limits:
- **Email**: api-support@solmeme.com
- **Include**: Use case, expected volume, wallet address

### Integration Support
- **Custom Integration**: Enterprise support available
- **Technical Consulting**: Architecture and implementation guidance

---

*API Documentation v1.0.0 - Last updated: November 2023*