const analytics = new Analytics();

// Initialize Buffer polyfill before anything else
console.log('🔧 Initializing Buffer polyfill for browser...');
window.Buffer = buffer.Buffer;

// Test Buffer functionality
try {
    const testBuffer = Buffer.alloc(10);
    const testFromString = Buffer.from('test', 'utf8');
    console.log('✅ Buffer polyfill loaded successfully');
    console.log('✅ Buffer test - alloc:', testBuffer instanceof Buffer);
    console.log('✅ Buffer test - from string:', testFromString instanceof Buffer);
    console.log('✅ Buffer available for Solana operations');
} catch (error) {
    console.error('❌ Buffer polyfill failed:', error);
}

// Production Network Status & Error Handling
// Clear all cached state on page load
localStorage.clear();
sessionStorage.clear();

// Production error handler for script loading
function handleScriptError(scriptName) {
    console.error(`❌ CRITICAL: Failed to load ${scriptName} library`);
    const statusDiv = document.getElementById('network-status') || document.createElement('div');
    statusDiv.id = 'network-status';
    statusDiv.innerHTML =
        `<div class="error-banner">🚫 NETWORK ERROR: Failed to load ${scriptName}. Please refresh and check your internet connection.</div>`;
    if (!document.getElementById('network-status')) {
        document.body.prepend(statusDiv);
    }
}

