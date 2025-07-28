import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://deno.land/std@0.188.0/uuid/mod.ts";
import nacl from "npm:tweetnacl";
import bs58 from "npm:bs58";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { PublicKey } from "npm:@solana/web3.js";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-requested-with, origin, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400' // 24 hours
};

// Enhanced CORS handling with debugging for preflight requests
const handleCors = (req: Request) => {
  // Generate a request ID for tracking
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  
  // Add request ID to headers
  const headers = { 
    ...corsHeaders,
    'X-Request-ID': requestId
  };
  
  if (req.method === 'OPTIONS') {
    console.log(`🔄 CORS preflight request received [${requestId}]`, {
      origin: req.headers.get('origin'),
      method: req.headers.get('access-control-request-method'),
      headers: req.headers.get('access-control-request-headers')
    });
    
    return new Response('ok', { 
      headers: headers,
      status: 200
    });
  }
  
  // Return the headers for non-OPTIONS requests
  return headers;
};

// Get JWT secret from environment variables
const getJwtSecret = async () => {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  // Convert string to crypto key for JWT
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
};

// Verify wallet signature
const verifyWalletSignature = (message: string, signature: string, publicKey: string) => {
  try {
    // Convert signature and message to Uint8Array
    const signatureUint8 = bs58.decode(signature);
    const messageUint8 = new TextEncoder().encode(message);
    const publicKeyUint8 = new PublicKey(publicKey).toBytes();

    // Verify signature
    return nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
  } catch (error) {
    console.error('Signature verification failed', { 
      error: error.message, 
      publicKey: publicKey?.slice(0, 8) + '...' 
    });
    return false;
  }
};

// Save session to Supabase
const saveSession = async (sessionData: any) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData]);
      
    if (error) {
      throw error;
    }
    
    console.log('Session saved successfully');
    return data;
  } catch (error) {
    console.error('Failed to save session', { error: error.message });
    throw error;
  }
};

// Get session from Supabase
const getSession = async (sessionId: string) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
      
    if (error) {
      return null;
    }
    
    // Check if session is expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      console.log('Session expired', { sessionId });
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get session', { error: error.message });
    return null;
  }
};

