# Supabase Setup Guide for SolMeme Creator

This guide walks you through setting up Supabase for the SolMeme Creator project.

## Create a Supabase Project

1. Sign up or log in to [Supabase](https://supabase.com)
2. Create a new project and note your project URL and API keys

## Database Setup

The required tables are created automatically through migrations, but you need to ensure proper configuration:

### Run Migrations

1. Install the Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Link your local project to your remote Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Apply the database migrations:
   ```bash
   supabase db push
   ```

This will create all necessary tables:
- `tokens` - Store token creation records
- `sessions` - Manage authentication sessions
- `images` - Track generated images
- `metadata` - Store token metadata
- `health` - System health monitoring

## Storage Setup

1. Create the following buckets in Supabase Storage:
   - `token-images` - For storing generated token images
   - `metadata` - For token metadata files

2. Configure public access for these buckets:
   ```sql
   -- Allow public read access to token images
   CREATE POLICY "Token images public access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'token-images');
   
   -- Allow public read access to metadata
   CREATE POLICY "Metadata public access"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'metadata');
   ```

## Edge Functions Deployment

Deploy all required Edge Functions to your Supabase project:

```bash
supabase functions deploy mint-token
supabase functions deploy generate-image
supabase functions deploy upload-metadata
supabase functions deploy token-metadata
supabase functions deploy auth
supabase functions deploy health
```

## Environment Variables

Configure the following secrets for your Edge Functions:

```bash
supabase secrets set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
supabase secrets set SOLANA_PRIVATE_KEY=your_base58_private_key
supabase secrets set OPENAI_API_KEY=your_openai_key
supabase secrets set JWT_SECRET=your_jwt_secret
```

## Authentication Configuration

1. Enable the JWT authentication in your Supabase project
2. Configure JWT settings in the Auth section of your Supabase dashboard
3. Set the JWT expiration time to 24 hours

## Test the Setup

Verify your setup by calling the health endpoint:

```bash
curl https://[your-project-ref].supabase.co/functions/v1/health
```

You should receive a JSON response with the status of all services.

## CORS Configuration

Configure CORS to allow requests from your frontend:

```bash
supabase functions deploy --no-verify-jwt --cors-allowed-origins "*" health
```

For production, replace `"*"` with your actual frontend domain.

## Monitoring and Logs

- Monitor function execution in the Supabase dashboard
- Set up log drains to capture logs in a central system
- Use the health endpoint for system monitoring

## Database Backup

Enable point-in-time recovery for your Supabase database to ensure data safety.

## Frontend Integration

Update your frontend configuration to use the new Supabase Edge Function endpoints:

```javascript
const ENDPOINTS = {
  mintToken: 'https://[your-project-ref].supabase.co/functions/v1/mint-token',
  generateImage: 'https://[your-project-ref].supabase.co/functions/v1/generate-image',
  uploadMetadata: 'https://[your-project-ref].supabase.co/functions/v1/upload-metadata',
  tokenMetadata: 'https://[your-project-ref].supabase.co/functions/v1/token-metadata',
  auth: 'https://[your-project-ref].supabase.co/functions/v1/auth',
  health: 'https://[your-project-ref].supabase.co/functions/v1/health'
};
```