// Production network monitoring
window.addEventListener('load', function() {
    console.log('🚀 SolMeme Creator - PRODUCTION MODE');
    console.log('🌐 Network: SOLANA MAINNET ONLY');
    console.log('💰 Real SOL transactions enabled');

    // Network status indicator
    if (!document.getElementById('network-status')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'network-status';
        document.body.prepend(statusDiv);
    }

    // Network status styles
    if (!document.getElementById('network-status-styles')) {
        const style = document.createElement('style');
        style.id = 'network-status-styles';
        style.textContent = `
            #network-status {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
            }
            .error-banner {
                background: linear-gradient(45deg, #ff4d4f, #ff7875);
                color: white;
                text-align: center;
                padding: 12px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);
            }
            .offline-banner {
                background: linear-gradient(45deg, #faad14, #ffc53d);
                color: #000;
                text-align: center;
                padding: 12px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(250, 173, 20, 0.3);
            }
            .success-banner {
                background: linear-gradient(45deg, #52c41a, #73d13d);
                color: white;
                text-align: center;
                padding: 12px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(82, 196, 26, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // Network event listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    updateNetworkStatus();
});

function updateNetworkStatus() {
    const statusDiv = document.getElementById('network-status');
    if (!statusDiv) return;

    if (!navigator.onLine) {
        statusDiv.innerHTML = '<div class="offline-banner">⚠️ YOU ARE OFFLINE - Solana mainnet features unavailable</div>';
    } else {
        // Clear offline status when back online
        if (statusDiv.innerHTML.includes('offline-banner')) {
            statusDiv.innerHTML = '';
        }
    }
}

// Production script loader with comprehensive error handling
function loadProductionScript(src, name) {
    return new Promise((resolve, reject) => {
        console.log(`📦 Loading production script: ${name}`);
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';

        script.onload = () => {
            console.log(`✅ Successfully loaded: ${name}`);
            resolve();
        };

        script.onerror = () => {
            console.error(`❌ FAILED to load: ${name}`);
            handleScriptError(name);
            reject(new Error(`Failed to load ${name}`));
        };

        document.head.appendChild(script);
    });
}

// Initialize Buffer polyfill with browser-compatible approach
const initializeBuffer = new Promise((resolve) => {
    console.log('🔧 Initializing Buffer polyfill for browser...');

    // Create a comprehensive Buffer polyfill that works in browsers
    window.Buffer = class Buffer extends Uint8Array {
        constructor(size, fill, encoding) {
            if (typeof size === 'string') {
                // Buffer.from(string)
                super(new TextEncoder().encode(size));
            } else if (typeof size === 'number') {
                // Buffer.alloc(size)
                super(size);
                if (fill !== undefined) {
                    this.fill(fill);
                }
            } else if (size instanceof ArrayBuffer || Array.isArray(size)) {
                // Buffer.from(arrayBuffer or array)
                super(size);
            } else {
                super(0);
            }
        }

        static alloc(size, fill, encoding) {
            const buf = new Buffer(size);
            if (fill !== undefined) {
                buf.fill(fill);
            }
            return buf;
        }

        static from(data, encoding) {
            if (typeof data === 'string') {
                return new Buffer(data);
            } else if (data instanceof ArrayBuffer || Array.isArray(data)) {
                return new Buffer(data);
            }
            return new Buffer(0);
        }

        static isBuffer(obj) {
            return obj instanceof Buffer || obj instanceof Uint8Array;
        }

        static concat(list, totalLength) {
            if (!totalLength) {
                totalLength = list.reduce((acc, buf) => acc + buf.length, 0);
            }
            const result = new Buffer(totalLength);
            let offset = 0;
            for (const buf of list) {
                result.set(buf, offset);
                offset += buf.length;
            }
            return result;
        }

        writeUInt8(value, offset) {
            this[offset] = value & 0xff;
        }

        writeUInt32LE(value, offset) {
            this[offset] = value & 0xff;
            this[offset + 1] = (value >>> 8) & 0xff;
            this[offset + 2] = (value >>> 16) & 0xff;
            this[offset + 3] = (value >>> 24) & 0xff;
        }

        copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
            target.set(this.subarray(sourceStart, sourceEnd), targetStart);
        }

        toBuffer() {
            return this;
        }
    };

    // Add static methods to the global Buffer
    window.Buffer.alloc = window.Buffer.alloc.bind(window.Buffer);
    window.Buffer.from = window.Buffer.from.bind(window.Buffer);
    window.Buffer.isBuffer = window.Buffer.isBuffer.bind(window.Buffer);
    window.Buffer.concat = window.Buffer.concat.bind(window.Buffer);

    // Test Buffer functionality
    try {
        const testBuffer = window.Buffer.alloc(10);
        testBuffer.writeUInt8(255, 0);
        const testFromString = window.Buffer.from('hello');
        console.log('✅ Buffer polyfill created successfully');
        console.log('✅ Buffer test - alloc:', testBuffer.length === 10);
        console.log('✅ Buffer test - from string:', testFromString.length === 5);
        console.log('✅ Buffer available for Solana operations');
    } catch (error) {
        console.error('❌ Buffer test failed:', error);
    }

    resolve();
});

import * as splToken from '@solana/spl-token';

async function loadDependencies() {
    try {
        await initializeBuffer;
        await loadProductionScript('https://cdn.jsdelivr.net/npm/@solana/web3.js@1.92.1/lib/index.iife.min.js', 'Solana Web3.js');
        if (typeof solanaWeb3 === 'undefined') {
            throw new Error('Solana Web3.js failed to expose global object');
        }
        console.log('✅ Verified: solanaWeb3 global object available');

        window.splToken = splToken;

        console.log('🔍 Verifying Buffer availability:', typeof window.Buffer);
        if (typeof window.Buffer === 'undefined') {
            console.warn('⚠️ Buffer not available, may cause issues with Solana operations');
        }

        console.log('✅ Full SPL Token library loaded successfully');
        console.log('splToken object:', typeof window.splToken);
        console.log('createMint type:', typeof window.splToken.createMint);
        console.log('TOKEN_PROGRAM_ID:', window.splToken.TOKEN_PROGRAM_ID?.toString());
        console.log('Available SPL Token functions:', Object.keys(splToken).slice(0, 10));
        console.log('🎉 All production scripts loaded successfully');
        console.log('🔗 Ready for mainnet connections');

        const solanaScript = document.createElement('script');
        solanaScript.src = 'solana-integration.js';
        solanaScript.onload = () => {
            console.log('✅ Solana integration loaded after dependencies');
        };
        document.head.appendChild(solanaScript);

    } catch (error) {
        console.error('💥 CRITICAL: Script loading failed', error);
        handleScriptError('Solana libraries');
    }
}

loadDependencies();

// Supabase Edge Functions Integration
// Supabase Edge Function Endpoints - Updated with your project reference
        const SUPABASE_URL = getEnvVariable('SUPABASE_URL');
const ENDPOINTS = {
            mintToken: `${SUPABASE_URL}/functions/v1/mint-token`,
            generateImage: `${SUPABASE_URL}/functions/v1/generate-image`,
            uploadMetadata: `${SUPABASE_URL}/functions/v1/upload-metadata`,
            tokenMetadata: `${SUPABASE_URL}/functions/v1/token-metadata`,
            auth: `${SUPABASE_URL}/functions/v1/auth`,
            health: `${SUPABASE_URL}/functions/v1/health`
};

// Authentication Functions
async function getAuthChallenge(walletAddress) {
    try {
        // Use fetch with retry for reliability
        const maxRetries = 3;
        let lastError;

        // Generate an unique request ID for tracking
        const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
        console.log(`🔑 Requesting auth challenge for wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} [${requestId}]`);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                // Add more request headers for better CORS compatibility
                const headers = {
                    'Content-Type': 'application/json',
                    'X-Request-ID': requestId,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                };

                console.log(`🔄 Auth challenge attempt ${attempt + 1}/${maxRetries}`);

                const response = await fetch(`${ENDPOINTS.auth}/challenge`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        walletAddress,
                        timestamp: Date.now(),
                        requestId: requestId
                    }),
                    signal: controller.signal,
                    credentials: 'omit' // Don't send cookies
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Try to get detailed error information
                    let errorDetails = '';
                    try {
                        const errorResponse = await response.json();
                        errorDetails = errorResponse.error || errorResponse.message || '';
                    } catch (parseError) {
                        // Fallback to text if JSON parsing fails
                        errorDetails = await response.text();
                    }

                    throw new Error(`Failed to get auth challenge: ${response.status} - ${errorDetails}`);
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(`API error: ${data.error || 'Unknown error'}`);
                }

                console.log('✅ Auth challenge received successfully');
                return data;
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Auth challenge attempt ${attempt + 1}/${maxRetries} failed:`, error.message);

                // Check if it's a CORS-related error
                if (error.message.includes('NetworkError') || error.message.includes('CORS') ||
                    error.message.includes('network') || error.message.includes('Failed to fetch')) {
                    console.warn('⚠️ Possible CORS or network issue detected');
                }

                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1500; // Exponential backoff with longer delay
                    console.log(`⏳ Retrying in ${delay/1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed
        console.error('❌ All auth challenge attempts failed');
        throw lastError;
    } catch (error) {
        console.error('Failed to get auth challenge:', error);

        // Enhanced error for user feedback with categorization
        const enhancedError = new Error(`Auth challenge failed: ${error.message}`);
        enhancedError.originalError = error;
        enhancedError.isAuthError = true;

        // Categorize error for better handling
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            enhancedError.errorType = 'network';
            enhancedError.userMessage = 'Network error connecting to authentication service. Please check your internet connection and try again.';
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            enhancedError.errorType = 'cors';
            enhancedError.userMessage = 'Browser security restriction prevented authentication. Please try using a different browser or disabling extensions.';
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
            enhancedError.errorType = 'timeout';
            enhancedError.userMessage = 'Authentication service took too long to respond. Please try again later.';
        } else {
            enhancedError.errorType = 'unknown';
            enhancedError.userMessage = `Authentication error: ${error.message}`;
        }

        throw enhancedError;
    }
}

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

async function loginWithWallet(walletAddress, signature, message, timestamp) {
    try {
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
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
}

// Complete Auth Flow
async function completeAuthFlow() {
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

        console.log('Authentication successful:', authResult);
        return authResult;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
    }
}

// Image Generation Function
async function generateTokenImage(prompt, tokenName, tokenSymbol) {
    try {
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
    } catch (error) {
        console.error('Image generation failed:', error);
        throw error;
    }
}

// Metadata Upload Function
async function uploadTokenMetadata(metadata) {
    try {
        const response = await fetch(ENDPOINTS.uploadMetadata, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                metadata
            })
        });

        const result = await response.json();
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Metadata upload failed:', error);
        throw error;
    }
}


// Complete Token Creation Process
async function createNewToken(formData) {
    try {
        // Update progress
        updateProgress(20, 'Generating AI image...');
        setActiveStep('step2');

        // Step 1: Generate AI image if needed
        let imageUrl = formData.logoUrl;
        if (!imageUrl) {
            const imagePrompt = formData.imagePrompt || `Create a logo for ${formData.name} token`;
            const imageResult = await generateTokenImage(imagePrompt, formData.name, formData.symbol);
            imageUrl = imageResult.url;
        }

        const compressedImage = await compressImage(imageUrl);

        // Update progress
        updateProgress(40, 'Uploading metadata to IPFS...');
        setActiveStep('step3');

        const storage = new Storage('ipfs'); // or 'arweave'
        const logoUrl = await storage.uploadFile(imageUrl);


        // Step 2: Create token metadata with Dexscreener optimization
        const metadata = {
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            image: imageUrl,
            // Standard Metaplex attributes
            attributes: [{
                trait_type: 'Creator',
                value: window.solana.publicKey.toString()
            }, {
                trait_type: 'Creation Date',
                value: new Date().toISOString()
            }, {
                trait_type: 'Network',
                value: 'Solana'
            }, {
                trait_type: 'Standard',
                value: 'SPL Token'
            }, {
                trait_type: 'Supply',
                value: formData.supply?.toString() || '1000000000'
            }, {
                trait_type: 'Decimals',
                value: (formData.decimals || 9).toString()
            }],
            // Required Metaplex properties for proper indexing
            properties: {
                files: [{
                    uri: imageUrl,
                    type: 'image/png',
                    cdn: true
                }],
                category: 'image',
                creators: [{
                    address: window.solana.publicKey.toString(),
                    verified: false,
                    share: 100
                }]
            },
            // Dexscreener extensions for enhanced visibility
            extensions: {
                // Dexscreener-specific metadata
                dexscreener: {
                    enabled: true,
                    metadata_version: '1.0',
                    network: 'solana-mainnet',
                    standard: 'metaplex',
                    verified: true
                },
                // Token details for better listing
                token_details: {
                    total_supply: formData.supply?.toString() || '1000000000',
                    max_supply: formData.supply?.toString() || '1000000000',
                    circulating_supply: formData.supply?.toString() || '1000000000',
                    decimals: formData.decimals || 9,
                    mint_authority_revoked: formData.revokeMintAuthority || false,
                    freeze_authority_revoked: formData.revokeFreezeAuthority || false,
                    update_authority_revoked: formData.revokeUpdateAuthority || false
                }
            }
        };

        // Add website and social links if provided
        if (formData.website) {
            metadata.website = formData.website;
            // Also add to extensions for better discoverability
            metadata.extensions.marketing = {
                website: formData.website,
                logo_url: imageUrl
            };
        }

        // Prepare social links
        const socialLinks = {};
        if (formData.twitterUrl) socialLinks.twitter = formData.twitterUrl;
        if (formData.telegramUrl) socialLinks.telegram = formData.telegramUrl;
        if (formData.discordUrl) socialLinks.discord = formData.discordUrl;
        if (formData.discordUrl) socialLinks.discord = formData.discordUrl;

        if (Object.keys(socialLinks).length > 0) {
            // Add to main metadata
            metadata.socialLinks = socialLinks;
            // Also add to Dexscreener extensions for enhanced visibility
            metadata.extensions.dexscreener.social_links = socialLinks;
        }

        // Upload metadata
        const metadataUrl = await storage.uploadFile(JSON.stringify(metadata));
        const metadataResult = { uri: metadataUrl };

        // Update progress
        updateProgress(60, 'Creating token on Solana mainnet...');
        setActiveStep('step4');

        // Generate message for wallet signature
        const message = `Create Token: ${formData.name} (${formData.symbol}) - ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signatureObject = await window.solana.signMessage(encodedMessage, 'utf8');
        const signature = bs58.encode(signatureObject.signature);

        // Step 3: Create the token
        const tokenResult = await window.solanaInstance.createTokenWithMetaplex({
            name: formData.name,
            symbol: formData.symbol,
            decimals: 9,
            supply: 1000000000,
            metadataUri: metadataResult.uri,
        });

        // Update progress
        updateProgress(80, 'Setting up metadata...');
        setActiveStep('step5');

        // Set mint authority
        updateProgress(80, 'Setting mint authority...');
        await window.solanaInstance.setAuthority(tokenResult.mintAddress, window.solana.publicKey, 'MintTokens');

        const authorityTypesToRevoke = [];
        if (formData.revokeMintAuthority) {
            authorityTypesToRevoke.push('MintTokens');
        }
        if (formData.revokeFreezeAuthority) {
            authorityTypesToRevoke.push('FreezeAccount');
        }
        // Always revoke update authority for DexScreener rating
        authorityTypesToRevoke.push('UpdateAuthority');

        if (authorityTypesToRevoke.length > 0) {
        updateProgress(85, 'Revoking authorities...', 'Please approve the transaction in your wallet.');
            await window.solanaInstance.revokeAuthorities(tokenResult.mintAddress, authorityTypesToRevoke);
        }

        // Submit to DexScreener
        updateProgress(90, 'Submitting to DexScreener...');
        setActiveStep('step6');
        const dexscreener = new Dexscreener();
        await dexscreener.submitToken(tokenResult.mintAddress);

        // Progress simulation for metadata and dexscreener steps
        setTimeout(() => {
            updateProgress(95, 'Sending notifications...');
            setActiveStep('step7');

            setTimeout(() => {
                updateProgress(100, 'Token creation complete!');
                setActiveStep('step8');

                // Display results
                displayResults(tokenResult);
            }, 1000);
        }, 1000);

        return tokenResult;

    } catch (error) {
        analytics.trackError(error, {
            flow: 'createNewToken'
        });
        handleApiError(error);
        // Re-enable create token button
        document.getElementById('createTokenBtn').disabled = false;
        throw error;
    }
}

