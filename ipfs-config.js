// PRODUCTION IPFS Configuration for Token Metadata Storage
// CRITICAL: Production-ready configuration with fallback mechanisms and environment variable support

// Environment variable helper
function getEnvVariable(key, defaultValue = null) {
    // Browser environment - check if variables are injected
    if (typeof window !== 'undefined' && window.ENV) {
        return window.ENV[key] || defaultValue;
    }
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    return defaultValue;
}

const IPFS_CONFIG = {
    // Primary Pinata IPFS Service (PRODUCTION)
    pinata: {
        apiKey: getEnvVariable('PINATA_API_KEY', 'eff774886b25c15b5a96'),
        secretKey: getEnvVariable('PINATA_SECRET_KEY', 'e39dc0c38558383525ee15d90c7fb735b57f1c4a3d8cae945de513006c8579ca'),
        endpoint: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
        jsonEndpoint: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        gateway: 'https://gateway.pinata.cloud/ipfs/',
        publicGateway: 'https://cloudflare-ipfs.com/ipfs/',
        retryAttempts: 3,
        timeout: 30000
    },
    
    // NFT.Storage (FALLBACK 1)
    nftStorage: {
        token: getEnvVariable('NFT_STORAGE_TOKEN', 'abcd7ab4.f69556e51f294f6ba5ffea45fb9d7e71'),
        endpoint: 'https://api.nft.storage/upload',
        gateway: 'https://nftstorage.link/ipfs/',
        publicGateway: 'https://ipfs.io/ipfs/',
        retryAttempts: 2,
        timeout: 25000
    },
    
    // Web3.Storage (FALLBACK 2)
    web3storage: {
        token: getEnvVariable('WEB3_STORAGE_TOKEN', 'did:key:z6MkmGQie3EDobs3ZofwvD76s443F3uZcKbCvYn6iDpPBEh6'),
        endpoint: 'https://api.web3.storage/upload',
        gateway: 'https://w3s.link/ipfs/',
        publicGateway: 'https://cloudflare-ipfs.com/ipfs/',
        retryAttempts: 2,
        timeout: 20000
    },
    
    // Storacha (OPTIONAL FALLBACK 3)
    storacha: {
        didKey: getEnvVariable('STORACHA_DID_KEY', 'did:key:z6Mkj4MyGgzowEe4zDG7BJ1j8jcV4LPWdEMmdqzPg8ZS1Vxb'),
        endpoint: 'https://up.web3.storage/upload',
        gateway: 'https://w3s.link/ipfs/',
        publicGateway: 'https://cloudflare-ipfs.com/ipfs/',
        retryAttempts: 2,
        timeout: 20000
    },
    
    // Public IPFS Gateways for verification
    publicGateways: [
        'https://gateway.pinata.cloud/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://gateway.ipfs.io/ipfs/',
        'https://dweb.link/ipfs/'
    ]
};

// PRODUCTION IPFS UPLOADER with ROBUST FALLBACK SYSTEM
class IPFSUploader {
    constructor() {
        this.primaryService = 'pinata';
        this.fallbackServices = ['nftStorage', 'web3storage', 'storacha'];
        this.uploadAttempts = [];
    }

    // MAIN UPLOAD METHOD with automatic failover
    async uploadFile(file, filename = null) {
        this.uploadAttempts = [];
        
        // Try primary service first
        try {
            console.log('📤 Uploading to primary IPFS service (Pinata)...');
            const result = await this.uploadToPinata(file, filename);
            console.log('✅ Primary IPFS upload successful');
            return result;
        } catch (error) {
            console.warn('⚠️ Primary IPFS upload failed:', error.message);
            this.uploadAttempts.push({ service: 'pinata', error: error.message });
        }

        // Try fallback services
        for (const service of this.fallbackServices) {
            try {
                console.log(`🔄 Trying fallback IPFS service (${service})...`);
                const result = await this.uploadToFallbackService(service, file, filename);
                console.log(`✅ Fallback IPFS upload successful (${service})`);
                return result;
            } catch (error) {
                console.warn(`⚠️ Fallback ${service} failed:`, error.message);
                this.uploadAttempts.push({ service, error: error.message });
            }
        }

        // All services failed
        const errorSummary = this.uploadAttempts.map(attempt => 
            `${attempt.service}: ${attempt.error}`
        ).join('; ');
        
        throw new Error(`All IPFS services failed. Attempts: ${errorSummary}`);
    }

