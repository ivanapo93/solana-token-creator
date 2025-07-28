import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
};

// Get token metadata from database
const getTokenMetadata = async (mintAddress: string) => {
  try {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .eq('mint_address', mintAddress)
      .single();
      
    if (error) {
      throw error;
    }
    
    if (!data) {
      throw new Error('Token not found');
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get token metadata', { error: error.message });
    throw error;
  }
};

// Format token metadata in Metaplex format
const formatMetaplexMetadata = (tokenData: any) => {
  // Format the metadata according to Metaplex standards
  const metadata = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    description: tokenData.description,
    image: tokenData.image_url,
    attributes: [
      {
        trait_type: 'Creator',
        value: tokenData.creator
      },
      {
        trait_type: 'Creation Date',
        value: new Date(tokenData.created_at).toISOString().split('T')[0]
      },
      {
        trait_type: 'Network',
        value: 'Solana'
      },
      {
        trait_type: 'Standard',
        value: 'SPL Token'
      }
    ],
    properties: {
      files: [
        {
          uri: tokenData.image_url,
          type: 'image/png'
        }
      ],
      category: 'image',
      creators: [
        {
          address: tokenData.creator,
          verified: false,
          share: 100
        }
      ]
    }
  };

  // Add website to metadata if provided
  if (tokenData.website) {
    metadata.external_url = tokenData.website;
  }

  // Add social links to metadata if provided
  if (tokenData.social_links) {
    metadata.properties.links = tokenData.social_links;
  }

  // Add Dexscreener compatibility
  metadata.extensions = {
    dexscreener: {
      enabled: true,
      prepared: true,
      metadata_standard: 'metaplex',
      social_links: metadata.properties.links || {}
    }
  };

  return metadata;
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    const url = new URL(req.url);
    const mintAddress = url.pathname.split('/').pop();
    
    if (!mintAddress) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing mint address' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }
    
    // Get token data from database
    const tokenData = await getTokenMetadata(mintAddress);
    
    // Format metadata in Metaplex format
    const metadata = formatMetaplexMetadata(tokenData);
    
    // Return metadata directly for compatibility with Metaplex tools
    return new Response(JSON.stringify(metadata), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('Error getting token metadata:', error);
    
    if (error.message === 'Token not found') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token not found'
      }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: Deno.env.get('NODE_ENV') === 'development' ? error.message : undefined
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});