// Token Creation Form Handler
function handleTokenCreation() {
    // Disable create token button
    document.getElementById('createTokenBtn').disabled = true;

    // Show progress section
    document.getElementById('progressSection').classList.add('active');
    document.getElementById('errorPanel').classList.remove('show');

    // Get form data
    const creationMode = document.body.classList.contains('manual-mode') ? 'manual' : 'ai';

    let name, symbol, description, imagePrompt;

    if (creationMode === 'ai') {
        // AI mode - use concept to generate details
        const aiConcept = document.getElementById('aiConcept').value;

        // TODO: In a real implementation, we would use AI to generate token details
        // For now, just use the concept directly
        name = `${aiConcept.split(' ')[0]} Token`;
        symbol = name.substring(0, 3).toUpperCase();
        description = `${aiConcept} - Created with SolMeme Creator`;
        imagePrompt = aiConcept;
    } else {
        // Manual mode - use direct inputs
        name = document.getElementById('tokenName').value;
        symbol = document.getElementById('tokenSymbol').value;
        description = document.getElementById('tokenDescription').value;
        imagePrompt = `Logo for ${name} token`;
    }

    // Common form fields
    const formData = {
        name,
        symbol,
        description,
        imagePrompt,
        website: creationMode === 'manual' ? document.getElementById('websiteUrl').value : null,
        twitterUrl: creationMode === 'manual' ? document.getElementById('twitterUrl').value : null,
        telegramUrl: creationMode === 'manual' ? document.getElementById('telegramUrl').value : null,
        discordUrl: creationMode === 'manual' ? document.getElementById('discordUrl').value : null,
        revokeMintAuthority: document.getElementById('revokeMintAuthority').checked,
        revokeFreezeAuthority: document.getElementById('revokeFreezeAuthority').checked,
        revokeUpdateAuthority: document.getElementById('revokeUpdateAuthority').checked
    };

    // Initialize progress
    updateProgress(10, 'Verifying wallet connection...');
    setActiveStep('step1');

    // First authenticate
    completeAuthFlow()
        .then(() => {
            // Then create token
            return createNewToken(formData);
        })
        .catch(error => {
            console.error('Token creation failed:', error);
            showError(error.message);
        });
}

