import * as solanaWeb3 from '@solana/web3.js';

/**
 * Enhanced Wallet Connector for Solana dApps
 * 
 * Features:
 * - Multi-wallet support (Phantom, Solflare, Slope, etc.)
 * - Auto-reconnection on page reload
 * - Persistent wallet preferences
 * - Comprehensive error handling
 * - Connection status tracking
 * - Balance monitoring
 * - Network validation
 * - UI integration helpers
 */

class WalletConnector {
    constructor(options = {}) {
        // Default options
        this.options = {
            autoConnect: options.autoConnect !== undefined ? options.autoConnect : true,
            defaultWallet: options.defaultWallet || 'phantom',
            network: options.network || 'mainnet-beta',
            requiredBalance: options.requiredBalance || 0.001, // Minimum SOL required
            connectionTimeout: options.connectionTimeout || 30000, // 30 seconds
            localStorageKey: options.localStorageKey || 'solmeme_wallet_data',
            onConnectStart: options.onConnectStart || null,
            onConnectSuccess: options.onConnectSuccess || null,
            onConnectError: options.onConnectError || null,
            onDisconnect: options.onDisconnect || null,
            onBalanceUpdate: options.onBalanceUpdate || null,
            onNetworkChange: options.onNetworkChange || null,
            onAccountChange: options.onAccountChange || null,
            solanaInstance: options.solanaInstance || null,
            errorMonitor: options.errorMonitor || (window.errorMonitor || null)
        };

        // State
        this.state = {
            wallet: null,
            publicKey: null,
            isConnecting: false,
            isConnected: false,
            provider: null,
            providerName: null,
            balance: null,
            lastConnected: null,
            connectionErrors: [],
            balanceLastUpdated: null,
            connectionAttempts: 0,
            autoReconnectEnabled: true,
            networkName: null,
            isCorrectNetwork: false
        };

        // Supported wallets configuration
        this.supportedWallets = {
            phantom: {
                name: 'Phantom',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iNjQiIGZpbGw9IiM0QTQ5REYiLz4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwKSI+CjxwYXRoIGQ9Ik0xMDYuNTgzIDc4LjM4NDlDMTA2LjU4MyA4NC42MTYyIDEwMS41NTMgODkuNjQ0MiA5NS4zMTQzIDg5LjY0NDJDOTIuNDg5NyA4OS42NDQyIDg5LjkyNiA4OC40OTEzIDg4LjAwNTQgODYuNTcwN0w4OC4wNDYzIDg2LjYxMTZMNzcuMDQ2MSA3NS42MTUzVjc1LjYxMDZMNzcuMDA5OCA3NS41NzQ0Qzc1LjA0OTMgNzMuNzExMyA3Mi41MzMgNzIuNjI2OSA2OS43NjgzIDcyLjYyNjlDNjMuNTI5NSA3Mi42MjY5IDU4LjQ5OTUgNzcuNjU0OSA1OC40OTk1IDgzLjg4NjNDNTguNDk5NSA5MC4xMTc2IDYzLjUyOTUgOTUuMTQ1NiA2OS43NjgzIDk1LjE0NTZIOTYuOTkwOEMxMDIuMjM5IDk1LjE0NTYgMTA2LjU4MyA5OS40ODkzIDEwNi41ODMgMTA0LjczOEMxMDYuNTgzIDEwOS45ODYgMTAyLjIzOSAxMTQuMzMgOTYuOTkwOCAxMTQuMzNIMjcuNTkzM0wyNy41ODM5IDExNC4zMjFDMjcuNTEyMSAxMTQuMzI2IDI3LjQzNTcgMTE0LjMzIDI3LjM2MzggMTE0LjMzQzIyLjExNTggMTE0LjMzIDE3Ljc3MTkgMTA5Ljk4NiAxNy43NzE5IDEwNC43MzhDMTcuNzcxOSA5OS40ODkzIDIyLjExNTggOTUuMTQ1NiAyNy4zNjM4IDk1LjE0NTZINTQuNTg2M0M1OS44MzQzIDk1LjE0NTYgNjQuMTc4MiA5MC44MDE5IDY0LjE3ODIgODUuNTUzOEM2NC4xNzgyIDgwLjMwNTggNTkuODM0MyA3NS45NjIxIDU0LjU4NjMgNzUuOTYyMUM0OS4zMzgzIDc1Ljk2MjEgNDQuOTk0NCA4MC4zMDU4IDQ0Ljk5NDQgODUuNTUzOEM0NC45OTQ0IDg2LjQ5OTUgNDUuMTQ4OCA4Ny40MTE0IDQ1LjQzMTYgODguMjY0MUwzNC40NzU2IDc3LjMwODFMMzQuNDcwOSA3Ny4zMDM0QzM1LjAzMDcgNzIuNTc3NCAzOS4wMTYyIDY4LjgyMjQgNDMuODY1MiA2OC44MjI0QzQ2LjYzIDY4LjgyMjQgNDkuMTQ2MiA2OS45MDY3IDUxLjEwNjcgNzEuNzY5OEw1MS4xNDMgNzEuODA2MUw3MS40MjgzIDkyLjA5NThMNzEuNDQ3MSA5Mi4xMTQ2QzczLjM2NzcgOTQuMDM1MSA3NS45MzE0IDk1LjE4ODEgNzguNzU1OSA5NS4xODgxQzg0Ljk5NDcgOTUuMTg4MSA5MC4wMjQ3IDkwLjE2MDEgOTAuMDI0NyA4My45Mjg3QzkwLjAyNDcgNzcuNjk3NCA4NC45OTQ3IDcyLjY2OTQgNzguNzU1OSA3Mi42Njk0QzcxLjg0MDMgNzIuNjY5NCA2Ni4yNzA0IDc3LjQ0NTEgNjUuMTg3NiA4My45NTZMNTQuMTc2MSA3Mi45NDQ2QzU2LjA5NjcgNjMuODg0MiA2NC4yMTQ0IDU2Ljk5NzcgNzMuOTg1NyA1Ni45OTc3Qzc2Ljc1MDQgNTYuOTk3NyA3OS4zODI0IDU3LjU3MjEgODEuNzMwNCA1OC42MTdDODEuNzU4MiA1OC42MzEgODEuNzkwNiA1OC42NDUgODEuODE5IDU4LjY1ODlDODEuODk1NCA1OC42OTUxIDgxLjk3MTcgNTguNzMxNCA4Mi4wNDgxIDU4Ljc2NzdDODIuMTI0NSA1OC44MDQ3IDgyLjIwMDggNTguODQwOSA4Mi4yNzI2IDU4Ljg3N0M4Mi4zMTU2IDU4Ljg5OSA4Mi4zNTMxIDU4LjkxNjQgODIuMzk1NCA1OC45MzkxTDgyLjQ2MjYgNTguOTcyM0M4Mi41NjI1IDU5LjAyOTkgODIuNjYyNCA1OS4wODc0IDgyLjc1NzggNTkuMTQ5NkM4Mi43ODU2IDU5LjE2NzEgODIuODE4IDU5LjE4MSA4Mi44NDU4IDU5LjE5ODRDODIuOTc4NiA1OS4yNzkzIDgzLjEwNjggNTkuMzY1IDgzLjIzMDQgNTkuNDU1QzgzLjIzOTcgNTkuNDU5NiA4My4yNDkgNTkuNDY0MiA4My4yNTg0IDU5LjQ2ODlDODMuMzM0NyA1OS41MTkxIDgzLjQwNjUgNTkuNTY5NCA4My40ODI5IDU5LjYyNDNDODMuNTA1NSA1OS42MzgzIDgzLjUyODEgNTkuNjUyMiA4My41NTA3IDU5LjY2NjFDODQuODg5OCA2MC41MTk5IDg2LjEwMzcgNjEuNTUxIDg3LjE0ODYgNjIuNzI0MUM4Ny4xNTggNjIuNzMzNSA4Ny4xNjc0IDYyLjc0MjggODcuMTc2NyA2Mi43NTIyQzg3LjIyNjkgNjIuODA5OCA4Ny4yNzI1IDYyLjg2NzMgODcuMzIyOCA2Mi45MjQ5Qzg3LjM1NTIgNjIuOTYxMSA4Ny4zODc1IDYyLjk5NzQgODcuNDE0NyA2My4wMzM2Qzg3LjQyNDEgNjMuMDQzIDg3LjQyODcgNjMuMDUyNCA4Ny40MzggNjMuMDYxN0M4Ny40NzAzIDYzLjEwMjYgODcuNTA3MyA2My4xNDM1IDg3LjUzOSA2My4xODQ0Qzg3LjU4NDcgNjMuMjQ0NiA4Ny42MzAzIDYzLjMwOTUgODcuNjcxMiA2My4zNzQ0Qzg3LjY5ODQgNjMuNDExNCA4Ny43MjYyIDYzLjQ0ODMgODcuNzUzNSA2My40ODUzQzg3Ljc5NDQgNjMuNTQ1NSA4Ny44MzUzIDYzLjYwNTcgODcuODcxNSA2My42NjU5Qzg3Ljg5NDEgNjMuNzAzIDg3LjkyMTQgNjMuNzM5OSA4Ny45NDQgNjMuNzc3Qzg3Ljk4NDkgNjMuODQxOSA4OC4wMjEyIDYzLjkwNjggODguMDYyMSA2My45NzE3Qzg4LjA4NDcgNjQuMDE3NCA4OC4xMTIgNjQuMDYzIDg4LjEzNDYgNjQuMTA4N0M4OC4xNzA4IDY0LjE3ODIgODguMjAyNSA2NC4yNDc4IDg4LjIzODcgNjQuMzE3M0M4OC4yNTY3IDY0LjM1ODIgODguMjc0NyA2NC4zOTkxIDg4LjI5MjYgNjQuNDRDODguMzI0MyA2NC41MDk1IDg4LjM1NiA2NC41NzkgODguMzgzMyA2NC42NDg2Qzg4LjQwMTMgNjQuNjk0MiA4OC40MTkzIDY0LjczOTkgODguNDM3MiA2NC43ODU1Qzg4LjQ2NDUgNjQuODU5NyA4OC40OTE3IDY0LjkyOTIgODguNTE5IDY1LjAwMzNDODguNTMyOSA2NS4wNDQyIDg4LjU0NjkgNjUuMDg1MiA4OC41NjA4IDY1LjEyNjFDODguNTg4MSA2NS4yMDQ2IDg4LjYxNTMgNjUuMjgzMiA4OC42Mzc5IDY1LjM2NjRDODguNjUxOCA2NS40MTIxIDg4LjY2NTcgNjUuNDU3OCA4OC42NzUxIDY1LjUwMzVDODguNjk3NyA2NS41ODY3IDg4LjcyMDMgNjUuNjc0NiA4OC43MzgzIDY1Ljc2MjRDODguNzQ3NiA2NS44MDMzIDg4Ljc2MTYgNjUuODQ4OSA4OC43NzA5IDY1Ljg4OThDODguNzk4MiA2NS45OTY3IDg4LjgyMDggNjYuMTA0MiA4OC44Mzg4IDY2LjIwNzFDODguODQzNCA2Ni4yNDM0IDg4Ljg1MjcgNjYuMjc5NiA4OC44NTc0IDY2LjMxNTlDODguODgwIDY2LjQ0MzUgODguOTAyNiA2Ni41NzU5IDg4LjkyMDUgNjYuNzA4N0M4OC45MjA1IDY2LjcyNzMgODguOTI5OSA2Ni43NDU5IDg4LjkyOTkgNjYuNzY0NEM4OC45NDc5IDY2LjkwNjUgODguOTYxOCA2Ny4wNDg2IDg4Ljk3NTggNjcuMTkwOEw4OC45ODAzIDY3LjI2NDlDODguOTg0OSA2Ny4zMzQ1IDg4Ljk5NDMgNjcuNDA0IDg4Ljk5NDMgNjcuNDczNkM4OC45OTQzIDc0LjQyODMgODguOTk0MyA4MS4zODMgODguOTk0MyA4OC4zMzc3Qzg5LjYyOTkgODkuMTUzMyA5MC41MDU4IDg5LjY0NDIgOTEuNDg3MSA4OS42NDQyQzk0LjMxMTYgODkuNjQ0MiA5Ni41OTk4IDg3LjM1NiA5Ni41OTk4IDg0LjUzMTRDOTYuNTk5OCA4MS43MDY5IDk0LjMxMTYgNzkuNDE4NyA5MS40ODcxIDc5LjQxODdIODYuOTQxNEM4Ni4zMDU4IDc5LjQxODcgODUuNzkyNyA3OC45MDU2IDg1Ljc5MjcgNzguMjY5OUM4NS43OTI3IDc3LjYzNDMgODYuMzA1OCA3Ny4xMjExIDg2Ljk0MTQgNzcuMTIxMUg5MS40ODcxQzk0LjMxMTYgNzcuMTIxMSA5Ni41OTk4IDc0LjgzMjkgOTYuNTk5OCA3Mi4wMDg0Qzk2LjU5OTggNjkuMTgzOCA5NC4zMTE2IDY2Ljg5NTYgOTEuNDg3MSA2Ni44OTU2SDg2Ljk0MTRDODYuMzA1OCA2Ni44OTU2IDg1Ljc5MjcgNjYuMzgyNSA4NS43OTI3IDY1Ljc0NjlDODUuNzkyNyA2NS4xMTEzIDg2LjMwNTggNjQuNTk4MiA4Ni45NDE0IDY0LjU5ODJIOTEuNDg3MUM5My4wMTI2IDY0LjU5ODIgOTQuNDMzOCA2NS4xMTYgOTUuNTkyMSA2NS45ODk2QzEwMS41MTIgNjcuNDczNiAxMDYuNTg4IDcyLjU4MzQgMTA2LjU4OCA3OC4zODQ5WiIgZmlsbD0id2hpdGUiLz4KPC9nPgo8ZGVmcz4KPGNsaXBQYXRoIGlkPSJjbGlwMCI+CjxyZWN0IHdpZHRoPSI4OS4wMjc3IiBoZWlnaHQ9IjU3LjMzMjMiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNy43NzE5IDU2Ljk5NzcpIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==',
                adapter: window.solana
            },
            solflare: {
                name: 'Solflare',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEzIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDExMyAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01NS41IDE3LjVMMTcuNSA4OEg5My41TDU1LjUgMTcuNVoiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8xNjlfMzgpIi8+CjxwYXRoIGQ9Ik0zOSA2Nkw1NS41IDM5LjVMNzIgNjZIMzlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNODYgOTcuNUg5OEw2NC41IDQyTDUzLjUgNjEuNU02OC41IDk3LjVIODEuNUw0NC41IDM0TDMzLjUgNTIuNU00Ny41IDk3LjVIMjVMMzkgNzJIMkw0Ny41IDk3LjVaIiBzdHJva2U9InVybCgjcGFpbnQxX2xpbmVhcl8xNjlfMzgpIiBzdHJva2Utd2lkdGg9IjQiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xNjlfMzgiIHgxPSIxNy41IiB5MT0iODgiIHgyPSI5My41IiB5Mj0iODgiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZEQTYzQyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjNCM0IiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzE2OV8zOCIgeDE9IjIiIHkxPSI1MiIgeDI9Ijk4IiB5Mj0iNTIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZEQTYzQyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjNCM0IiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K',
                adapter: window.solflare
            }
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the wallet connector
     * @private
     */
    async init() {
        try {
            // Try to load saved state
            this.loadState();
            
            // Check for available wallets
            await this.detectWallets();
            
            // Auto connect if enabled
            if (this.options.autoConnect && this.state.lastConnected) {
                await this.connect(this.state.providerName || this.options.defaultWallet);
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            this.logError('Failed to initialize wallet connector', error);
        }
    }
    
    /**
     * Detect available wallet providers
     * @private
     */
    async detectWallets() {
        // Detect Phantom wallet
        if (window.solana && window.solana.isPhantom) {
            this.supportedWallets.phantom.adapter = window.solana;
        } else {
            delete this.supportedWallets.phantom;
        }
        
        // Detect Solflare wallet
        if (window.solflare && window.solflare.isSolflare) {
            this.supportedWallets.solflare.adapter = window.solflare;
        } else {
            delete this.supportedWallets.solflare;
        }
        
        // Return available wallets
        return Object.keys(this.supportedWallets);
    }

    /**
     * Get list of available wallets
     * @returns {Array} Array of available wallet providers
     */
    getAvailableWallets() {
        return Object.keys(this.supportedWallets).map(id => ({
            id,
            name: this.supportedWallets[id].name,
            icon: this.supportedWallets[id].icon
        }));
    }

    /**
     * Connect to wallet
     * @param {string} walletName - Name of the wallet to connect to
     * @returns {Promise<Object>} Connection result
     */
    async connect(walletName = null) {
        try {
            // If already connecting, return
            if (this.state.isConnecting) {
                throw new Error('Wallet connection already in progress');
            }
            
            // If already connected, return current state
            if (this.state.isConnected) {
                return {
                    success: true,
                    publicKey: this.state.publicKey,
                    wallet: this.state.wallet,
                    provider: this.state.provider,
                    providerName: this.state.providerName
                };
            }
            
            // Update state
            this.state.isConnecting = true;
            this.state.connectionAttempts++;
            
            // Call onConnectStart callback
            if (this.options.onConnectStart) {
                this.options.onConnectStart({
                    wallet: walletName || this.options.defaultWallet
                });
            }
            
            // Determine which wallet to use
            const walletId = walletName || this.state.providerName || this.options.defaultWallet;
            
            // Check if wallet is available
            if (!this.supportedWallets[walletId]) {
                throw new Error(`Wallet ${walletId} not available`);
            }
            
            // Get wallet adapter
            const wallet = this.supportedWallets[walletId].adapter;
            
            if (!wallet) {
                throw new Error(`${walletId} wallet not detected. Please install ${this.supportedWallets[walletId].name} extension`);
            }
            
            // Connect with timeout
            const connectPromise = wallet.connect({ onlyIfTrusted: false });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Wallet connection timeout')), this.options.connectionTimeout)
            );
            
            const response = await Promise.race([connectPromise, timeoutPromise]);
            
            // Update state
            this.state.wallet = wallet;
            this.state.publicKey = response.publicKey.toString();
            this.state.isConnected = true;
            this.state.isConnecting = false;
            this.state.provider = wallet;
            this.state.providerName = walletId;
            this.state.lastConnected = Date.now();
            
            // Save state
            this.saveState();
            
            // Verify network
            await this.verifyNetwork();
            
            // Get balance
            await this.updateBalance();
            
            // Call onConnectSuccess callback
            if (this.options.onConnectSuccess) {
                this.options.onConnectSuccess({
                    publicKey: this.state.publicKey,
                    wallet: this.state.wallet,
                    provider: this.state.provider,
                    providerName: this.state.providerName
                });
            }
            
            return {
                success: true,
                publicKey: this.state.publicKey,
                wallet: this.state.wallet,
                provider: this.state.provider,
                providerName: this.state.providerName
            };
        } catch (error) {
            // Update state
            this.state.isConnecting = false;
            this.state.connectionErrors.push({
                timestamp: Date.now(),
                error: error.message
            });
            
            // Limit error history
            if (this.state.connectionErrors.length > 5) {
                this.state.connectionErrors.shift();
            }
            
            // Log error
            this.logError('Wallet connection failed', error);
            
            // Call onConnectError callback
            if (this.options.onConnectError) {
                this.options.onConnectError({
                    error,
                    attempts: this.state.connectionAttempts,
                    wallet: walletName || this.options.defaultWallet
                });
            }
            
            throw error;
        }
    }

    /**
     * Disconnect wallet
     * @returns {Promise<boolean>} Success status
     */
    async disconnect() {
        try {
            // If not connected, return
            if (!this.state.isConnected || !this.state.wallet) {
                return true;
            }
            
            // Disconnect wallet
            await this.state.wallet.disconnect();
            
            // Reset state
            this.resetState();
            
            // Call onDisconnect callback
            if (this.options.onDisconnect) {
                this.options.onDisconnect();
            }
            
            return true;
        } catch (error) {
            // Log error
            this.logError('Wallet disconnect failed', error);
            
            // Force reset state
            this.resetState();
            
            return false;
        }
    }

    /**
     * Update wallet balance
     * @returns {Promise<number>} Wallet balance in SOL
     */
    async updateBalance() {
        try {
            // If not connected, return
            if (!this.state.isConnected || !this.state.publicKey) {
                return 0;
            }
            
            let balance = 0;
            
            // If using SolanaIntegration instance
            if (this.options.solanaInstance && this.options.solanaInstance.getWalletBalance) {
                balance = await this.options.solanaInstance.getWalletBalance();
            }
            // Otherwise use direct connection
            else if (this.state.wallet && this.state.publicKey) {
                const connection = new solanaWeb3.Connection(
                    this.getDefaultRpcUrl(),
                    'confirmed'
                );
                
                const publicKey = new solanaWeb3.PublicKey(this.state.publicKey);
                const rawBalance = await connection.getBalance(publicKey);
                balance = rawBalance / solanaWeb3.LAMPORTS_PER_SOL;
            }
            
            // Update state
            this.state.balance = balance;
            this.state.balanceLastUpdated = Date.now();
            
            // Call onBalanceUpdate callback
            if (this.options.onBalanceUpdate) {
                this.options.onBalanceUpdate({
                    balance,
                    publicKey: this.state.publicKey
                });
            }
            
            // Check if balance is sufficient
            if (balance < this.options.requiredBalance) {
                console.warn(`Low balance warning: ${balance} SOL is below required ${this.options.requiredBalance} SOL`);
            }
            
            return balance;
        } catch (error) {
            // Log error
            this.logError('Failed to update balance', error);
            return 0;
        }
    }

    /**
     * Verify if wallet is on correct network
     * @returns {Promise<boolean>} Is on correct network
     */
    async verifyNetwork() {
        try {
  // some code
} catch (error) {
  console.error(error);
}

            // If not connected, return
            if (!this.state.isConnected || !this.state.wallet) {
                return false;
            }
            
            let isCorrect = false;
            let networkName = '';
            
            // If using SolanaIntegration instance
            if (this.options.solanaInstance && this.options.solanaInstance.verifyPhantomNetwork) {
                try {
                    await this.options.solanaInstance.verifyPhantomNetwork();
                    isCorrect = true;
                    networkName = this.options.network;
                } catch {
  // nothing here
}
                    isCorrect = false;
                    networkName = 'unknown';
                }
            }
            // Otherwise assume correct (limited ability to check)
            else {
                isCorrect = true;
                networkName = this.options.network;
            }
            
            // Update state
            this.state.isCorrectNetwork = isCorrect;
            this.state.networkName = networkName;
            
            // Call onNetworkChange callback if needed
            if (this.options.onNetworkChange) {
                this.options.onNetworkChange({
                    isCorrect,
                    network: networkName
                });
            }
            
            return isCorrect;
        } catch (error) {
            // Log error
            this.logError('Failed to verify network', error);
            return false;
        }
    }

