import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction, SystemProgram, LAMPORTS_PER_SOL } from "npm:@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo, createMint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, setAuthority, AuthorityType } from "npm:@solana/spl-token";
import nacl from "npm:tweetnacl";
import bs58 from "npm:bs58";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-requested-with, origin, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400' // 24 hours
};

// Enhanced CORS handling with debugging for preflight requests
const handleCors = (req: Request) => {
  // Generate a request ID for tracking
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  
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

// Validate wallet signature
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

// Save token record to Supabase database
const saveTokenRecord = async (tokenData) => {
  try {
    // Add timestamp if not present
    if (!tokenData.createdAt) {
      tokenData.createdAt = new Date().toISOString();
    }
    
    // Insert token record into tokens table
    const { data, error } = await supabase
      .from('tokens')
      .insert([tokenData]);
      
    if (error) {
      throw error;
    }
    
    console.log('Token record saved', { 
      tokenId: tokenData.id, 
      creator: tokenData.creator?.slice(0, 8) + '...' 
    });

    return data;
  } catch (error) {
    console.error('Failed to save token record', { 
      error: error.message, 
      tokenId: tokenData.id 
    });
    throw new Error(`Failed to save token record: ${error.message}`);
  }
};

// Create token with metadata
const createTokenWithMetadata = async ({
  name,
  symbol,
  uri,
  decimals = 9,
  supply = 1000000000,
  creatorWallet,
  transactionFeePercentage = 0.0,
  feeCollectorWallet = null,
  revokeMintAuthority = false,
  revokeFreezeAuthority = false
}) => {
  try {
    console.log('Creating token with metadata', { 
      name, 
      symbol, 
      decimals, 
      supply, 
      transactionFeePercentage
    });

    // Initialize Solana connection with multiple verified, reliable RPC endpoints
    const rpcEndpoints = [
      "https://solana-mainnet.g.alchemy.com/v2/9UB7l5spSYtK-bF4FCvUY", // Primary Alchemy endpoint
      "https://api.mainnet-beta.solana.com", // Official Solana endpoint
      "https://rpc.ankr.com/solana", // Ankr endpoint (reliable)
      "https://solana.maiziqianbao.net/", // Maiziqi node (good availability)
      "https://solana-api.projectserum.com", // Project Serum endpoint
      "https://ssc-dao.genesysgo.net" // GenesysGo endpoint (reliable)
    ];
    
    // Get configured endpoint or use fallback list
    const configuredRpcUrl = Deno.env.get("SOLANA_RPC_URL");
    const rpcUrl = configuredRpcUrl || rpcEndpoints[0];
    
    let connection;
    let connectionSuccess = false;
    
    // Try each endpoint until one works
    for (let i = 0; i < rpcEndpoints.length && !connectionSuccess; i++) {
      const currentRpcUrl = i === 0 ? rpcUrl : rpcEndpoints[i];
      try {
        console.log(`Trying RPC endpoint: ${currentRpcUrl}`);
        connection = new Connection(currentRpcUrl, 'confirmed');
        
        // Test connection with a simple getVersion call
        const version = await connection.getVersion();
        console.log(`RPC connection successful: ${currentRpcUrl}`, version);
        connectionSuccess = true;
      } catch (error) {
        console.warn(`RPC endpoint failed: ${currentRpcUrl}`, error.message);
        if (i === rpcEndpoints.length - 1) {
          throw new Error(`All RPC endpoints failed. Last error: ${error.message}`);
        }
      }
    }
    
    // Initialize wallet from private key
    const privateKeyString = Deno.env.get("SOLANA_PRIVATE_KEY");
    if (!privateKeyString) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
    }
    
    const wallet = Keypair.fromSecretKey(
      bs58.decode(privateKeyString)
    );

    // Create mint account
    const mint = Keypair.generate();
    console.log('Creating mint account:', mint.publicKey.toString());

    // Create token
    const mintAddress = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      decimals,
      mint,
      { commitment: 'confirmed' },
      TOKEN_PROGRAM_ID
    );

    console.log('Token created:', mintAddress.toString());

    // Create associated token account for creator
    const creatorPublicKey = new PublicKey(creatorWallet);
    const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint.publicKey,
      creatorPublicKey,
      false,
      'confirmed',
      {},
      TOKEN_PROGRAM_ID
    );

    // Mint initial supply to creator
    const mintToSignature = await mintTo(
      connection,
      wallet,
      mint.publicKey,
      creatorTokenAccount.address,
      wallet,
      supply * Math.pow(10, decimals),
      [],
      {},
      TOKEN_PROGRAM_ID
    );

    console.log('Initial supply minted:', mintToSignature);

    // Transaction signatures for client verification
    const authorityRevocationSignatures = [];

    // Revoke mint authority if requested
    if (revokeMintAuthority) {
      console.log('Revoking mint authority...');
      try {
        const revokeMintSignature = await setAuthority(
          connection,
          wallet,
          mint.publicKey,
          wallet.publicKey,
          AuthorityType.MintTokens,
          null, // Setting to null revokes it permanently
          [],
          { commitment: 'confirmed' },
          TOKEN_PROGRAM_ID
        );
        console.log('Mint authority revoked successfully:', revokeMintSignature);
        authorityRevocationSignatures.push({
          type: 'mint',
          signature: revokeMintSignature,
          timestamp: new Date().toISOString()
        });
      } catch (revokeError) {
        console.error('Failed to revoke mint authority:', revokeError.message);
        throw new Error(`Failed to revoke mint authority: ${revokeError.message}`);
      }
    }

    // Revoke freeze authority if requested
    if (revokeFreezeAuthority) {
      console.log('Revoking freeze authority...');
      try {
        const revokeFreezeSignature = await setAuthority(
          connection,
          wallet,
          mint.publicKey,
          wallet.publicKey,
          AuthorityType.FreezeAccount,
          null, // Setting to null revokes it permanently
          [],
          { commitment: 'confirmed' },
          TOKEN_PROGRAM_ID
        );
        console.log('Freeze authority revoked successfully:', revokeFreezeSignature);
        authorityRevocationSignatures.push({
          type: 'freeze',
          signature: revokeFreezeSignature,
          timestamp: new Date().toISOString()
        });
      } catch (revokeError) {
        console.error('Failed to revoke freeze authority:', revokeError.message);
        throw new Error(`Failed to revoke freeze authority: ${revokeError.message}`);
      }
    }

    // Verify authority revocation by checking the mint info
    if (revokeMintAuthority || revokeFreezeAuthority) {
      try {
        const mintInfo = await getMint(
          connection,
          mint.publicKey,
          'confirmed',
          TOKEN_PROGRAM_ID
        );
        
        // Verify mint authority revocation
        if (revokeMintAuthority) {
          const mintAuthorityNull = mintInfo.mintAuthority === null;
          console.log(`Mint authority verification: ${mintAuthorityNull ? 'Successfully revoked' : 'NOT revoked properly'}`);
          
          if (!mintAuthorityNull) {
            console.warn('Warning: Mint authority not properly revoked');
          }
        }
        
        // Verify freeze authority revocation
        if (revokeFreezeAuthority) {
          const freezeAuthorityNull = mintInfo.freezeAuthority === null;
          console.log(`Freeze authority verification: ${freezeAuthorityNull ? 'Successfully revoked' : 'NOT revoked properly'}`);
          
          if (!freezeAuthorityNull) {
            console.warn('Warning: Freeze authority not properly revoked');
          }
        }
      } catch (verifyError) {
        console.warn('Authority revocation verification failed:', verifyError.message);
        // Don't throw, just warn since revocation transactions already completed
      }
    }

    return {
      mintAddress: mint.publicKey.toString(),
      metadataAddress: null, // Metadata would be handled separately in Supabase
      creatorTokenAccount: creatorTokenAccount.address.toString(),
      signature: mintToSignature,
      tokenType: 'SPL',
      transferFeePercentage: 0,
      transactions: {
        mint: 'modern-create-mint-used',
        mintTo: mintToSignature
      }
    };

  } catch (error) {
    console.error('Token creation failed', { 
      error: error.message, 
      stack: error.stack,
      name,
      symbol 
    });
    throw new Error(`Token creation failed: ${error.message}`);
  }
};

