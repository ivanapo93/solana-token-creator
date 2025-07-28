// Modern @solana/spl-token v0.4.9+ Integration
// This module provides the updated modern API for token operations

import { 
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE
} from '@solana/spl-token';

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';

/**
 * Modern SPL Token Service using v0.4.9+ API
 * Replaces manual transaction building with high-level functions
 */
export class ModernSPLTokenService {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Create a new token mint using modern createMint API
   * This replaces manual instruction building
   */
  async createTokenMint({
    decimals = 9,
    mintAuthority = null,
    freezeAuthority = null,
    keypair = null
  }) {
    try {
      console.log('🏗️ Creating token mint with modern API...');
      
      const mintKeypair = keypair || Keypair.generate();
      const mintAuth = mintAuthority || this.wallet.publicKey;
      const freezeAuth = freezeAuthority || this.wallet.publicKey;
      
      // Use modern createMint function - handles all transaction building internally
      const mintAddress = await createMint(
        this.connection,
        this.wallet, // payer
        mintAuth, // mint authority
        freezeAuth, // freeze authority (can be null)
        decimals,
        mintKeypair, // optional keypair
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
      );
      
      console.log('✅ Token mint created:', mintAddress.toString());
      
      return {
        mintAddress,
        mintKeypair,
        decimals,
        mintAuthority: mintAuth,
        freezeAuthority: freezeAuth
      };
      
    } catch (error) {
      console.error('❌ Modern createMint failed:', error);
      throw error;
    }
  }

  /**
   * Get or create associated token account using modern API
   */
  async getOrCreateTokenAccount(mintAddress, ownerAddress) {
    try {
      console.log('🔄 Getting/creating associated token account...');
      
      const owner = new PublicKey(ownerAddress);
      const mint = new PublicKey(mintAddress);
      
      // Use modern getOrCreateAssociatedTokenAccount - handles ATA creation internally
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet, // payer
        mint,
        owner,
        false, // allowOwnerOffCurve
        'confirmed',
        {},
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      console.log('✅ Token account ready:', tokenAccount.address.toString());
      
      return tokenAccount;
      
    } catch (error) {
      console.error('❌ Token account creation failed:', error);
      throw error;
    }
  }

  /**
   * Mint tokens using modern mintTo API
   */
  async mintTokens({
    mintAddress,
    destinationAccount,
    amount,
    mintAuthority = null
  }) {
    try {
      console.log(`🪙 Minting ${amount} tokens...`);
      
      const mint = new PublicKey(mintAddress);
      const destination = new PublicKey(destinationAccount);
      const authority = mintAuthority || this.wallet;
      
      // Use modern mintTo function - handles transaction building internally
      const signature = await mintTo(
        this.connection,
        this.wallet, // payer
        mint,
        destination,
        authority, // mint authority
        amount,
        [], // multiSigners (if authority is multisig)
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
      );
      
      console.log('✅ Tokens minted, signature:', signature);
      
      return signature;
      
    } catch (error) {
      console.error('❌ Token minting failed:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens using modern transfer API
   */
  async transferTokens({
    source,
    destination,
    amount,
    owner
  }) {
    try {
      console.log(`🔄 Transferring ${amount} tokens...`);
      
      const sourceAccount = new PublicKey(source);
      const destinationAccount = new PublicKey(destination);
      const ownerKeypair = owner || this.wallet;
      
      // Use modern transfer function
      const signature = await transfer(
        this.connection,
        this.wallet, // payer
        sourceAccount,
        destinationAccount,
        ownerKeypair, // owner
        amount,
        [], // multiSigners
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
      );
      
      console.log('✅ Transfer completed, signature:', signature);
      
      return signature;
      
    } catch (error) {
      console.error('❌ Token transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get mint information using modern getMint API
   */
  async getMintInfo(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      
      const mintInfo = await getMint(
        this.connection,
        mint,
        'confirmed',
        TOKEN_PROGRAM_ID
      );
      
      return {
        address: mintAddress,
        mintAuthority: mintInfo.mintAuthority?.toString(),
        supply: mintInfo.supply.toString(),
        decimals: mintInfo.decimals,
        isInitialized: mintInfo.isInitialized,
        freezeAuthority: mintInfo.freezeAuthority?.toString()
      };
      
    } catch (error) {
      console.error('❌ Failed to get mint info:', error);
      throw error;
    }
  }

  /**
   * Get associated token address
   */
  async getAssociatedTokenAccountAddress(mintAddress, ownerAddress) {
    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(ownerAddress);
    
    return await getAssociatedTokenAddress(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
  }
}

/**
 * Complete token creation workflow using modern API
 */
export async function createCompleteToken({
  connection,
  payer,
  name,
  symbol,
  decimals = 9,
  initialSupply = 1000000000,
  recipient
}) {
  try {
    console.log(`🚀 Creating complete token: ${name} (${symbol})`);
    
    const service = new ModernSPLTokenService(connection, payer);
    
    // Step 1: Create mint
    const { mintAddress, mintKeypair } = await service.createTokenMint({
      decimals
    });
    
    // Step 2: Create token account for recipient
    const recipientAddress = recipient || payer.publicKey.toString();
    const tokenAccount = await service.getOrCreateTokenAccount(
      mintAddress.toString(),
      recipientAddress
    );
    
    // Step 3: Mint initial supply
    const mintSignature = await service.mintTokens({
      mintAddress: mintAddress.toString(),
      destinationAccount: tokenAccount.address.toString(),
      amount: initialSupply * Math.pow(10, decimals)
    });
    
    console.log('🎉 Token creation complete!');
    
    return {
      mintAddress: mintAddress.toString(),
      tokenAccount: tokenAccount.address.toString(),
      mintSignature,
      decimals,
      initialSupply
    };
    
  } catch (error) {
    console.error('❌ Complete token creation failed:', error);
    throw error;
  }
}

// Export constants and functions for use
export {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAssociatedTokenAddress
};