    /**
     * Set up wallet event listeners
     * @private
     */
    setupEventListeners() {
        // Reattach event listeners when the wallet changes
        if (this.state.wallet) {
            // Listen for disconnect events
            this.state.wallet.on('disconnect', () => {
                this.handleDisconnect();
            });
            
            // Listen for account changes
            this.state.wallet.on('accountChanged', (publicKey) => {
                this.handleAccountChange(publicKey);
            });
        }
    }

    /**
     * Handle wallet disconnect event
     * @private
     */
    handleDisconnect() {
        // Reset state
        this.resetState();
        
        // Call onDisconnect callback
        if (this.options.onDisconnect) {
            this.options.onDisconnect();
        }
    }

    /**
     * Handle account change event
     * @param {Object} publicKey - New public key
     * @private
     */
    handleAccountChange(publicKey) {
        if (!publicKey) {
            // If public key is null, wallet is disconnected
            this.handleDisconnect();
            return;
        }
        
        // Update state
        this.state.publicKey = publicKey.toString();
        
        // Save state
        this.saveState();
        
        // Update balance
        this.updateBalance();
        
        // Call onAccountChange callback
        if (this.options.onAccountChange) {
            this.options.onAccountChange({
                publicKey: this.state.publicKey
            });
        }
    }

    /**
     * Get default RPC URL based on network
     * @private
     * @returns {string} RPC URL
     */
    getDefaultRpcUrl() {
        // First check if SolanaIntegration instance has an RPC URL
        if (this.options.solanaInstance && this.options.solanaInstance.rpcUrl) {
            return this.options.solanaInstance.rpcUrl;
        }
        
        // Otherwise use default URLs
        switch (this.options.network) {
            case 'devnet':
                return 'https://api.devnet.solana.com';
            case 'testnet':
                return 'https://api.testnet.solana.com';
            case 'mainnet-beta':
            default:
                return 'https://api.mainnet-beta.solana.com';
        }
    }

