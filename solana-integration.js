class SolanaIntegration {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.rpcUrl = getEnvVariable('SOLANA_RPC_URL');
        this.initializeConnection();
    }

    async initializeConnection() {
        try {
            this.connection = new solanaWeb3.Connection(this.rpcUrl, 'confirmed');
            await this.connection.getVersion();
            console.log('✅ Solana connection initialized');
            return true;
        } catch (error) {
            console.error('❌ Solana connection failed:', error);
            return false;
        }
    }

    async connectPhantomWallet() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                this.wallet = window.solana;
                console.log('✅ Phantom wallet connected:', resp.publicKey.toString());
                return {
                    publicKey: resp.publicKey.toString(),
                    isConnected: true,
                    network: 'mainnet-beta'
                };
            } catch (err) {
                console.error('❌ Phantom wallet connection failed:', err);
                throw new Error('Phantom wallet connection rejected');
            }
        } else {
            throw new Error('Phantom wallet not detected');
        }
    }

    async disconnectWallet() {
        if (this.wallet && this.wallet.isConnected) {
            await this.wallet.disconnect();
            this.wallet = null;
            console.log('👋 Wallet disconnected');
        }
    }

    get isConnected() {
        return this.wallet && this.wallet.isConnected;
    }

    async getWalletBalance() {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }
        try {
            const balance = await this.connection.getBalance(this.wallet.publicKey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('❌ Error getting wallet balance:', error);
            throw new Error('Failed to get wallet balance');
        }
    }

    async createTokenWithMetaplex({
        name,
        symbol,
        decimals,
        supply,
        metadataUri
    }) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const metaplex = new window.metaplex.Metaplex(this.connection);
            const fromWallet = this.wallet;
            metaplex.use(window.metaplex.walletAdapterIdentity(fromWallet));

            const {
                nft
            } = await metaplex.nfts().create({
                uri: metadataUri,
                name: name,
                symbol: symbol,
                sellerFeeBasisPoints: 0,
                isCollection: false,
                mintAuthority: fromWallet,
                updateAuthority: fromWallet,
                tokenStandard: window.metaplex.TokenStandard.Fungible,
                mint: solanaWeb3.Keypair.generate(),
            });

            return {
                mintAddress: nft.address.toString(),
                metadataAddress: nft.metadataAddress.toString(),
                signature: nft.transactionId,
                solscanUrl: `https://solscan.io/token/${nft.address.toString()}`
            };
        } catch (error) {
            console.error('❌ Token creation with Metaplex failed:', error);
            throw new Error('Failed to create token with Metaplex');
        }
    }

    async updateTokenMetadata(mintAddress, newMetadata) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const metaplex = new window.metaplex.Metaplex(this.connection);
            const fromWallet = this.wallet;
            metaplex.use(window.metaplex.walletAdapterIdentity(fromWallet));

            const nft = await metaplex.nfts().findByMint({
                mintAddress
            });
            const {
                response
            } = await metaplex.nfts().update({
                nftOrSft: nft,
                ...newMetadata
            });

            return {
                signature: response.signature,
                solscanUrl: `https://solscan.io/tx/${response.signature}`
            };
        } catch (error) {
            console.error('❌ Token metadata update failed:', error);
            throw new Error('Failed to update token metadata');
        }
    }

    async setAuthority(mintAddress, newAuthority, authorityType) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const fromWallet = this.wallet;
            const transaction = new solanaWeb3.Transaction().add(
                window.splToken.createSetAuthorityInstruction(
                    mintAddress,
                    fromWallet.publicKey,
                    authorityType,
                    newAuthority
                )
            );

            const {
                signature
            } = await window.solana.signAndSendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            return {
                signature: signature,
                solscanUrl: `https://solscan.io/tx/${signature}`
            };
        } catch (error) {
            console.error(`❌ Set ${authorityType} authority failed:`, error);
            throw new Error(`Failed to set ${authorityType} authority`);
        }
    }

    async revokeAuthorities(mintAddress, authorityTypes) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const fromWallet = this.wallet;
            const transaction = new solanaWeb3.Transaction();

            for (const authorityType of authorityTypes) {
                transaction.add(
                    window.splToken.createSetAuthorityInstruction(
                        mintAddress,
                        fromWallet.publicKey,
                        authorityType,
                        null
                    )
                );
            }

            const {
                signature
            } = await window.solana.signAndSendTransaction(transaction);
            await this.connection.confirmTransaction(signature);

            return {
                signature: signature,
                solscanUrl: `https://solscan.io/tx/${signature}`
            };
        } catch (error) {
            console.error('❌ Authority revocation failed:', error);
            throw new Error('Failed to revoke authorities');
        }
    }

    async getAuthorityStatus(mintAddress) {
        if (!this.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            const mintInfo = await window.splToken.getMint(this.connection, mintAddress);
            return {
                mintAuthority: mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : 'Revoked',
                freezeAuthority: mintInfo.freezeAuthority ? mintInfo.freezeAuthority.toBase58() : 'Revoked',
            };
        } catch (error) {
            console.error('❌ Failed to get authority status:', error);
            throw new Error('Failed to get authority status');
        }
    }


    getConnectionStatus() {
        return {
            rpcUrl: this.rpcUrl,
            isConnected: !!this.connection,
        };
    }

    getDebugInfo() {
        return {
            wallet: this.wallet ? this.wallet.publicKey.toString() : null,
            isConnected: this.isConnected,
            connection: this.connection ? this.connection.rpcEndpoint : null,
        };
    }

    async verifyMainnetConnection() {
        try {
            const genesisHash = await this.connection.getGenesisHash();
            const slot = await this.connection.getSlot();
            return {
                genesisHash,
                slot,
                isMainnet: genesisHash === '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
            };
        } catch (error) {
            console.error('❌ Failed to verify mainnet connection:', error);
            return {
                isMainnet: false
            };
        }
    }
}

window.solanaInstance = new SolanaIntegration();