// Update progress bar and text
function updateProgress(percentage, text, subtext = '') {
    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').innerText = text;
    if (subtext) {
        let subtextElement = document.getElementById('progressSubtext');
        if (!subtextElement) {
            subtextElement = document.createElement('p');
            subtextElement.id = 'progressSubtext';
            subtextElement.style.marginTop = '10px';
            document.querySelector('.progress-header').appendChild(subtextElement);
        }
        subtextElement.innerText = subtext;
    }
}

// Set active progress step
function setActiveStep(stepId) {
    // First remove active class from all steps
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(step => {
        step.classList.remove('active');
        step.classList.remove('completed');
    });

    // Set active class on current step
    const currentStep = document.getElementById(stepId);
    if (currentStep) {
        currentStep.classList.add('active');
    }

    // Set completed class on previous steps
    const stepIds = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8'];
    const currentIndex = stepIds.indexOf(stepId);

    for (let i = 0; i < currentIndex; i++) {
        const prevStep = document.getElementById(stepIds[i]);
        if (prevStep) {
            prevStep.classList.add('completed');
        }
    }
}

// Display token creation results
async function displayResults(tokenResult) {
    // Hide progress section
    document.getElementById('progressSection').classList.remove('active');

    // Show results section
    document.getElementById('resultsSection').classList.add('show');

    // Fill in result details
    document.getElementById('resultMintAddress').innerText = tokenResult.mintAddress;
    document.getElementById('resultSignature').innerText = tokenResult.transactionSignature;
    document.getElementById('resultMetadataUri').innerText = tokenResult.metadataUri;
    document.getElementById('resultLogoHash').innerText = tokenResult.imageUrl || 'N/A';
    document.getElementById('metadataAccount').innerText = tokenResult.metadataAddress;

    // Set links
    document.getElementById('solscanLink').href = `https://solscan.io/token/${tokenResult.mintAddress}`;
    document.getElementById('dexscreenerLink').href = `https://dexscreener.com/solana/${tokenResult.mintAddress}`;
    document.getElementById('metadataLink').href = tokenResult.metadataUri;

    // Fetch and display on-chain data
    const onChainData = new OnChainData(tokenResult.mintAddress);
    const holderCount = await onChainData.getHolderCount();
    const livePrice = await onChainData.getLivePrice();

    document.getElementById('holderCount').innerText = holderCount;
    document.getElementById('livePrice').innerText = `$${livePrice}`;

    // Fetch and display DexScreener rating
    const dexscreener = new Dexscreener();
    const rating = await dexscreener.getTokenRating(tokenResult.mintAddress);
    document.getElementById('dexscreenerRating').innerText = rating;

    // Create tokenomics chart
    createTokenomicsChart(tokenResult);

    // Display social links
    const socialsSection = document.getElementById('socialsSection');
    socialsSection.innerHTML = '';
    if (tokenResult.socialLinks) {
        if (tokenResult.socialLinks.twitter) {
            const twitterLink = document.createElement('a');
            twitterLink.href = tokenResult.socialLinks.twitter;
            twitterLink.target = '_blank';
            twitterLink.className = 'link-btn';
            twitterLink.innerHTML = '<i class="fab fa-twitter"></i> Twitter';
            socialsSection.appendChild(twitterLink);
        }
        if (tokenResult.socialLinks.telegram) {
            const telegramLink = document.createElement('a');
            telegramLink.href = tokenResult.socialLinks.telegram;
            telegramLink.target = '_blank';
            telegramLink.className = 'link-btn';
            telegramLink.innerHTML = '<i class="fab fa-telegram"></i> Telegram';
            socialsSection.appendChild(telegramLink);
        }
        if (tokenResult.socialLinks.discord) {
            const discordLink = document.createElement('a');
            discordLink.href = tokenResult.socialLinks.discord;
            discordLink.target = '_blank';
            discordLink.className = 'link-btn';
            discordLink.innerHTML = '<i class="fab fa-discord"></i> Discord';
            socialsSection.appendChild(discordLink);
        }
    }

    // Fetch and display authority status
    const authorityStatus = await window.solanaInstance.getAuthorityStatus(tokenResult.mintAddress);
    const authorityStatusSection = document.getElementById('authorityStatus');
    authorityStatusSection.innerHTML = `
        <div class="detail-card">
            <div class="detail-label">Mint Authority</div>
            <div class="detail-value">${authorityStatus.mintAuthority}</div>
        </div>
        <div class="detail-card">
            <div class="detail-label">Freeze Authority</div>
            <div class="detail-value">${authorityStatus.freezeAuthority}</div>
        </div>
    `;
}

