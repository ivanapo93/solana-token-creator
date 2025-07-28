# Frontend Integration Guide

This guide explains how to integrate the Supabase Edge Functions with your frontend application for the SolMeme Creator project.

## Configuration

First, update your frontend configuration to use the new Supabase Edge Function endpoints:

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

## Authentication Flow

### 1. Generate Challenge Message

```javascript
async function getAuthChallenge(walletAddress) {
  const response = await fetch(`${ENDPOINTS.auth}/challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ walletAddress })
  });
  return await response.json();
}
```

### 2. Sign Message with Wallet

```javascript
async function signChallengeWithPhantom(message) {
  try {
    // Request signature from Phantom wallet
    const encodedMessage = new TextEncoder().encode(message);
    const signatureObject = await window.solana.signMessage(encodedMessage, 'utf8');
    return bs58.encode(signatureObject.signature);
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}
```

### 3. Login with Signature

```javascript
async function loginWithWallet(walletAddress, signature, message, timestamp) {
  const response = await fetch(`${ENDPOINTS.auth}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress,
      signature,
      message,
      timestamp
    })
  });
  
  const result = await response.json();
  if (result.success) {
    // Store JWT token for subsequent requests
    localStorage.setItem('authToken', result.data.token);
    return result.data;
  } else {
    throw new Error(result.error);
  }
}
```

### 4. Complete Login Process

```javascript
async function completeLoginProcess() {
  try {
    // Ensure wallet is connected
    if (!window.solana.isConnected) {
      await window.solana.connect();
    }
    
    const walletAddress = window.solana.publicKey.toString();
    
    // Get challenge
    const challenge = await getAuthChallenge(walletAddress);
    
    // Sign challenge
    const signature = await signChallengeWithPhantom(challenge.data.message);
    
    // Login with signature
    const authResult = await loginWithWallet(
      walletAddress,
      signature,
      challenge.data.message,
      challenge.data.timestamp
    );
    
    return authResult;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}
```

## Token Creation Flow

### 1. Generate AI Image for Token

```javascript
async function generateTokenImage(prompt, tokenName, tokenSymbol) {
  const response = await fetch(ENDPOINTS.generateImage, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({
      prompt,
      tokenName,
      tokenSymbol
    })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}
```

### 2. Upload Metadata

```javascript
async function uploadTokenMetadata(metadata) {
  const response = await fetch(ENDPOINTS.uploadMetadata, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify({ metadata })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}
```

### 3. Create Token

```javascript
async function createToken(tokenData) {
  const response = await fetch(ENDPOINTS.mintToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: JSON.stringify(tokenData)
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error || 'Token creation failed');
  }
}
```

### 4. Complete Token Creation Process

```javascript
async function createNewToken(formData) {
  try {
    // Step 1: Generate AI image if needed
    let imageUrl = formData.logoUrl;
    if (!imageUrl) {
      const imagePrompt = formData.imagePrompt || `Create a logo for ${formData.name} token`;
      const imageResult = await generateTokenImage(imagePrompt, formData.name, formData.symbol);
      imageUrl = imageResult.url;
    }
    
    // Step 2: Create token metadata
    const metadata = {
      name: formData.name,
      symbol: formData.symbol,
      description: formData.description,
      image: imageUrl,
      attributes: [
        { trait_type: 'Creator', value: window.solana.publicKey.toString() },
        { trait_type: 'Creation Date', value: new Date().toISOString() }
      ],
      properties: {
        files: [
          { uri: imageUrl, type: 'image/png' }
        ]
      }
    };
    
    // Add website and social links if provided
    if (formData.website) metadata.website = formData.website;
    if (formData.socialLinks) metadata.socialLinks = formData.socialLinks;
    
    // Upload metadata
    const metadataResult = await uploadTokenMetadata(metadata);
    
    // Step 3: Create the token
    const tokenResult = await createToken({
      name: formData.name,
      symbol: formData.symbol,
      description: formData.description,
      decimals: formData.decimals || 9,
      supply: formData.supply || 1000000000,
      walletAddress: window.solana.publicKey.toString(),
      imageUrl: imageUrl,
      metadataUri: metadataResult.uri,
      transactionFeePercentage: formData.transactionFee || 0,
      website: formData.website,
      socialLinks: formData.socialLinks,
      revokeMintAuthority: formData.revokeMintAuthority || false,
      revokeFreezeAuthority: formData.revokeFreezeAuthority || false,
      revokeUpdateAuthority: formData.revokeUpdateAuthority || false
    });
    
    return tokenResult;
  } catch (error) {
    console.error('Token creation process failed:', error);
    throw error;
  }
}
```

## Token Metadata Retrieval

To fetch token metadata for an existing token:

```javascript
async function getTokenMetadata(mintAddress) {
  const response = await fetch(`${ENDPOINTS.tokenMetadata}/${mintAddress}`);
  
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(`Failed to fetch token metadata: ${response.status}`);
  }
}
```

## System Health Check

To check if all systems are operational:

```javascript
async function checkSystemHealth() {
  const response = await fetch(ENDPOINTS.health);
  
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error(`System health check failed: ${response.status}`);
  }
}
```

## Error Handling

Implement comprehensive error handling for API interactions:

```javascript
function handleApiError(error, context) {
  console.error(`Error in ${context}:`, error);
  
  let userMessage = 'An unexpected error occurred. Please try again.';
  
  // Network errors
  if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
    userMessage = 'Network connection error. Please check your internet connection and try again.';
  }
  
  // Authentication errors
  else if (error.message.includes('Invalid signature') || error.message.includes('unauthorized')) {
    userMessage = 'Authentication failed. Please reconnect your wallet.';
    // Clear stored token
    localStorage.removeItem('authToken');
  }
  
  // Insufficient funds
  else if (error.message.includes('insufficient funds')) {
    userMessage = 'Insufficient SOL balance for this operation. Please add more SOL to your wallet.';
  }
  
  // Show error to user
  showErrorNotification(userMessage);
}
```

## Form Submission Example

Here's a complete example of handling a token creation form:

```javascript
// Handle form submission
document.getElementById('tokenForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  
  try {
    // Disable button and show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Token...';
    
    // Collect form data
    const formData = {
      name: form.elements.tokenName.value,
      symbol: form.elements.tokenSymbol.value,
      description: form.elements.tokenDescription.value,
      supply: parseInt(form.elements.supply.value) || 1000000000,
      decimals: parseInt(form.elements.decimals.value) || 9,
      transactionFee: parseFloat(form.elements.transactionFee.value) || 0,
      logoUrl: form.elements.logoUrl.value || null,
      imagePrompt: form.elements.imagePrompt.value || null,
      website: form.elements.website.value || null,
      socialLinks: {
        twitter: form.elements.twitter.value || null,
        telegram: form.elements.telegram.value || null,
        discord: form.elements.discord.value || null
      },
      revokeMintAuthority: form.elements.revokeMintAuthority.checked,
      revokeFreezeAuthority: form.elements.revokeFreezeAuthority.checked,
      revokeUpdateAuthority: form.elements.revokeUpdateAuthority.checked
    };
    
    // Create token
    const result = await createNewToken(formData);
    
    // Show success message
    showSuccessMessage(`Token ${result.name} (${result.symbol}) created successfully!`);
    
    // Display token details
    displayTokenResult(result);
    
  } catch (error) {
    handleApiError(error, 'token creation');
  } finally {
    // Reset button state
    submitButton.disabled = false;
    submitButton.textContent = 'Create Token';
  }
});
```