    async uploadJSON(jsonData, filename = 'metadata.json') {
        this.uploadAttempts = [];
        
        // Try primary service (Pinata JSON endpoint)
        try {
            console.log('📤 Uploading JSON to primary IPFS service (Pinata)...');
            const result = await this.uploadJSONToPinata(jsonData, filename);
            console.log('✅ Primary JSON IPFS upload successful');
            return result;
        } catch (error) {
            console.warn('⚠️ Primary JSON IPFS upload failed:', error.message);
            this.uploadAttempts.push({ service: 'pinata-json', error: error.message });
        }

        // Convert JSON to blob and try fallback services
        const jsonBlob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
        jsonBlob.name = filename;
        
        return await this.uploadFile(jsonBlob, filename);
    }

    // PRODUCTION PINATA UPLOAD with retry mechanism
    async uploadToPinata(file, filename = null) {
        const config = IPFS_CONFIG.pinata;
        
        // Validate API credentials
        if (!config.apiKey || config.apiKey === 'your_pinata_api_key_here' || config.apiKey.includes('REQUIRED')) {
            throw new Error('Pinata API credentials not configured. Please set PINATA_API_KEY environment variable.');
        }

        const formData = new FormData();
        formData.append('file', file);
        
        // Add metadata for better organization
        const metadata = {
            name: filename || file.name || 'token-asset',
            keyvalues: {
                type: 'solana-token-metadata',
                created: new Date().toISOString(),
                network: 'mainnet'
            }
        };
        formData.append('pinataMetadata', JSON.stringify(metadata));

        let lastError;
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`📤 Pinata upload attempt ${attempt}/${config.retryAttempts}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'pinata_api_key': config.apiKey,
                        'pinata_secret_api_key': config.secretKey
                    },
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                
                // Verify upload and return multiple gateway URLs
                const ipfsHash = result.IpfsHash;
                const primaryUrl = `${config.gateway}${ipfsHash}`;
                const publicUrl = `${config.publicGateway}${ipfsHash}`;
                
                console.log(`✅ Pinata upload successful: ${ipfsHash}`);
                
                return {
                    ipfsHash,
                    gatewayUrl: primaryUrl,
                    publicUrl: publicUrl,
                    service: 'pinata'
                };

            } catch (error) {
                lastError = error;
                console.warn(`❌ Pinata attempt ${attempt} failed:`, error.message);
                
                if (attempt < config.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Pinata upload failed after ${config.retryAttempts} attempts: ${lastError.message}`);
    }

    // PINATA JSON UPLOAD (optimized for metadata)
    async uploadJSONToPinata(jsonData, filename = 'metadata.json') {
        const config = IPFS_CONFIG.pinata;
        
        if (!config.apiKey || config.apiKey === 'your_pinata_api_key_here' || config.apiKey.includes('REQUIRED')) {
            throw new Error('Pinata API credentials not configured');
        }

        const payload = {
            pinataContent: jsonData,
            pinataMetadata: {
                name: filename,
                keyvalues: {
                    type: 'solana-token-json-metadata',
                    created: new Date().toISOString(),
                    network: 'mainnet'
                }
            }
        };

        let lastError;
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`📄 Pinata JSON upload attempt ${attempt}/${config.retryAttempts}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(config.jsonEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': config.apiKey,
                        'pinata_secret_api_key': config.secretKey
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                const ipfsHash = result.IpfsHash;
                const primaryUrl = `${config.gateway}${ipfsHash}`;
                const publicUrl = `${config.publicGateway}${ipfsHash}`;
                
                console.log(`✅ Pinata JSON upload successful: ${ipfsHash}`);
                
                return {
                    ipfsHash,
                    gatewayUrl: primaryUrl,
                    publicUrl: publicUrl,
                    service: 'pinata'
                };

            } catch (error) {
                lastError = error;
                console.warn(`❌ Pinata JSON attempt ${attempt} failed:`, error.message);
                
                if (attempt < config.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Pinata JSON upload failed after ${config.retryAttempts} attempts: ${lastError.message}`);
    }

    // FALLBACK SERVICE ROUTER
    async uploadToFallbackService(serviceName, file, filename = null) {
        switch (serviceName) {
            case 'nftStorage':
                return await this.uploadToNFTStorage(file, filename);
            case 'web3storage':
                return await this.uploadToWeb3Storage(file, filename);
            case 'storacha':
                return await this.uploadToStoracha(file, filename);
            default:
                throw new Error(`Unknown fallback service: ${serviceName}`);
        }
    }

    // NFT.STORAGE FALLBACK
    async uploadToNFTStorage(file, filename = null) {
        const config = IPFS_CONFIG.nftStorage;
        
        if (!config.token || config.token === 'your_nft_storage_api_key_here' || config.token.includes('REQUIRED')) {
            throw new Error('NFT.Storage token not configured');
        }

        let lastError;
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`📤 NFT.Storage upload attempt ${attempt}/${config.retryAttempts}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.token}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    body: file,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                const ipfsHash = result.value.cid;
                const primaryUrl = `${config.gateway}${ipfsHash}`;
                const publicUrl = `${config.publicGateway}${ipfsHash}`;
                
                console.log(`✅ NFT.Storage upload successful: ${ipfsHash}`);
                
                return {
                    ipfsHash,
                    gatewayUrl: primaryUrl,
                    publicUrl: publicUrl,
                    service: 'nftStorage'
                };

            } catch (error) {
                lastError = error;
                console.warn(`❌ NFT.Storage attempt ${attempt} failed:`, error.message);
                
                if (attempt < config.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`NFT.Storage upload failed after ${config.retryAttempts} attempts: ${lastError.message}`);
    }

    // WEB3.STORAGE FALLBACK
    async uploadToWeb3Storage(file, filename = null) {
        const config = IPFS_CONFIG.web3storage;
        
        if (!config.token || config.token === 'your_web3_storage_api_key_here' || config.token.includes('REQUIRED')) {
            throw new Error('Web3.Storage token not configured');
        }

        let lastError;
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`📤 Web3.Storage upload attempt ${attempt}/${config.retryAttempts}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.token}`,
                        'X-NAME': filename || file.name || 'token-asset'
                    },
                    body: file,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                const ipfsHash = result.cid;
                const primaryUrl = `${config.gateway}${ipfsHash}`;
                const publicUrl = `${config.publicGateway}${ipfsHash}`;
                
                console.log(`✅ Web3.Storage upload successful: ${ipfsHash}`);
                
                return {
                    ipfsHash,
                    gatewayUrl: primaryUrl,
                    publicUrl: publicUrl,
                    service: 'web3storage'
                };

            } catch (error) {
                lastError = error;
                console.warn(`❌ Web3.Storage attempt ${attempt} failed:`, error.message);
                
                if (attempt < config.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Web3.Storage upload failed after ${config.retryAttempts} attempts: ${lastError.message}`);
    }

    // STORACHA FALLBACK (NEW)
    async uploadToStoracha(file, filename = null) {
        const config = IPFS_CONFIG.storacha;
        
        if (!config.didKey || config.didKey === 'your_storacha_did_key_here' || config.didKey.includes('REQUIRED')) {
            throw new Error('Storacha DID key not configured');
        }

        let lastError;
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                console.log(`📤 Storacha upload attempt ${attempt}/${config.retryAttempts}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), config.timeout);

                // Storacha uses DID-based authentication
                const response = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `DID ${config.didKey}`,
                        'Content-Type': 'application/octet-stream',
                        'X-Name': filename || file.name || 'token-asset'
                    },
                    body: file,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                const result = await response.json();
                const ipfsHash = result.cid || result.root?.cid;
                const primaryUrl = `${config.gateway}${ipfsHash}`;
                const publicUrl = `${config.publicGateway}${ipfsHash}`;
                
                console.log(`✅ Storacha upload successful: ${ipfsHash}`);
                
                return {
                    ipfsHash,
                    gatewayUrl: primaryUrl,
                    publicUrl: publicUrl,
                    service: 'storacha'
                };

            } catch (error) {
                lastError = error;
                console.warn(`❌ Storacha attempt ${attempt} failed:`, error.message);
                
                if (attempt < config.retryAttempts) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`Storacha upload failed after ${config.retryAttempts} attempts: ${lastError.message}`);
    }

    // IPFS VERIFICATION - Test accessibility across multiple gateways
    async verifyIPFSUpload(ipfsHash, timeoutMs = 10000) {
        console.log(`🔍 Verifying IPFS upload: ${ipfsHash}`);
        
        const gateways = IPFS_CONFIG.publicGateways;
        const verificationPromises = gateways.map(async (gateway) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs / gateways.length);
                
                const response = await fetch(`${gateway}${ipfsHash}`, {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                return {
                    gateway,
                    accessible: response.ok,
                    status: response.status
                };
            } catch (error) {
                return {
                    gateway,
                    accessible: false,
                    error: error.message
                };
            }
        });

        const results = await Promise.allSettled(verificationPromises);
        const successfulGateways = results
            .filter(result => result.status === 'fulfilled' && result.value.accessible)
            .map(result => result.value.gateway);

        console.log(`✅ IPFS verification: ${successfulGateways.length}/${gateways.length} gateways accessible`);
        
        return {
            ipfsHash,
            accessibleGateways: successfulGateways,
            totalGateways: gateways.length,
            verificationScore: (successfulGateways.length / gateways.length) * 100
        };
    }

    // ENHANCED UPLOAD INTERFACE
    async uploadImage(imageFile, filename = null) {
        console.log('🖼️ Uploading token image to IPFS...');
        const result = await this.uploadFile(imageFile, filename);
        
        // Verify upload
        if (result.ipfsHash) {
            await this.verifyIPFSUpload(result.ipfsHash);
        }
        
        return result;
    }

    async uploadMetadata(metadata, filename = 'metadata.json') {
        console.log('📋 Uploading token metadata to IPFS...');
        const result = await this.uploadJSON(metadata, filename);
        
        // Verify upload
        if (result.ipfsHash) {
            await this.verifyIPFSUpload(result.ipfsHash);
        }
        
        return result;
    }

    // GET UPLOAD STATISTICS
    getUploadStats() {
        return {
            totalAttempts: this.uploadAttempts.length,
            attempts: this.uploadAttempts,
            hasFailures: this.uploadAttempts.length > 1
        };
    }
}

// DEXSCREENER-OPTIMIZED METADATA CREATOR
class TokenMetadataCreator {
    static createDexscreenerOptimizedMetadata(tokenData, imageResult = null) {
        // CRITICAL: Metaplex-compliant structure for ⚡100/⚡200 ratings
        const metadata = {
            // REQUIRED: Standard Metaplex fields
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description || `${tokenData.name} (${tokenData.symbol}) - A Solana token created for decentralized trading`,
            
            // CRITICAL: Image must be accessible via IPFS
            image: imageResult ? imageResult.gatewayUrl : '',
            
            // RECOMMENDED: External URL for enhanced visibility
            external_url: tokenData.website || '',
            
            // DEXSCREENER COMPATIBILITY: Enhanced attributes
            attributes: [
                { trait_type: 'Network', value: 'Solana' },
                { trait_type: 'Standard', value: 'SPL Token' },
                { trait_type: 'Supply', value: tokenData.supply?.toString() || '1000000000' },
                { trait_type: 'Decimals', value: (tokenData.decimals || 9).toString() },
                { trait_type: 'Created', value: new Date().toISOString().split('T')[0] },
                { trait_type: 'Creator', value: 'SolMeme Creator' },
                { trait_type: 'Verified', value: 'true' },
                ...(tokenData.attributes || [])
            ],

            // METAPLEX PROPERTIES (REQUIRED for proper indexing)
            properties: {
                files: imageResult ? [{
                    uri: imageResult.gatewayUrl,
                    type: this.getImageType(imageResult.gatewayUrl),
                    cdn: true
                }] : [],
                category: 'image',
                creators: tokenData.creators || [{
                    address: tokenData.creator || tokenData.walletAddress,
                    verified: false,
                    share: 100
                }]
            },

            // DEXSCREENER EXTENSIONS (Enhanced visibility features)
            extensions: {
                // Dexscreener-specific metadata
                dexscreener: {
                    enabled: true,
                    metadata_version: '1.0',
                    network: 'solana-mainnet',
                    standard: 'metaplex',
                    verified: true,
                    // Social links for enhanced rating
                    social_links: this.extractSocialLinks(tokenData)
                },
                
                // Token details for rating optimization
                token_details: {
                    total_supply: tokenData.supply?.toString() || '1000000000',
                    max_supply: tokenData.supply?.toString() || '1000000000',
                    circulating_supply: tokenData.supply?.toString() || '1000000000',
                    decimals: tokenData.decimals || 9,
                    mint_authority_revoked: tokenData.revokeMintAuthority || false,
                    freeze_authority_revoked: tokenData.revokeFreezeAuthority || false,
                    update_authority_revoked: tokenData.revokeUpdateAuthority || false
                },

                // Marketing and promotion data
                marketing: {
                    logo_url: imageResult ? imageResult.gatewayUrl : '',
                    banner_url: imageResult ? imageResult.gatewayUrl : '',
                    website: tokenData.website || '',
                    whitepaper: tokenData.whitepaper || '',
                    roadmap: tokenData.roadmap || ''
                }
            }
        };

        // Add seller fee basis points if transaction fee is specified
        if (tokenData.transactionFee && tokenData.transactionFee > 0) {
            metadata.seller_fee_basis_points = Math.floor(tokenData.transactionFee * 100);
        }

        return metadata;
    }

    static extractSocialLinks(tokenData) {
        const socialLinks = {};
        
        if (tokenData.website) socialLinks.website = tokenData.website;
        if (tokenData.twitter) socialLinks.twitter = tokenData.twitter;
        if (tokenData.telegram) socialLinks.telegram = tokenData.telegram;
        if (tokenData.discord) socialLinks.discord = tokenData.discord;
        if (tokenData.github) socialLinks.github = tokenData.github;
        if (tokenData.medium) socialLinks.medium = tokenData.medium;

        return socialLinks;
    }

    static createStandardMetadata(tokenData, imageUri = null) {
        // Legacy method - redirects to optimized version
        return this.createDexscreenerOptimizedMetadata(tokenData, 
            imageUri ? { gatewayUrl: imageUri } : null
        );
    }

    static createExtendedMetadata(tokenData, imageUri = null) {
        const baseMetadata = this.createStandardMetadata(tokenData, imageUri);
        
        return {
            ...baseMetadata,
            animation_url: tokenData.animationUrl || '',
            background_color: tokenData.backgroundColor || '',
            youtube_url: tokenData.youtubeUrl || '',
            twitter: tokenData.twitter || '',
            discord: tokenData.discord || '',
            telegram: tokenData.telegram || '',
            website: tokenData.website || ''
        };
    }

    static getImageType(uri) {
        const extension = uri.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'png':
                return 'image/png';
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'gif':
                return 'image/gif';
            case 'svg':
                return 'image/svg+xml';
            case 'webp':
                return 'image/webp';
            default:
                return 'image/png';
        }
    }
}

// PRODUCTION IPFS INSTANCE - Global singleton with error handling
class ProductionIPFSManager {
    constructor() {
        this.uploader = new IPFSUploader();
        this.lastUploadStats = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing Production IPFS Manager...');
        
        // Test connection to primary service
        try {
            await this.testConnection();
            console.log('✅ IPFS services connection verified');
            this.initialized = true;
        } catch (error) {
            console.warn('⚠️ IPFS connection test failed:', error.message);
            console.log('📡 IPFS services will be tested during actual uploads');
            this.initialized = true; // Allow initialization even if test fails
        }
    }

    async testConnection() {
        // Test with a minimal JSON upload
        const testData = {
            test: true,
            timestamp: Date.now(),
            message: 'IPFS connection test'
        };

        const result = await this.uploader.uploadJSON(testData, 'connection-test.json');
        console.log(`🧪 IPFS connection test successful: ${result.ipfsHash}`);
        return result;
    }

    async uploadTokenImage(imageFile, tokenSymbol) {
        await this.initialize();
        
        const filename = `${tokenSymbol.toLowerCase()}_logo.png`;
        try {
            // First attempt with fallback method which is more reliable
            console.log('📤 Uploading token image to IPFS using primary uploader...');
            const result = await this.uploader.uploadImage(imageFile, filename);
            this.lastUploadStats = this.uploader.getUploadStats();
            console.log(`✅ Image uploaded to IPFS via ${result.service}: ${result.ipfsHash}`);
            return result;
        } catch (error) {
            // Fallback to direct method if primary fails
            console.warn('⚠️ Primary IPFS upload method failed, trying direct method:', error.message);
            try {
                // Convert to blob if not already
                const file = imageFile instanceof Blob ? imageFile : new Blob([imageFile]);
                console.log('📤 Trying direct IPFS upload via add() method...');
                const added = await this.uploader.add(file);
                const cid = added.cid.toString();
                const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
                
                console.log(`✅ Image uploaded directly to IPFS: ${cid}`);
                
                return {
                    ipfsHash: cid,
                    gatewayUrl: ipfsUrl,
                    publicUrl: ipfsUrl,
                    service: 'ipfs-direct'
                };
            } catch (directError) {
                console.error('💥 All IPFS upload methods failed');
                console.error('Primary error:', error.message);
                console.error('Direct method error:', directError.message);
                throw new Error(`IPFS upload failed: ${directError.message}. Please try again or use a different image.`);
            }
        }
    }
    
    // Enhanced method that matches the recommended approach with better error handling
    async add(file) {
        await this.initialize();
        
        try {
            // Try to upload with primary service first
            console.log(`📤 Adding file to IPFS (size: ${file.size || 'unknown'} bytes)...`);
            const result = await this.uploader.uploadFile(file);
            
            console.log(`✅ File successfully added to IPFS: ${result.ipfsHash}`);
            console.log(`🔗 Gateway URL: ${result.gatewayUrl}`);
            
            // Convert to the expected format with better structure
            return {
                cid: { 
                    toString: () => result.ipfsHash 
                },
                size: file.size || 0,
                path: result.gatewayUrl,
                url: result.publicUrl || result.gatewayUrl,
                ipfsHash: result.ipfsHash // Include direct ipfsHash for convenience
            };
        } catch (error) {
            console.error('❌ IPFS add failed:', error.message);
            
            // Try each service explicitly as a last resort
            for (const service of ['pinata', 'nftStorage', 'web3storage']) {
                try {
                    console.log(`🔄 Retrying with ${service} service directly...`);
                    const result = await this.uploader.uploadToFallbackService(service, file);
                    
                    console.log(`✅ File added to IPFS via ${service}: ${result.ipfsHash}`);
                    
                    return {
                        cid: { 
                            toString: () => result.ipfsHash 
                        },
                        size: file.size || 0,
                        path: result.gatewayUrl,
                        url: result.publicUrl || result.gatewayUrl,
                        ipfsHash: result.ipfsHash
                    };
                } catch (serviceError) {
                    console.warn(`❌ ${service} upload attempt failed:`, serviceError.message);
                }
            }
            
            // If all explicit services fail, throw the original error
            throw error;
        }
    }

    async uploadTokenMetadata(tokenData, imageResult = null) {
        await this.initialize();
        
        const metadata = TokenMetadataCreator.createDexscreenerOptimizedMetadata(tokenData, imageResult);
        const filename = `${tokenData.symbol.toLowerCase()}_metadata.json`;
        const result = await this.uploader.uploadMetadata(metadata, filename);
        this.lastUploadStats = this.uploader.getUploadStats();
        
        return {
            ...result,
            metadata
        };
    }

    getLastUploadStats() {
        return this.lastUploadStats;
    }

    // Verify both image and metadata are accessible
    async verifyCompleteUpload(imageHash, metadataHash) {
        console.log('🔍 Verifying complete token asset upload...');
        
        const [imageVerification, metadataVerification] = await Promise.all([
            this.uploader.verifyIPFSUpload(imageHash),
            this.uploader.verifyIPFSUpload(metadataHash)
        ]);

        const overallScore = (imageVerification.verificationScore + metadataVerification.verificationScore) / 2;
        
        console.log(`✅ Upload verification complete: ${overallScore.toFixed(1)}% accessibility`);
        
        return {
            image: imageVerification,
            metadata: metadataVerification,
            overallScore,
            ready: overallScore >= 70 // At least 70% of gateways must be accessible
        };
    }
}

// Global IPFS instance
if (typeof window !== 'undefined') {
    window.ipfsInstance = new ProductionIPFSManager();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        IPFSUploader, 
        TokenMetadataCreator, 
        ProductionIPFSManager,
        IPFS_CONFIG 
    };
}

console.log('🔥 Production IPFS Configuration loaded with robust fallback system');
console.log('📡 Available services: Pinata (primary), NFT.Storage, Web3.Storage, Storacha (fallbacks)');
console.log('🛡️ Features: Retry logic, timeout protection, verification, fallback routing');
console.log('🎯 Optimized for Dexscreener ⚡100/⚡200 ratings with Metaplex compliance');
console.log('🔑 Using your provided API keys for all services');