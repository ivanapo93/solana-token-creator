# SolMeme Creator - Supabase Edge Functions

This project is a Solana token creator with AI image generation capabilities, deployed as Supabase Edge Functions.

## Architecture Overview

The system is architected as a set of microservices implemented as Edge Functions:

1. **mint-token**: Creates SPL tokens on Solana with optional authority revocation
2. **generate-image**: AI-powered token logo generation with DALL-E
3. **upload-metadata**: Token metadata management with Arweave/IPFS simulation
4. **token-metadata**: Metaplex-compliant token metadata server
5. **auth**: JWT-based authentication with Solana wallet signatures
6. **health**: System health monitoring and diagnostics

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Deno](https://deno.land/)
- Supabase project with the following secrets configured:
  - `SOLANA_RPC_URL`: Solana RPC endpoint
  - `SOLANA_PRIVATE_KEY`: Base58-encoded private key for token operations
  - `OPENAI_API_KEY`: OpenAI API key for image generation
  - `JWT_SECRET`: Secret for JWT token signing

## Local Development

1. Start the Supabase local development environment:
   ```bash
   supabase start
   ```

2. Set up environment variables in the Supabase project:
   ```bash
   supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key
   supabase secrets set OPENAI_API_KEY=your_openai_key
   supabase secrets set JWT_SECRET=your_jwt_secret
   ```

3. Start the Edge Functions in development mode:
   ```bash
   supabase functions serve --env-file .env.local
   ```

## Database Setup

The project uses several tables in Supabase PostgreSQL:

1. `tokens`: Stores token creation records
2. `sessions`: Manages authentication sessions
3. `images`: Tracks generated images
4. `metadata`: Stores token metadata

Apply the database migrations:
```bash
supabase db reset
```

## Deployment

Deploy all functions to your Supabase project:
```bash
supabase functions deploy mint-token
supabase functions deploy generate-image
supabase functions deploy upload-metadata
supabase functions deploy token-metadata
supabase functions deploy auth
supabase functions deploy health
```

## Endpoints

### Mint Token
- `POST /functions/v1/mint-token`
  - Creates a new token on Solana blockchain
  - Optional authority revocation parameters

### Generate Image
- `POST /functions/v1/generate-image`
  - Generates AI token logo with DALL-E
  - Falls back to placeholder if AI fails

### Upload Metadata
- `POST /functions/v1/upload-metadata`
  - Stores token metadata for Metaplex compatibility
- `GET /functions/v1/upload-metadata?id=[id]`
  - Retrieves stored metadata

### Token Metadata
- `GET /functions/v1/token-metadata/[mintAddress]`
  - Returns Metaplex-formatted metadata for tokens

### Authentication
- `POST /functions/v1/auth/challenge`
  - Generates a challenge message for wallet signature
- `POST /functions/v1/auth/login`
  - Authenticates using wallet signature
- `GET /functions/v1/auth/verify`
  - Verifies authentication token
- `POST /functions/v1/auth/logout`
  - Ends user session

### Health Check
- `GET /functions/v1/health`
  - Returns system health status

## Frontend Integration

The frontend should use the following sequence for token creation:

1. Authenticate using wallet signature
2. Generate AI image or upload custom logo
3. Upload metadata
4. Create token with optional authority settings
5. Display token information

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SOLANA_RPC_URL` | Solana RPC endpoint | Yes |
| `SOLANA_PRIVATE_KEY` | Base58-encoded private key | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## Security Considerations

- All endpoints are protected with proper CORS headers
- Authentication via cryptographic wallet signatures
- Authority revocation provides irreversible token security
- JWT tokens with short expiration for session management

## Monitoring

Use the health endpoint to monitor system status:
```
GET /functions/v1/health
```

This will return the status of all dependencies and services.