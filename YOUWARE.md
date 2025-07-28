# SolMeme Creator Project Guide

## Project Overview

SolMeme Creator is a comprehensive Solana token creation platform with multiple integration approaches:

1. **Helius API Integration**: REST API approach for simplified token creation
2. **Direct SPL Token Integration**: Native Solana Web3.js approach for full control
3. **Promotional Website Generation**: Automated marketing site creation with backend infrastructure

## Development Commands

### Setup and Installation
```bash
# Install all dependencies
npm install

# Run setup validation
npm run setup

# Install SPL token dependencies specifically
npm run install-spl-deps

# Validate Node.js imports
npm run verify-imports
```

### Development and Testing
```bash
# Start development server
npm run dev

# Run health checks
npm run health-check

# Test SPL token functionality
npm run test-spl-token

# Test modern createMint functionality
npm run test-createMint

# Local HTTP server for frontend testing
python -m http.server 8000
# OR
npx http-server -p 8000
```

### Database and Backend Setup
```bash
# Display database setup instructions
npm run db-setup

# Note: Actual database setup requires manual SQL execution in Supabase
# See BACKEND_SETUP_GUIDE.md for complete instructions
```

## Core Architecture

### Dual Token Creation Approaches

**1. Helius API Approach** (`helius-token-*.html` files):
- Simplified REST API integration
- Handles metadata and IPFS automatically
- Best for rapid prototyping and simple use cases
- Endpoint: `https://api.helius.xyz/v0/token/mint`

**2. Direct SPL Token Approach** (`spl-token-minter.js`, `modern-spl-token-integration.js`):
- Full control over Solana Web3.js and SPL Token libraries
- Direct blockchain interaction with custom RPC endpoints
- Supports complex authority management and custom token features
- Requires wallet connection and transaction signing

### Backend Infrastructure

**Node.js/Express Backend** (`server.js`, `services/`, `routes/`):
- RESTful API for promotional website generation
- Database integration with Supabase
- File upload and processing capabilities
- Authentication and rate limiting

**Service Architecture**:
```
services/
├── databaseService.js     # Supabase database operations
├── imageService.js        # Image processing and optimization
├── solanaService.js       # Blockchain interactions
├── storageService.js      # File storage management
└── telegramService.js     # Notification services
```

## Key Integration Points

### Wallet Integration Patterns

**Phantom Wallet Connection**:
```javascript
// Standard wallet connection for SPL token creation
wallet: window.solana // Phantom injected object
```

**Authentication Flow**:
```javascript
// Challenge-response authentication for backend APIs
POST /api/auth/challenge
POST /api/auth/login
```

### Token Creation Workflows

**Helius API Flow**:
1. Prepare token metadata
2. POST to Helius endpoint
3. Handle response with mint address and transaction

**Direct SPL Flow**:
1. Connect Phantom wallet
2. Create mint account with @solana/spl-token
3. Mint initial supply to associated token account
4. Optionally revoke authorities

### Testing Strategy

**Frontend Testing**:
- `test-*-final.html`: Comprehensive workflow testing
- `test-empty-social-links.html`: Optional fields validation
- `test-validation-complete.html`: Input validation testing

**Backend Testing**:
- `test-installation-verification.js`: Dependency verification
- Health check endpoints for monitoring

## Environment Configuration

### Required Environment Variables

**For Helius Integration**:
```bash
# Helius API configuration
HELIUS_API_KEY=your_api_key
```

**For Direct SPL Integration**:
```bash
# Solana RPC configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# or custom RPC endpoint for better performance
```

**For Backend Services**:
```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Authentication
JWT_SECRET=your_jwt_secret

# External Services
TELEGRAM_BOT_TOKEN=your_bot_token (optional)
```

## Production Deployment Considerations

### Dependency Management
- **@solana/web3.js**: Core Solana blockchain interaction
- **@solana/spl-token**: SPL token standard implementation
- **@metaplex-foundation/***: NFT metadata standards (if using)

### RPC Endpoint Strategy
- **Development**: Free public endpoints (rate limited)
- **Production**: Paid RPC providers (Helius, QuickNode, Alchemy)
- **Fallback**: Multiple endpoint configuration for reliability

### Frontend Deployment
- Static HTML/CSS/JS files can be deployed to any hosting platform
- CDN deployment recommended for global performance
- HTTPS required for wallet integration

### Backend Deployment
- Node.js application requires server environment
- Database requires Supabase project setup (see BACKEND_SETUP_GUIDE.md)
- Environment variables must be configured securely

## Error Handling Patterns

### Wallet Errors
```javascript
// Standard wallet error handling
try {
    await window.solana.connect();
} catch (error) {
    if (error.code === 4001) {
        // User rejected connection
    }
}
```

### RPC Errors
```javascript
// Transaction failure handling
try {
    const signature = await connection.sendTransaction(transaction, [wallet]);
    await connection.confirmTransaction(signature);
} catch (error) {
    // Handle network issues, insufficient funds, etc.
}
```

### API Integration Errors
```javascript
// Helius API error handling
const response = await fetch(apiUrl, options);
if (!response.ok) {
    const errorData = await response.json();
    // Handle specific error codes
}
```