// Handle incoming request
serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // Parse request body
    const requestData = await req.json();
    
    // Validate required fields
    const {
      name,
      symbol,
      description,
      decimals = 9,
      supply = 1000000000,
      imagePrompt,
      useAI = true,
      walletAddress,
      imageUrl,
      transactionFeePercentage = 0.0,
      feeCollectorWallet,
      website,
      socialLinks = {},
      skipWebsite = false,
      skipSocials = false,
      signature,
      message,
      revokeMintAuthority = false,
      revokeFreezeAuthority = false,
      revokeUpdateAuthority = false
    } = requestData;
    
    // Validate wallet signature
    if (signature && message) {
      const isValidSignature = verifyWalletSignature(message, signature, walletAddress);
      if (!isValidSignature) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid wallet signature' 
        }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });
      }
    }
    
    // Create token on Solana blockchain
    const metadataUri = requestData.metadataUri || "https://arweave.net/placeholder-uri";
    const tokenResult = await createTokenWithMetadata({
      name,
      symbol,
      uri: metadataUri,
      decimals,
      supply,
      creatorWallet: walletAddress,
      transactionFeePercentage,
      feeCollectorWallet: feeCollectorWallet || walletAddress,
      revokeMintAuthority,
      revokeFreezeAuthority,
      revokeUpdateAuthority: revokeUpdateAuthority || false
    });

    // Save token record to database
    const tokenRecord = {
      id: tokenResult.mintAddress,
      name,
      symbol,
      description,
      decimals,
      supply,
      transactionFeePercentage,
      tokenType: tokenResult.tokenType || 'SPL',
      feeCollectorWallet: tokenResult.feeCollectorWallet || null,
      creator: walletAddress,
      mintAddress: tokenResult.mintAddress,
      metadataUri,
      imageUrl: imageUrl || null,
      transactionSignature: tokenResult.signature,
      createdAt: new Date().toISOString(),
      network: 'solana-mainnet',
      status: 'completed',
      website: (!skipWebsite && website) ? website : null,
      socialLinks: (!skipSocials && socialLinks) ? socialLinks : null,
      skipWebsite: skipWebsite,
      skipSocials: skipSocials
    };

    await saveTokenRecord(tokenRecord);

    // Prepare response data
    const responseData = {
      mintAddress: tokenResult.mintAddress,
      name,
      symbol,
      description,
      imageUrl: imageUrl || null,
      metadataUri,
      transactionFeePercentage,
      tokenType: tokenResult.tokenType || 'SPL',
      feeCollectorWallet: tokenResult.feeCollectorWallet || null,
      transactionSignature: tokenResult.signature,
      explorerUrl: `https://solscan.io/token/${tokenResult.mintAddress}`,
      raydiumUrl: `https://raydium.io/liquidity/create/?token=${tokenResult.mintAddress}`,
      createdAt: tokenRecord.createdAt,
      website: (!skipWebsite && website) ? website : null,
      socialLinks: (!skipSocials && socialLinks) ? socialLinks : null,
      skipWebsite: skipWebsite,
      skipSocials: skipSocials
    };

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      message: `Token "${name}" (${symbol}) created successfully!`
    }), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });

  } catch (error) {
    console.error('Token creation failed', { error: error.message, stack: error.stack });

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Internal server error during token creation';

    if (error.message.includes('insufficient funds')) {
      statusCode = 400;
      errorMessage = 'Insufficient SOL balance for token creation';
    } else if (error.message.includes('invalid signature') || error.message.includes('unauthorized')) {
      statusCode = 401;
      errorMessage = 'Invalid wallet signature or unauthorized request';
    } else if (error.message.includes('network')) {
      statusCode = 503;
      errorMessage = 'Blockchain network error. Please try again.';
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      details: Deno.env.get('NODE_ENV') === 'development' ? error.message : undefined
    }), { 
      status: statusCode, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});