// Show error message
function showError(message, showRetry = false) {
    document.getElementById('progressSection').classList.remove('active');
    const errorPanel = document.getElementById('errorPanel');
    errorPanel.classList.add('show');
    document.getElementById('errorMessage').innerText = message || 'An unexpected error occurred';
    const retryBtn = document.getElementById('retryBtn');
    if (showRetry) {
        retryBtn.style.display = 'block';
    } else {
        retryBtn.style.display = 'none';
    }
}

function handleApiError(error) {
    console.error('API Error:', error);
    let message = 'An unexpected error occurred. Please try again later.';
    if (error.response) {
        if (error.response.status === 429) {
            message = 'Too many requests. Please wait a while before trying again.';
        } else if (error.response.data && error.response.data.error) {
            message = error.response.data.error.message;
        }
    } else if (error.request) {
        message = 'The server did not respond. Please check your internet connection and try again.';
    }
    showError(message, true);
}

function rotateApiKeys(newKeys) {
    // This is a placeholder for the actual key rotation logic
    console.log('🔑 Rotating API keys...');
    // In a real implementation, we would update the .env.local file with the new keys.
    // For now, we'll just log the new keys to the console.
    console.log('New keys:', newKeys);
}

async function compressImage(imageUrl) {
    const imageFile = await fetch(imageUrl).then(res => res.blob());
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
    };
    try {
        const compressedFile = await imageCompression(imageFile, options);
        return compressedFile;
    } catch (error) {
        console.log(error);
        return null;
    }
}

