# Environment Setup Guide

This guide explains how to set up the required environment variables for the SolMeme Creator project with Supabase Edge Functions.

## Required Environment Variables

### Solana Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SOLANA_RPC_URL` | Solana RPC endpoint URL | Yes |
| `SOLANA_PRIVATE_KEY` | Base58-encoded Solana private key | Yes |

### IPFS/Storage Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `PINATA_API_KEY` | Pinata API key | No |
| `PINATA_SECRET_KEY` | Pinata Secret API key | No |
| `NFT_STORAGE_TOKEN` | NFT.Storage API token | No |
| `WEB3_STORAGE_TOKEN` | Web3.Storage API token | No |

### AI Image Generation

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for DALL-E image generation | Yes |

### Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `JWT_SECRET` | Secret key for JWT token signing | Yes |

### Database Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Auto-configured |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Auto-configured |

### General Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (`development` or `production`) | No (defaults to `development`) |

## Setting Up Variables in Supabase

To set environment variables for your Supabase Edge Functions:

```bash
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key
supabase secrets set OPENAI_API_KEY=your_openai_key
supabase secrets set JWT_SECRET=your_jwt_secret
```

## Local Development Environment

For local development, create a `.env.local` file in your project root:

```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_base58_private_key
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
```

Then run the functions locally with:

```bash
supabase functions serve --env-file .env.local
```

## Setting Up a Solana Wallet for Development

1. Generate a new Solana keypair:
   ```bash
   solana-keygen new --outfile dev-wallet.json
   ```

2. Export the private key in Base58 format:
   ```bash
   solana-keygen pubkey --outfile pubkey.txt dev-wallet.json
   PRIVATE_KEY=$(solana-keygen dump-keypair dev-wallet.json | grep -o '\[.*\]' | tr -d '[],' | tr ' ' '\n' | grep -v '^$' | tr -d '\n')
   echo $PRIVATE_KEY
   ```

3. Fund the wallet with SOL (use a faucet for devnet or transfer real SOL for mainnet)

4. Set the private key in your environment variables

## Production Deployment Security Considerations

For production environments:

1. Use Supabase's encrypted secrets management
2. Regularly rotate your JWT_SECRET
3. Use a dedicated Solana wallet with limited permissions
4. Consider hardware security modules (HSMs) for private key storage
5. Set up access controls for your Supabase project
6. Monitor function logs for unusual activity

## Switching Between Environments

To switch between development and production:

```bash
# Development
supabase functions serve --env-file .env.local

# Production
supabase functions deploy mint-token
```

## Testing Your Configuration

Verify your environment setup with:

```bash
supabase functions serve --env-file .env.local
curl -i http://localhost:54321/functions/v1/health
```

You should receive a `200 OK` response with a JSON object containing the status of all services.