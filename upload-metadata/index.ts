import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://deno.land/std@0.188.0/uuid/mod.ts";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
};

// Function to simulate Arweave upload
// In a real implementation, this would use actual Arweave SDK or service
const uploadToArweave = async (metadata: any) => {
  try {
    console.log('Uploading metadata to Arweave (simulated)');
    
    // Generate a UUID to simulate Arweave transaction ID
    const txId = uuidv4().replace(/-/g, '');
    
    // Store metadata in Supabase for retrieval
    const { data, error } = await supabase
      .from('metadata')
      .insert([{
        id: txId,
        metadata: metadata,
        type: 'token',
        created_at: new Date().toISOString()
      }]);
    
    if (error) {
      throw error;
    }
    
    // Simulate slight delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Format as Arweave URI
    const uri = `https://arweave.net/${txId}`;
    console.log('Metadata uploaded to:', uri);
    
    return uri;
  } catch (error) {
    console.error('Arweave upload failed:', error);
    throw new Error(`Metadata upload failed: ${error.message}`);
  }
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method === 'POST') {
      // For metadata upload
      const requestData = await req.json();
      
      // Validate required fields
      if (!requestData || !requestData.metadata) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing required metadata field' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
      
      // Upload metadata to Arweave (simulated)
      const uri = await uploadToArweave(requestData.metadata);
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          uri,
          metadata: requestData.metadata
        },
        message: "Metadata uploaded successfully"
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
      
    } else if (req.method === 'GET') {
      // For retrieving metadata by ID
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      
      if (!id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing required id parameter' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
      
      // Retrieve metadata from Supabase
      const { data, error } = await supabase
        .from('metadata')
        .select('metadata')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Metadata not found' 
        }), { 
          status: 404, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
      
      // Return the metadata directly for Metaplex compatibility
      return new Response(JSON.stringify(data.metadata), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('Error in upload-metadata service:', error);
    
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