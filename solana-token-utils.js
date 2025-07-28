// Solana SPL Token Utilities
// Browser-compatible utilities for SPL token creation and management

// Buffer polyfill for browser compatibility
if (typeof window !== 'undefined' && !window.Buffer) {
    console.warn('Buffer not found, please include Buffer polyfill');
}

class SolanaTokenUtils {
    constructor(rpcUrl = 'https://solana-mainnet.g.alchemy.com/v2/PVF7BjfV8uajJQcxoAN0D') {
        this.connection = new solanaWeb3.Connection(rpcUrl, 'confirmed');
        this.wallet = null;
    }

    // Connect to Phantom wallet
    async connectWallet() {
        try {
            if (!window.solana || !window.solana.isPhantom) {
                throw new Error('Phantom wallet not detected. Please install Phantom.');
            }

            const response = await window.solana.connect();
            this.wallet = window.solana;
            return response.publicKey;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    // Check wallet connection status
    async checkWalletConnection() {
        try {
            if (window.solana && window.solana.isPhantom) {
                const response = await window.solana.connect({ onlyIfTrusted: true });
                if (response.publicKey) {
                    this.wallet = window.solana;
                    return response.publicKey;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // Get wallet balance
    async getWalletBalance(publicKey = null) {
        try {
            const walletKey = publicKey || this.wallet?.publicKey;
            if (!walletKey) throw new Error('No wallet connected');

            const balance = await this.connection.getBalance(walletKey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Failed to get wallet balance:', error);
            throw error;
        }
    }

    // Create SPL Token
    async createToken(tokenConfig) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not connected');
            }

            const {
                name,
                symbol,
                decimals = 9,
                initialSupply,
                description = '',
                imageUri = null,
                metadataUri = null
            } = tokenConfig;

            // Generate new mint keypair
            const mintKeypair = solanaWeb3.Keypair.generate();
            console.log('Generated mint keypair:', mintKeypair.publicKey.toString());

            // Create mint account
            const createMintTx = await splToken.createMint(
                this.connection,
                this.wallet,
                this.wallet.publicKey, // mint authority
                this.wallet.publicKey, // freeze authority
                decimals,
                mintKeypair
            );

            console.log('Mint created:', createMintTx);

            // Get or create associated token account
            const associatedTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
                this.connection,
                this.wallet,
                mintKeypair.publicKey,
                this.wallet.publicKey
            );

            console.log('Associated token account:', associatedTokenAccount.address.toString());

            // Mint initial supply
            const mintAmount = BigInt(initialSupply) * BigInt(10 ** decimals);
            const mintToTx = await splToken.mintTo(
                this.connection,
                this.wallet,
                mintKeypair.publicKey,
                associatedTokenAccount.address,
                this.wallet.publicKey,
                mintAmount
            );

            console.log('Tokens minted:', mintToTx);

            return {
                mintAddress: mintKeypair.publicKey.toString(),
                createMintSignature: createMintTx,
                mintToSignature: mintToTx,
                tokenAccountAddress: associatedTokenAccount.address.toString(),
                success: true
            };

        } catch (error) {
            console.error('Token creation failed:', error);
            throw error;
        }
    }

    // Revoke authorities (optional security measure)
    async revokeAuthorities(mintAddress, authorities = ['mint', 'freeze']) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not connected');
            }

            const mintPublicKey = new solanaWeb3.PublicKey(mintAddress);
            const signatures = [];

            if (authorities.includes('mint')) {
                const revokeMintTx = await splToken.setAuthority(
                    this.connection,
                    this.wallet,
                    mintPublicKey,
                    this.wallet.publicKey,
                    splToken.AuthorityType.MintTokens,
                    null // Setting to null revokes the authority
                );
                signatures.push({ type: 'mint', signature: revokeMintTx });
            }

            if (authorities.includes('freeze')) {
                const revokeFreezeAttack = await splToken.setAuthority(
                    this.connection,
                    this.wallet,
                    mintPublicKey,
                    this.wallet.publicKey,
                    splToken.AuthorityType.FreezeAccount,
                    null
                );
                signatures.push({ type: 'freeze', signature: revokeFreezeAttack });
            }

            return signatures;
        } catch (error) {
            console.error('Failed to revoke authorities:', error);
            throw error;
        }
    }

