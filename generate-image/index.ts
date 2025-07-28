import { serve } from "https://deno.land/std@0.188.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.8.0";
import { v4 as uuidv4 } from "https://deno.land/std@0.188.0/uuid/mod.ts";

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY") || "",
});

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
};

// Enhance prompt for token logo generation
const enhancePromptForToken = (originalPrompt: string) => {
  const tokenKeywords = [
    'cryptocurrency logo',
    'digital token design',
    'blockchain symbol',
    'clean geometric design',
    'professional icon',
    'high contrast',
    'suitable for small sizes',
    'memorable symbol'
  ];

  const qualityKeywords = [
    'high quality',
    'professional',
    'clean',
    'modern',
    'vector style',
    'sharp edges',
    'distinctive'
  ];

  const avoidKeywords = [
    'text overlay',
    'words',
    'letters',
    'numbers',
    'copyright symbols'
  ];

  return `${originalPrompt}, ${tokenKeywords.join(', ')}, ${qualityKeywords.join(', ')}, no ${avoidKeywords.join(', no ')}`;
};

// Generate image with OpenAI
const generateWithOpenAI = async (prompt: string, options = {}) => {
  try {
    const {
      size = "1024x1024",
      quality = "standard",
      style = "natural",
      count = 1
    } = options;

    console.log('Generating image with OpenAI DALL-E', { 
      prompt: prompt.slice(0, 50) + '...', 
      size, 
      quality, 
      style, 
      count 
    });

    // Generate image with OpenAI
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancePromptForToken(prompt),
      size,
      quality,
      style,
      n: 1
    });

    const imageUrl = response.data[0].url;
    
    // Upload image to Supabase Storage
    const imageId = uuidv4();
    
    // Fetch image from OpenAI
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('token-images')
      .upload(`${imageId}.png`, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600'
      });
      
    if (error) {
      throw error;
    }
    
    // Get public URL
    const publicUrl = supabase.storage
      .from('token-images')
      .getPublicUrl(`${imageId}.png`).data.publicUrl;

    console.log('OpenAI image generation successful', { 
      imageId,
      publicUrl
    });

    return {
      url: publicUrl,
      imageId,
      originalUrl: imageUrl,
      provider: 'openai'
    };

  } catch (error) {
    console.error('OpenAI image generation failed', { 
      error: error.message,
      prompt: prompt.slice(0, 50) + '...'
    });

    throw error;
  }
};

// Generate fallback image if AI generation fails
const generateFallbackImage = (tokenName = 'TOKEN', tokenSymbol = 'TKN') => {
  console.log('Generating fallback image for:', tokenName);
  
  // Create a fallback image URL that can be used if AI generation fails
  const colors = [
    { bg: '667eea', fg: 'ffffff' },
    { bg: '764ba2', fg: 'ffffff' },
    { bg: 'f093fb', fg: '000000' },
    { bg: 'f5576c', fg: 'ffffff' },
    { bg: '4facfe', fg: 'ffffff' }
  ];
  
  const colorIndex = Math.floor(Math.random() * colors.length);
  const color = colors[colorIndex];
  const size = 512;
  const text = tokenSymbol.slice(0, 4).toUpperCase() || 'TOK';
  
  return `https://via.placeholder.com/${size}x${size}/${color.bg}/${color.fg}?text=${encodeURIComponent(text)}`;
};

// Save image metadata to database
const saveImageRecord = async (imageData) => {
  try {
    const { data, error } = await supabase
      .from('images')
      .insert([{
        id: imageData.imageId,
        url: imageData.url,
        prompt: imageData.prompt,
        provider: imageData.provider,
        created_at: new Date().toISOString()
      }]);
      
    if (error) {
      throw error;
    }
    
    console.log('Image record saved:', imageData.imageId);
    return data;
  } catch (error) {
    console.error('Failed to save image record:', error);
    // Don't throw here - we want the function to continue even if record saving fails
  }
};

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
    if (!requestData.prompt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required prompt field' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // Extract data from request
    const {
      prompt,
      tokenName,
      tokenSymbol,
      size = "1024x1024",
      provider = "openai"
    } = requestData;
    
    let imageResult;
    
    try {
      // Generate image using OpenAI
      if (provider === 'openai') {
        imageResult = await generateWithOpenAI(prompt, { size });
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (generationError) {
      console.warn('AI image generation failed, using fallback', { error: generationError.message });
      
      // Use fallback if AI generation fails
      const fallbackUrl = generateFallbackImage(tokenName, tokenSymbol);
      imageResult = {
        url: fallbackUrl,
        imageId: uuidv4(),
        provider: 'fallback',
        isFallback: true
      };
    }
    
    // Add prompt and token info to image result
    imageResult.prompt = prompt;
    imageResult.tokenName = tokenName;
    imageResult.tokenSymbol = tokenSymbol;
    
    // Save image record to database
    await saveImageRecord(imageResult);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      data: imageResult,
      message: `Image ${imageResult.isFallback ? 'fallback created' : 'generated successfully'}`
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });

  } catch (error) {
    console.error('Image generation failed', { error: error.message, stack: error.stack });

    return new Response(JSON.stringify({
      success: false,
      error: 'Image generation failed',
      details: Deno.env.get('NODE_ENV') === 'development' ? error.message : undefined
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders } 
    });
  }
});