    /**
     * Save wallet state to local storage
     * @private
     */
    saveState() {
        try {
            const stateToSave = {
                publicKey: this.state.publicKey,
                providerName: this.state.providerName,
                lastConnected: this.state.lastConnected,
                autoReconnectEnabled: this.state.autoReconnectEnabled
            };
            
            localStorage.setItem(this.options.localStorageKey, JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save wallet state:', error);
        }
    }

    /**
     * Load wallet state from local storage
     * @private
     */
    loadState() {
        try {
            const savedState = localStorage.getItem(this.options.localStorageKey);
            
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                
                // Update state
                this.state.publicKey = parsedState.publicKey || null;
                this.state.providerName = parsedState.providerName || null;
                this.state.lastConnected = parsedState.lastConnected || null;
                this.state.autoReconnectEnabled = parsedState.autoReconnectEnabled !== undefined 
                    ? parsedState.autoReconnectEnabled 
                    : true;
            }
        } catch (error) {
            console.warn('Failed to load wallet state:', error);
        }
    }

    /**
     * Reset wallet state
     * @private
     */
    resetState() {
        this.state.wallet = null;
        this.state.publicKey = null;
        this.state.isConnected = false;
        this.state.balance = null;
        this.state.balanceLastUpdated = null;
        
        // Save state
        this.saveState();
    }