    // Get token information
    async getTokenInfo(mintAddress) {
        try {
            const mintPublicKey = new solanaWeb3.PublicKey(mintAddress);
            const mintInfo = await splToken.getMint(this.connection, mintPublicKey);

            return {
                mintAddress: mintAddress,
                decimals: mintInfo.decimals,
                supply: mintInfo.supply.toString(),
                mintAuthority: mintInfo.mintAuthority?.toString() || 'None',
                freezeAuthority: mintInfo.freezeAuthority?.toString() || 'None',
                isInitialized: mintInfo.isInitialized
            };
        } catch (error) {
            console.error('Failed to get token info:', error);
            throw error;
        }
    }

    // Get token balance for a specific wallet
    async getTokenBalance(mintAddress, walletAddress = null) {
        try {
            const wallet = walletAddress ? new solanaWeb3.PublicKey(walletAddress) : this.wallet.publicKey;
            const mintPublicKey = new solanaWeb3.PublicKey(mintAddress);

            const tokenAccount = await splToken.getAssociatedTokenAddress(
                mintPublicKey,
                wallet
            );

            const balance = await this.connection.getTokenAccountBalance(tokenAccount);
            return {
                balance: balance.value.amount,
                decimals: balance.value.decimals,
                uiAmount: balance.value.uiAmount
            };
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return null;
        }
    }

    // Transfer tokens
    async transferTokens(mintAddress, recipientAddress, amount, decimals = 9) {
        try {
            if (!this.wallet) {
                throw new Error('Wallet not connected');
            }

            const mintPublicKey = new solanaWeb3.PublicKey(mintAddress);
            const recipientPublicKey = new solanaWeb3.PublicKey(recipientAddress);

            // Get sender's token account
            const senderTokenAccount = await splToken.getAssociatedTokenAddress(
                mintPublicKey,
                this.wallet.publicKey
            );

            // Get or create recipient's token account
            const recipientTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
                this.connection,
                this.wallet,
                mintPublicKey,
                recipientPublicKey
            );

            // Transfer tokens
            const transferAmount = BigInt(amount) * BigInt(10 ** decimals);
            const signature = await splToken.transfer(
                this.connection,
                this.wallet,
                senderTokenAccount,
                recipientTokenAccount.address,
                this.wallet.publicKey,
                transferAmount
            );

            return signature;
        } catch (error) {
            console.error('Token transfer failed:', error);
            throw error;
        }
    }

    // Utility: Format large numbers
    static formatTokenAmount(amount, decimals = 9) {
        const divisor = Math.pow(10, decimals);
        const formatted = (Number(amount) / divisor).toLocaleString();
        return formatted;
    }

    // Utility: Validate Solana address
    static isValidSolanaAddress(address) {
        try {
            new solanaWeb3.PublicKey(address);
            return true;
        } catch {
            return false;
        }
    }

    // Utility: Shorten address for display
    static shortenAddress(address, chars = 4) {
        if (!address) return '';
        return `${address.slice(0, chars)}...${address.slice(-chars)}`;
    }

    // Get explorer URL
    static getExplorerUrl(signature, cluster = 'mainnet-beta') {
        const baseUrl = cluster === 'mainnet-beta' 
            ? 'https://solscan.io' 
            : `https://solscan.io?cluster=${cluster}`;
        return `${baseUrl}/tx/${signature}`;
    }

    // Get token explorer URL
    static getTokenExplorerUrl(mintAddress, cluster = 'mainnet-beta') {
        const baseUrl = cluster === 'mainnet-beta' 
            ? 'https://solscan.io' 
            : `https://solscan.io?cluster=${cluster}`;
        return `${baseUrl}/token/${mintAddress}`;
    }
}

// Error handling utilities
class SolanaError extends Error {
    constructor(message, code = null, details = null) {
        super(message);
        this.name = 'SolanaError';
        this.code = code;
        this.details = details;
    }
}

// Common error codes and messages
const SOLANA_ERROR_CODES = {
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    INVALID_ADDRESS: 'INVALID_ADDRESS',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR'
};

const SOLANA_ERROR_MESSAGES = {
    [SOLANA_ERROR_CODES.WALLET_NOT_FOUND]: 'Phantom wallet not detected. Please install Phantom.',
    [SOLANA_ERROR_CODES.WALLET_NOT_CONNECTED]: 'Wallet not connected. Please connect your wallet.',
    [SOLANA_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient SOL balance for transaction.',
    [SOLANA_ERROR_CODES.INVALID_ADDRESS]: 'Invalid Solana address provided.',
    [SOLANA_ERROR_CODES.TRANSACTION_FAILED]: 'Transaction failed to execute.',
    [SOLANA_ERROR_CODES.NETWORK_ERROR]: 'Network error occurred. Please try again.'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        SolanaTokenUtils, 
        SolanaError, 
        SOLANA_ERROR_CODES, 
        SOLANA_ERROR_MESSAGES 
    };
}