// Copy text to clipboard
function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text)
        .then(() => {
            const button = event.target;
            const originalText = button.innerText;
            button.innerText = 'Copied!';
            setTimeout(() => {
                button.innerText = originalText;
            }, 1500);
        })
        .catch(err => console.error('Failed to copy:', err));
}

// Retry token creation
function retryCreation() {
    document.getElementById('errorPanel').classList.remove('show');
    document.getElementById('progressSection').classList.remove('active');
    document.getElementById('createTokenBtn').disabled = false;
    handleTokenCreation();
}

// Set token creation mode (AI or Manual)
function setCreationMode(mode) {
    const aiButton = document.querySelector('.mode-btn:nth-child(1)');
    const manualButton = document.querySelector('.mode-btn:nth-child(2)');

    if (mode === 'ai') {
        document.body.classList.remove('manual-mode');
        aiButton.classList.add('active');
        manualButton.classList.remove('active');
    } else {
        document.body.classList.add('manual-mode');
        aiButton.classList.remove('active');
        manualButton.classList.add('active');
    }
}

// Check if DEX Screener promotion is needed
function promoteOnDexscreener() {
    alert('Dexscreener promotion feature will be available soon.');
}

// Initialize form event handlers when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set create token button handler
    document.getElementById('createTokenBtn').addEventListener('click', createToken);

    // Set copy buttons handlers
    window.copyToClipboard = copyToClipboard;

    // Set retry handler
    window.retryCreation = retryCreation;

    // Set creation mode handler
    window.setCreationMode = setCreationMode;

    // Set DEX screener promotion handler
    window.promoteOnDexscreener = promoteOnDexscreener;

    // AI Generation
    async function generateAIConcept() {
        const concept = document.getElementById('aiConcept').value;
        if (!concept) {
            alert('Please enter a concept for the AI to work with.');
            return;
        }

        const aiGenerator = new AIGenerator(getEnvVariable('OPENAI_API_KEY'));
        const tokenDetails = await aiGenerator.generateTokenDetails(concept);
        const tokenLogoUrl = await aiGenerator.generateTokenLogo(tokenDetails.name, tokenDetails.description);

        document.getElementById('tokenName').value = tokenDetails.name;
        document.getElementById('tokenSymbol').value = tokenDetails.symbol;
        document.getElementById('tokenDescription').value = tokenDetails.description;
    }

    document.getElementById('generateAIConceptBtn').addEventListener('click', generateAIConcept);

    async function oneClickCreate() {
        const concept = 'A random meme coin';
        const aiGenerator = new AIGenerator(getEnvVariable('OPENAI_API_KEY'));
        const tokenDetails = await aiGenerator.generateTokenDetails(concept);
        const tokenLogoUrl = await aiGenerator.generateTokenLogo(tokenDetails.name, tokenDetails.description);

        const formData = {
            name: tokenDetails.name,
            symbol: tokenDetails.symbol,
            description: tokenDetails.description,
            logoUrl: tokenLogoUrl,
            revokeMintAuthority: true,
            revokeFreezeAuthority: true,
            revokeUpdateAuthority: true,
        };

        await createNewToken(formData);
    }

    document.getElementById('oneClickCreateBtn').addEventListener('click', oneClickCreate);
});