    /**
     * Enable or disable auto-reconnect
     * @param {boolean} enabled - Whether auto-reconnect is enabled
     */
    setAutoReconnect(enabled) {
        this.state.autoReconnectEnabled = enabled;
        this.saveState();
    }

    /**
     * Log error with error monitor if available
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @private
     */
    logError(message, error) {
        if (this.options.errorMonitor) {
            this.options.errorMonitor.logError(error, { 
                component: 'WalletConnector', 
                message 
            });
        } else {
            console.error(`WalletConnector: ${message}`, error);
        }
    }

    /**
     * Generate HTML for a wallet selection modal
     * @param {Object} options - Modal options
     * @returns {string} HTML for wallet selection modal
     */
    generateWalletSelectorHTML(options = {}) {
        const wallets = this.getAvailableWallets();
        const modalId = options.modalId || 'wallet-selector-modal';
        const title = options.title || 'Connect Wallet';
        const description = options.description || 'Select a wallet to continue';
        const walletClass = options.walletButtonClass || 'wallet-button';
        
        // Generate wallet buttons HTML
        const walletButtonsHTML = wallets.map(wallet => `
            <div class="${walletClass}" data-wallet-id="${wallet.id}">
                <img src="${wallet.icon}" alt="${wallet.name}" />
                <span>${wallet.name}</span>
            </div>
        `).join('');
        
        // Generate modal HTML
        return `
            <div id="${modalId}" class="wallet-modal">
                <div class="wallet-modal-content">
                    <div class="wallet-modal-header">
                        <h2>${title}</h2>
                        <button class="wallet-modal-close">&times;</button>
                    </div>
                    <div class="wallet-modal-body">
                        <p>${description}</p>
                        <div class="wallet-list">
                            ${walletButtonsHTML}
                        </div>
                    </div>
                    <div class="wallet-modal-footer">
                        <p>Don't have a wallet? <a href="https://phantom.app/" target="_blank">Get Phantom</a></p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate CSS for wallet selector
     * @returns {string} CSS styles for wallet selector
     */
    generateWalletSelectorCSS() {
        return `
            .wallet-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.4);
                align-items: center;
                justify-content: center;
            }
            
            .wallet-modal-content {
                background-color: #1a1a1a;
                border-radius: 12px;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                color: white;
                overflow: hidden;
            }
            
            .wallet-modal-header {
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
            }
            
            .wallet-modal-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
            
            .wallet-modal-close {
                font-size: 24px;
                font-weight: bold;
                color: #888;
                background: none;
                border: none;
                cursor: pointer;
            }
            
            .wallet-modal-close:hover {
                color: white;
            }
            
            .wallet-modal-body {
                padding: 20px;
            }
            
            .wallet-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 20px;
            }
            
            .wallet-button {
                display: flex;
                align-items: center;
                padding: 15px;
                background-color: #333;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .wallet-button:hover {
                background-color: #444;
            }
            
            .wallet-button img {
                width: 30px;
                height: 30px;
                margin-right: 15px;
            }
            
            .wallet-button span {
                font-size: 16px;
                font-weight: 500;
            }
            
            .wallet-modal-footer {
                padding: 15px 20px;
                border-top: 1px solid #333;
                text-align: center;
                font-size: 14px;
            }
            
            .wallet-modal-footer a {
                color: #8587fb;
                text-decoration: none;
            }
            
            .wallet-modal-footer a:hover {
                text-decoration: underline;
            }
            
            .wallet-show-modal {
                display: flex;
            }
        `;
    }

    /**
     * Attach wallet selector to DOM
     * @param {Object} options - Selector options
     */
    attachWalletSelector(options = {}) {
        // Generate modal HTML and CSS
        const modalHTML = this.generateWalletSelectorHTML(options);
        const modalCSS = this.generateWalletSelectorCSS();
        
        // Create CSS style element
        const style = document.createElement('style');
        style.textContent = modalCSS;
        document.head.appendChild(style);
        
        // Add modal to DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Get modal element
        const modalId = options.modalId || 'wallet-selector-modal';
        const modal = document.getElementById(modalId);
        
        // Set up event handlers
        if (modal) {
            // Close button handler
            const closeButton = modal.querySelector('.wallet-modal-close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    modal.classList.remove('wallet-show-modal');
                });
            }
            
            // Wallet button handlers
            const walletButtons = modal.querySelectorAll('.wallet-button');
            walletButtons.forEach(button => {
                button.addEventListener('click', async () => {
                    const walletId = button.getAttribute('data-wallet-id');
                    
                    try {
                        modal.classList.remove('wallet-show-modal');
                        await this.connect(walletId);
                    } catch (error) {
                        console.error('Failed to connect wallet:', error);
                        
                        // Show error message
                        if (options.onError) {
                            options.onError(error);
                        } else {
                            alert(`Failed to connect wallet: ${error.message}`);
                        }
                    }
                });
            });
            
            // Click outside to close
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    modal.classList.remove('wallet-show-modal');
                }
            });
        }
        
        // Return show/hide functions
        return {
            show: () => {
                if (modal) {
                    modal.classList.add('wallet-show-modal');
                }
            },
            hide: () => {
                if (modal) {
                    modal.classList.remove('wallet-show-modal');
                }
            }
        };
    }
    
    /**
     * Create a wallet connect button
     * @param {string|Element} container - Container element or selector
     * @param {Object} options - Button options
     * @returns {Element} Connect button element
     */
    createConnectButton(container, options = {}) {
        // Default options
        const buttonOptions = {
            text: options.text || 'Connect Wallet',
            connectedText: options.connectedText || 'Connected',
            className: options.className || 'wallet-connect-btn',
            showAddress: options.showAddress !== undefined ? options.showAddress : true,
            addressLength: options.addressLength || 4,
            showIcon: options.showIcon !== undefined ? options.showIcon : true,
            customStyles: options.customStyles || {},
            onClick: options.onClick || null,
            useModal: options.useModal !== undefined ? options.useModal : true,
            modalOptions: options.modalOptions || {}
        };
        
        // Find container element
        const containerElement = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
            
        if (!containerElement) {
            console.error('Container element not found');
            return null;
        }
        
        // Create button element
        const button = document.createElement('button');
        button.className = buttonOptions.className;
        button.innerHTML = buttonOptions.showIcon 
            ? '<span class="wallet-icon"></span><span class="wallet-text">' + buttonOptions.text + '</span>' 
            : buttonOptions.text;
        
        // Apply custom styles
        if (buttonOptions.customStyles) {
            Object.entries(buttonOptions.customStyles).forEach(([key, value]) => {
                button.style[key] = value;
            });
        }
        
        // Create wallet selector if using modal
        let walletSelector = null;
        if (buttonOptions.useModal) {
            walletSelector = this.attachWalletSelector(buttonOptions.modalOptions);
        }
        
        // Add click handler
        button.addEventListener('click', async () => {
            try {
                if (this.state.isConnected) {
                    // If connected, disconnect
                    await this.disconnect();
                    button.innerHTML = buttonOptions.showIcon 
                        ? '<span class="wallet-icon"></span><span class="wallet-text">' + buttonOptions.text + '</span>' 
                        : buttonOptions.text;
                } else {
                    // If using modal, show it
                    if (buttonOptions.useModal && walletSelector) {
                        walletSelector.show();
                    } else {
                        // Otherwise connect directly
                        await this.connect();
                        
                        // Update button text
                        this.updateButtonState(button, buttonOptions);
                    }
                }
                
                // Call onClick callback if provided
                if (buttonOptions.onClick) {
                    buttonOptions.onClick({
                        isConnected: this.state.isConnected,
                        publicKey: this.state.publicKey,
                        wallet: this.state.wallet
                    });
                }
            } catch (error) {
                console.error('Wallet button action failed:', error);
            }
        });
        
        // Add button to container
        containerElement.appendChild(button);
        
        // Update button state if already connected
        if (this.state.isConnected) {
            this.updateButtonState(button, buttonOptions);
        }
        
        // Event listener to update button state
        this.options.onConnectSuccess = (result) => {
            this.updateButtonState(button, buttonOptions);
            
            // Call original callback if exists
            if (options.onConnectSuccess) {
                options.onConnectSuccess(result);
            }
        };
        
        this.options.onDisconnect = () => {
            button.innerHTML = buttonOptions.showIcon 
                ? '<span class="wallet-icon"></span><span class="wallet-text">' + buttonOptions.text + '</span>' 
                : buttonOptions.text;
            
            // Call original callback if exists
            if (options.onDisconnect) {
                options.onDisconnect();
            }
        };
        
        return button;
    }
    
    /**
     * Update connect button state
     * @param {Element} button - Button element
     * @param {Object} options - Button options
     * @private
     */
    updateButtonState(button, options) {
        if (!this.state.isConnected || !this.state.publicKey) {
            button.innerHTML = options.showIcon 
                ? '<span class="wallet-icon"></span><span class="wallet-text">' + options.text + '</span>' 
                : options.text;
            return;
        }
        
        // Format address
        const address = this.state.publicKey;
        const formattedAddress = options.showAddress 
            ? this.formatAddress(address, options.addressLength) 
            : '';
        
        // Update button text
        const buttonText = options.showAddress 
            ? `${options.connectedText} (${formattedAddress})` 
            : options.connectedText;
        
        button.innerHTML = options.showIcon 
            ? '<span class="wallet-icon connected"></span><span class="wallet-text">' + buttonText + '</span>' 
            : buttonText;
    }
    
    /**
     * Format wallet address for display
     * @param {string} address - Wallet address
     * @param {number} length - Number of characters to show
     * @returns {string} Formatted address
     * @private
     */
    formatAddress(address, length = 4) {
        if (!address || address.length < (length * 2) + 3) {
            return address;
        }
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    }
    
    /**
     * Get wallet connection status
     * @returns {Object} Connection status
     */
    getStatus() {
        return {
            isConnected: this.state.isConnected,
            isConnecting: this.state.isConnecting,
            publicKey: this.state.publicKey,
            providerName: this.state.providerName,
            balance: this.state.balance,
            lastConnected: this.state.lastConnected,
            balanceLastUpdated: this.state.balanceLastUpdated,
            networkName: this.state.networkName,
            isCorrectNetwork: this.state.isCorrectNetwork,
            autoReconnectEnabled: this.state.autoReconnectEnabled
        };
    }
}

// Expose to global scope
if (typeof window !== 'undefined') {
    window.WalletConnector = WalletConnector;
}

// Export as ES module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WalletConnector };
}