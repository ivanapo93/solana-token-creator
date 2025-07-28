/**
 * NFT.Storage Client for IPFS Upload
 * Provides a reliable way to upload token images and metadata to IPFS
 */

class NFTStorageClient {
    constructor(apiKey) {
        this.apiKey = apiKey || 'YOUR_NFT_STORAGE_KEY'; // Replace with your key
        this.endpoint = 'https://api.nft.storage/upload';
        this.gatewayUrl = 'https://ipfs.io/ipfs/';
    }

    /**
     * Upload a file to NFT.Storage
     * @param {File|Blob} file - File or Blob to upload
     * @returns {Promise<string>} - Returns IPFS URI
     */
    async uploadFile(file) {
        try {
            // Check if we have a valid file
            if (!file) {
                throw new Error('No file provided for upload');
            }

            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            // Upload to NFT.Storage
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            // Handle non-OK response
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`NFT.Storage upload failed: ${response.status} ${response.statusText} ${errorData.error?.message || ''}`);
            }

            // Parse result
            const result = await response.json();
            
            // Validate response
            if (!result.ok || !result.value || !result.value.cid) {
                throw new Error('Invalid response from NFT.Storage');
            }

            // Return gateway URL for the uploaded file
            return `${this.gatewayUrl}${result.value.cid}`;
        } catch (error) {
            console.error('NFT.Storage upload failed:', error);
            throw error;
        }
    }

    /**
     * Upload token metadata to NFT.Storage
     * @param {Object} metadata - Token metadata object
     * @returns {Promise<string>} - Returns IPFS URI for metadata
     */
    async uploadMetadata(metadata) {
        try {
            // Create metadata blob
            const metadataBlob = new Blob([JSON.stringify(metadata)], { 
                type: 'application/json' 
            });
            
            // Create File object from blob
            const metadataFile = new File([metadataBlob], 'metadata.json', { 
                type: 'application/json' 
            });

            // Upload metadata file
            return await this.uploadFile(metadataFile);
        } catch (error) {
            console.error('Metadata upload failed:', error);
            throw error;
        }
    }

    /**
     * Create and upload token metadata with image
     * @param {Object} tokenData - Token data object with name, symbol, etc.
     * @param {string} imageUri - Optional IPFS URI for token image
     * @returns {Promise<string>} - Returns IPFS URI for metadata
     */
    async createAndUploadMetadata(tokenData, imageUri = null) {
        try {
            // Create metadata object
            const metadata = {
                name: tokenData.name,
                symbol: tokenData.symbol,
                description: tokenData.description || '',
                image: imageUri || '',
                attributes: [],
                properties: {
                    files: imageUri ? [{ uri: imageUri, type: "image/png" }] : [],
                    category: "image",
                    creators: []
                }
            };

            // Add social links if provided
            if (tokenData.website || tokenData.twitter || tokenData.telegram || tokenData.discord) {
                metadata.external_url = tokenData.website || '';
                metadata.twitter_url = tokenData.twitter || '';
                metadata.telegram_url = tokenData.telegram || '';
                metadata.discord_url = tokenData.discord || '';
            }

            // Upload metadata
            return await this.uploadMetadata(metadata);
        } catch (error) {
            console.error('Metadata creation and upload failed:', error);
            throw error;
        }
    }

    /**
     * Upload an image file and create metadata for a token
     * @param {Object} tokenData - Token data (name, symbol, etc.)
     * @param {File} imageFile - Image file to upload
     * @returns {Promise<Object>} - Returns object with image and metadata URIs
     */
    async uploadTokenWithImage(tokenData, imageFile) {
        try {
            // Upload image first
            const imageUri = await this.uploadFile(imageFile);
            
            // Then create and upload metadata with the image URI
            const metadataUri = await this.createAndUploadMetadata(tokenData, imageUri);
            
            return {
                imageUri,
                metadataUri
            };
        } catch (error) {
            console.error('Failed to upload token with image:', error);
            throw error;
        }
    }
}

// Export for use in browser environment
if (typeof window !== 'undefined') {
    window.NFTStorageClient = NFTStorageClient;
}

// Export for use in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NFTStorageClient };
}