function createTokenomicsChart(tokenResult) {
    const ctx = document.getElementById('tokenomicsChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Team', 'Marketing', 'Liquidity', 'Community'],
            datasets: [{
                label: 'Tokenomics',
                data: [10, 20, 30, 40],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Token Distribution'
                }
            }
        },
    });
}



// Initialize the main app after successful authentication
function initializeApp() {
    console.log('🔓 Password gate unlocked - Initializing SolMeme Creator');

    // Load the main application script
    const mainScript = document.createElement('script');
    mainScript.src = 'index-mainnet.js';
    mainScript.onload = () => {
        console.log('✅ Main application loaded successfully');

        // Add global wallet functions for direct HTML access
        window.connectWallet = connectWallet;
        window.disconnectWallet = disconnectWallet;
        window.checkBalance = updateWalletBalance;

        // Initialize the app
        function initializeProductionApp() {
            try {
                console.log('🚀 Initializing production app...');

                // Initialize API connectivity monitor
                if (typeof startApiConnectionMonitoring === 'function') {
                    const connectionMonitor = startApiConnectionMonitoring(30000);
                    connectionMonitor.start();
                    console.log('✅ API connection monitoring started');
                }

                // Check IPFS service
                if (window.ipfsInstance && typeof window.ipfsInstance.initialize === 'function') {
                    window.ipfsInstance.initialize()
                        .then(() => console.log('✅ IPFS services initialized'))
                        .catch(err => console.warn('⚠️ IPFS initialization had issues:', err.message));
                }

                console.log('✅ Production app initialized successfully');
            } catch (error) {
                console.error('❌ Error initializing production app:', error);
            }
        }

        // Call the initialization function
        initializeProductionApp();

        // Update Supabase Edge Function endpoints with actual project reference
        // This would typically come from environment variables
        const supabaseProjectRef = 'YOUR_SUPABASE_PROJECT_REF';
        Object.keys(ENDPOINTS).forEach(key => {
            ENDPOINTS[key] = ENDPOINTS[key].replace('[your-project-ref]', supabaseProjectRef);
        });

        console.log('✅ Supabase Edge Functions endpoints initialized');

        // Check system health to verify backend services with retry
        const checkSystemHealth = async (endpoint, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    console.log(`🔍 System health check attempt ${i+1}/${retries}...`);
                    const response = await fetch(endpoint, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 5000 // 5s timeout
                    });

                    if (!response.ok) {
                        throw new Error(`Health check failed with status: ${response.status}`);
                    }

                    const data = await response.json();
                    console.log('✅ System health check:', data.status);
                    return data;
                } catch (error) {
                    console.warn(`⚠️ Health check attempt ${i+1} failed:`, error.message);
                    if (i < retries - 1) {
                        const delay = Math.pow(2, i) * 1000; // Exponential backoff
                        console.log(`⏳ Retrying in ${delay/1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        console.error('❌ All health check attempts failed');
                        throw error;
                    }
                }
            }
        };

        // Execute health check with retry
        checkSystemHealth(ENDPOINTS.health)
            .then(data => {
                console.log('✅ System health verified:', data.status);

                // Update network status based on health check
                const networkStatus = document.getElementById('networkStatus');
                const statusIndicator = networkStatus.querySelector('.status-indicator');
                const statusText = networkStatus.querySelector('span');

                if (data.status === 'healthy') {
                    networkStatus.classList.remove('disconnected');
                    networkStatus.classList.add('connected');
                    statusIndicator.classList.remove('error');
                    statusText.innerText = 'Connected to Mainnet';
                } else {
                    statusText.innerText = 'System degraded. Some features may be unavailable.';
                }
            })
            .catch(error => {
                console.error('❌ System health check failed:', error);

                // Update network status as disconnected
                const networkStatus = document.getElementById('networkStatus');
                const statusIndicator = networkStatus.querySelector('.status-indicator');
                const statusText = networkStatus.querySelector('span');

                networkStatus.classList.add('disconnected');
                networkStatus.classList.remove('connected');
                statusIndicator.classList.add('error');
                statusText.innerText = 'Backend Disconnected';

                // Show user-friendly error with retry option
                const errorMessage = `
                            <div class="error-notification">
                                <h3>⚠️ Connection Issue Detected</h3>
                                <p>We're having trouble connecting to the backend services.</p>
                                <p>This might be due to:</p>
                                <ul>
                                    <li>Temporary network issues</li>
                                    <li>Server maintenance</li>
                                    <li>Firewall or security settings</li>
                                </ul>
                                <button onclick="window.location.reload()">Retry Connection</button>
                            </div>
                        `;

                // Add to page if error container exists
                const errorContainer = document.getElementById('errorContainer') ||
                    document.querySelector('.error-container') ||
                    document.querySelector('.error-panel');

                if (errorContainer) {
                    errorContainer.innerHTML = errorMessage;
                    errorContainer.style.display = 'block';
                }
            });
    };
    document.head.appendChild(mainScript);
}

// Define wallet connection functions that directly use Phantom wallet
// These will be used instead of the implementations in index-mainnet.js
async function connectWallet() {
    console.log('Connecting to Phantom wallet...');
    try {
        // Check if Phantom is available
        if (!window.solana || !window.solana.isPhantom) {
            alert('Phantom wallet is not installed. Please install it from https://phantom.app/');
            return;
        }

        // Connect to wallet
        const resp = await window.solana.connect();
        const walletAddress = resp.publicKey.toString();

        console.log('✅ Connected to wallet:', walletAddress);

        // Update UI
        document.getElementById('walletInfo').classList.add('connected');
        document.getElementById('walletAddress').innerText = walletAddress;
        document.getElementById('createTokenBtn').disabled = false;

        // Update network status
        const networkStatus = document.getElementById('networkStatus');
        networkStatus.classList.remove('disconnected');
        networkStatus.classList.add('connected');
        networkStatus.querySelector('.status-indicator').classList.remove('error');
        networkStatus.querySelector('span').innerText = 'Connected to Mainnet';

        // Update wallet balance
        try {
            await updateWalletBalance();
        } catch (balanceError) {
            console.warn('⚠️ Balance update failed during connection:', balanceError.message);
        }

        // Return wallet address
        return walletAddress;
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        if (error.code === 4001) {
            // User rejected the connection
            alert('Please approve the connection request in your Phantom wallet.');
        } else {
            alert('Failed to connect to Phantom wallet: ' + error.message);
        }
        throw error;
    }
}

async function disconnectWallet() {
    console.log('Disconnecting wallet...');
    try {
        // Check if wallet is connected
        if (!window.solana || !window.solana.isConnected) {
            console.log('Wallet not connected');
            return;
        }

        // Disconnect wallet
        await window.solana.disconnect();
        console.log('✅ Wallet disconnected');

        // Update UI
        document.getElementById('walletInfo').classList.remove('connected');
        document.getElementById('createTokenBtn').disabled = true;
        document.getElementById('walletAddress').innerText = '';
        document.getElementById('walletBalance').textContent = '0.000000';

        // Update network status
        const networkStatus = document.getElementById('networkStatus');
        networkStatus.classList.remove('connected');
        networkStatus.classList.add('disconnected');
        networkStatus.querySelector('.status-indicator').classList.add('error');
        networkStatus.querySelector('span').innerText = 'Wallet Disconnected';

        // Clear authentication
        localStorage.removeItem('authToken');

    } catch (error) {
        console.error('Failed to disconnect wallet:', error);
        alert('Failed to disconnect wallet: ' + error.message);
        throw error;
    }
}

async function updateWalletBalance() {
    try {
        // Check if wallet is connected
        if (!window.solana || !window.solana.isConnected) {
            console.warn('⚠️ Wallet not connected, skipping balance update');
            document.getElementById('walletBalance').textContent = '--';
            return 0;
        }

        // Check if we have the public key
        if (!window.solana.publicKey) {
            console.warn('⚠️ Wallet public key not available, skipping balance update');
            document.getElementById('walletBalance').textContent = '--';
            return 0;
        }

        // Use the solanaInstance if available, otherwise create temporary connection
        let balance = 0;
        if (window.solanaInstance && window.solanaInstance.wallet) {
            console.log('💰 Getting balance via solanaInstance...');
            balance = await window.solanaInstance.getWalletBalance();
        } else {
            console.log('💰 Getting balance via direct connection...');
            // Fallback to direct connection with error handling
            const rpcUrl = 'https://solana-mainnet.g.alchemy.com/v2/PVF7BjfV8uajJQcxoAN0D';
            const connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');

            // Get balance with timeout
            const balanceResponse = await Promise.race([
                connection.getBalance(window.solana.publicKey),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Balance request timeout')), 10000)
                )
            ]);

            balance = balanceResponse / solanaWeb3.LAMPORTS_PER_SOL;
        }

        console.log('✅ Wallet balance:', balance, 'SOL');

        // Update UI
        document.getElementById('walletBalance').textContent = balance.toFixed(6);

        return balance;
    } catch (error) {
        console.warn('⚠️ Error getting wallet balance:', error.message);
        document.getElementById('walletBalance').textContent = 'Error';
        return 0;
    }
}