serve(async (req) => {
  try {
    // Handle CORS and get headers
    const corsResponse = handleCors(req);
    // If it's an OPTIONS request, we already returned a response
    if (corsResponse instanceof Response) return corsResponse;
    
    // For all other requests, corsResponse contains the CORS headers
    const responseHeaders = corsResponse;
    
    // Add error handling wrapper around fetch operations
    if (typeof fetch === 'function' && typeof window === 'undefined') {
      const originalFetch = fetch;
      // @ts-ignore - Override global fetch with our enhanced version
      fetch = async (url, options = {}) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          
          const modifiedOptions = {
            ...options,
            signal: options.signal || controller.signal
          };
          
          const response = await originalFetch(url, modifiedOptions);
          clearTimeout(timeoutId);
          
          return response;
        } catch (error) {
          console.error(`Fetch error for ${url}:`, error.message);
          throw error;
        }
      };
    }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // Login endpoint
    if (path === 'login' && req.method === 'POST') {
      const { walletAddress, signature, message, timestamp } = await req.json();

      // Validate input
      if (!walletAddress || !signature || !message || !timestamp) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: walletAddress, signature, message, timestamp',
          code: 'VALIDATION_ERROR',
          retryable: true
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...responseHeaders } 
        });
      }

      // Validate wallet address format
      try {
        new PublicKey(walletAddress);
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid wallet address format',
          code: 'INVALID_WALLET',
          retryable: true
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...responseHeaders } 
        });
      }

      // Check timestamp (message should be recent, within 5 minutes)
      const messageTime = new Date(parseInt(timestamp));
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - messageTime.getTime());
      
      if (timeDiff > 5 * 60 * 1000) { // 5 minutes
        return new Response(JSON.stringify({
          success: false,
          error: 'Message timestamp is too old. Please try again.'
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }

      // Verify signature
      const isValidSignature = verifyWalletSignature(message, signature, walletAddress);
      if (!isValidSignature) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid signature'
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }

      // Create session
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
      
      const sessionData = {
        id: sessionId,
        wallet_address: walletAddress,
        message,
        signature,
        timestamp,
        login_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      };

      await saveSession(sessionData);

      // Generate JWT
      const jwtSecret = await getJwtSecret();
      const jwtToken = await create(
        { alg: "HS256", typ: "JWT" },
        { 
          sessionId,
          walletAddress,
          exp: getNumericDate(60 * 60 * 24), // 24 hours
          iss: 'solmeme-creator',
          aud: 'solmeme-app'
        },
        jwtSecret
      );

      console.log('User login successful', { 
        walletAddress: walletAddress.slice(0, 8) + '...',
        sessionId 
      });

      return new Response(JSON.stringify({
        success: true,
        data: {
          token: jwtToken,
          sessionId,
          walletAddress,
          expiresIn: '24h',
          loginAt: sessionData.login_at
        },
        message: 'Login successful'
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
      
    } 
    // Verify endpoint
    else if (path === 'verify' && req.method === 'GET') {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization header missing or invalid format'
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Verify JWT token
      const jwtSecret = await getJwtSecret();
      try {
        const decoded = await verify(token, jwtSecret);
        
        // Check if session exists and is valid
        const session = await getSession(decoded.sessionId);
        if (!session) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Session not found or expired'
          }), { 
            status: 401, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          });
        }
        
        // Return session information
        return new Response(JSON.stringify({
          success: true,
          data: {
            sessionId: decoded.sessionId,
            walletAddress: decoded.walletAddress,
            authenticated: true,
            session
          },
          message: 'Session is valid'
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid or expired token'
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    } 
    // Generate challenge endpoint
    else if (path === 'challenge' && req.method === 'POST') {
      const { walletAddress } = await req.json();
      
      if (!walletAddress) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Wallet address is required'
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
      
      // Generate a challenge message
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with SolMeme Creator: ${timestamp}`;
      
      return new Response(JSON.stringify({
        success: true,
        data: {
          message,
          timestamp
        },
        message: 'Challenge generated successfully'
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    } 
    // Logout endpoint
    else if (path === 'logout' && req.method === 'POST') {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization header missing or invalid format'
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }

      const token = authHeader.split(' ')[1];
      
      // Verify JWT token to get session ID
      const jwtSecret = await getJwtSecret();
      try {
        const decoded = await verify(token, jwtSecret);
        
        // Delete session from database
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', decoded.sessionId);
          
        if (error) {
          console.warn('Error deleting session', { error });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Logout successful'
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      } catch (error) {
        // If token is invalid, just return success anyway
        return new Response(JSON.stringify({
          success: true,
          message: 'Logout successful'
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    }
    
    // Method not allowed
    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found or method not allowed'
    }), { 
      status: 404, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
    
  } catch (error) {
    console.error('Auth service error:', error);
    
    // Enhanced error handling with retry information
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      retryable: true,
      details: Deno.env.get('NODE_ENV') === 'development' ? error.message : undefined,
      code: 'SERVER_ERROR'
    };
    
    // Categorize error types for better client handling
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorResponse.error = 'Network connection error';
      errorResponse.code = 'NETWORK_ERROR';
      errorResponse.retryAfter = 3; // seconds
    } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
      errorResponse.error = 'Request timeout';
      errorResponse.code = 'TIMEOUT';
      errorResponse.retryAfter = 5; // seconds
    } else if (error.message.includes('CORS')) {
      errorResponse.error = 'CORS policy error';
      errorResponse.code = 'CORS_ERROR';
      errorResponse.retryable = false;
    }
    
    return new Response(JSON.stringify(errorResponse), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});