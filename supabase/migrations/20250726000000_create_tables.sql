-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  decimals INTEGER DEFAULT 9,
  supply BIGINT DEFAULT 1000000000,
  transaction_fee_percentage NUMERIC(5,2) DEFAULT 0,
  token_type TEXT DEFAULT 'SPL',
  fee_collector_wallet TEXT,
  creator TEXT NOT NULL,
  mint_address TEXT UNIQUE NOT NULL,
  metadata_uri TEXT,
  image_url TEXT,
  transaction_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  network TEXT DEFAULT 'solana-mainnet',
  status TEXT DEFAULT 'completed',
  website TEXT,
  social_links JSONB,
  skip_website BOOLEAN DEFAULT false,
  skip_socials BOOLEAN DEFAULT false,
  metadata_locked BOOLEAN DEFAULT false,
  mint_authority_revoked BOOLEAN DEFAULT false,
  freeze_authority_revoked BOOLEAN DEFAULT false,
  dexscreener_submitted BOOLEAN DEFAULT false,
  dexscreener_eligible BOOLEAN DEFAULT true
);

-- Create sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  message TEXT NOT NULL,
  signature TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT
);

-- Create images table for storing generated images
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  prompt TEXT,
  provider TEXT DEFAULT 'openai',
  token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create metadata table for storing token metadata
CREATE TABLE IF NOT EXISTS metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metadata JSONB NOT NULL,
  type TEXT DEFAULT 'token',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a health check table
CREATE TABLE IF NOT EXISTS health (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'ok',
  message TEXT,
  CHECK (id = 1)
);

-- Insert initial health record
INSERT INTO health (id, last_check, status, message)
VALUES (1, now(), 'ok', 'System initialized')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies
-- Allow public read access to tokens
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tokens_select_policy ON tokens FOR SELECT USING (true);
CREATE POLICY tokens_insert_policy ON tokens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tokens_update_policy ON tokens FOR UPDATE USING (creator = auth.uid()::text);

-- Enable RLS on sessions table with strict policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_select_policy ON sessions FOR SELECT USING (wallet_address = auth.uid()::text);
CREATE POLICY sessions_insert_policy ON sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY sessions_update_policy ON sessions FOR UPDATE USING (wallet_address = auth.uid()::text);
CREATE POLICY sessions_delete_policy ON sessions FOR DELETE USING (wallet_address = auth.uid()::text);

-- Allow public access to health check
ALTER TABLE health ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_select_policy ON health FOR SELECT USING (true);
CREATE POLICY health_update_policy ON health FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create indexes
CREATE INDEX IF NOT EXISTS tokens_creator_idx ON tokens(creator);
CREATE INDEX IF NOT EXISTS tokens_mint_address_idx ON tokens(mint_address);
CREATE INDEX IF NOT EXISTS tokens_symbol_idx ON tokens(symbol);
CREATE INDEX IF NOT EXISTS tokens_created_at_idx ON tokens(created_at);
CREATE INDEX IF NOT EXISTS sessions_wallet_address_idx ON sessions(wallet_address);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);