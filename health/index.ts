import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection } from "npm:@solana/web3.js";

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

// Check Supabase connection
const checkSupabase = async () => {
  try {
    const { data, error } = await supabase.from('health').select('count').single();
    return {
      status: error ? 'error' : 'ok',
      error: error ? error.message : null,
      latency: null // Not easily measurable in Deno Edge Function context
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      latency: null
    };
  }
};

// Check Solana connection
const checkSolana = async () => {
  try {
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL") || "https://solana-mainnet.g.alchemy.com/v2/PVF7BjfV8uajJQcxoAN0D";
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const start = Date.now();
    const version = await connection.getVersion();
    const latency = Date.now() - start;
    
    return {
      status: 'ok',
      version: version['solana-core'],
      latency: latency,
      rpcUrl: rpcUrl.replace(/:[^:\/]{1,}@/, ':****@') // Hide API key if present
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      latency: null
    };
  }
};

// Check OpenAI API connection
const checkOpenAI = async () => {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      return {
        status: 'error',
        error: 'API key not configured',
        latency: null
      };
    }
    
    // Just check if API key is available, don't make actual API calls
    return {
      status: 'configured',
      latency: null
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      latency: null
    };
  }
};

// Get deployment information
const getDeploymentInfo = () => {
  return {
    environment: Deno.env.get('NODE_ENV') || 'development',
    region: Deno.env.get('SUPABASE_REGION') || 'unknown',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Run all health checks in parallel
    const [supabaseHealth, solanaHealth, openaiHealth] = await Promise.all([
      checkSupabase(),
      checkSolana(),
      checkOpenAI()
    ]);
    
    // Get deployment info
    const deploymentInfo = getDeploymentInfo();
    
    // Determine overall status
    const overallStatus = 
      supabaseHealth.status === 'ok' && 
      solanaHealth.status === 'ok' ? 'healthy' : 'degraded';
    
    // Create response
    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseHealth,
        solana: solanaHealth,
        openai: openaiHealth
      },
      deployment: deploymentInfo
    };
    
    return new Response(JSON.stringify(response), { 
      status: overallStatus === 'healthy' ? 200 : 503, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return new Response(JSON.stringify({
      status: 'critical',
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});