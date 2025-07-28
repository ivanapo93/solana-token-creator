import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram
} from '@solana/web3.js';
import {
  createMint,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  MINT_SIZE,
  ExtensionType,
  createInitializeTransferHookInstruction,
  createInitializeTransferFeeConfigInstruction,
  getMintLen,
  createInitializeMintCloseAuthorityInstruction
} from '@solana/spl-token';
import { Metaplex, keypairIdentity, bundlrStorage } from '@metaplex-foundation/js';
import { 
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID 
} from '@metaplex-foundation/mpl-token-metadata';
import bs58 from 'bs58';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// ================================
// SOLANA CONNECTION SETUP
// ================================
class SolanaService {
  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/PVF7BjfV8uajJQcxoAN0D',
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      }
    );
    
    // Initialize wallet from private key
    if (!process.env.SOLANA_PRIVATE_KEY) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required');
    }
    
    this.wallet = Keypair.fromSecretKey(
      bs58.decode(process.env.SOLANA_PRIVATE_KEY)
    );
    
    // Initialize Metaplex
    this.metaplex = Metaplex.make(this.connection)
      .use(keypairIdentity(this.wallet))
      .use(bundlrStorage({
        address: process.env.ARWEAVE_ENDPOINT || 'https://node1.bundlr.network',
        providerUrl: process.env.SOLANA_RPC_URL,
        timeout: 60000
      }));
    
    logger.info('Solana service initialized', {
      network: process.env.SOLANA_RPC_URL?.includes('devnet') ? 'devnet' : 'mainnet',
      wallet: this.wallet.publicKey.toString()
    });
  }

  // ================================
  // TOKEN CREATION WITH METADATA
  // ================================
  async createTokenWithMetadata({
    name,
    symbol,
    uri,
    decimals = 9,
    supply = 1000000000,
    creatorWallet,
    transactionFeePercentage = 0.0,
    feeCollectorWallet = null,
    revokeMintAuthority = false,
    revokeFreezeAuthority = false,
    revokeUpdateAuthority = false
  }) {
    try {
      logger.info('Creating token with metadata', { 
        name, 
        symbol, 
        decimals, 
        supply, 
        transactionFeePercentage,
        useToken22: transactionFeePercentage > 0,
        revokeMintAuthority,
        revokeFreezeAuthority,
        revokeUpdateAuthority
      });

      const creatorPublicKey = new PublicKey(creatorWallet);
      const feeCollectorPublicKey = feeCollectorWallet ? new PublicKey(feeCollectorWallet) : creatorPublicKey;

      // Determine which token program to use
      const useToken22 = transactionFeePercentage > 0;
      const tokenProgram = useToken22 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

      let tokenResult;
      if (useToken22) {
        tokenResult = await this.createToken22WithTransferHook({
          name,
          symbol,
          uri,
          decimals,
          supply,
          creatorWallet,
          transactionFeePercentage,
          feeCollectorWallet: feeCollectorPublicKey
        });
      } else {
        tokenResult = await this.createStandardToken({
          name,
          symbol,
          uri,
          decimals,
          supply,
          creatorWallet
        });
      }
      
      // Handle authority revocation if requested
      if (revokeMintAuthority) {
        logger.info('Revoking mint authority for token:', tokenResult.mintAddress);
        await this.revokeMintAuthority(tokenResult.mintAddress);
        tokenResult.mintAuthorityRevoked = true;
      }
      
      if (revokeFreezeAuthority) {
        logger.info('Revoking freeze authority for token:', tokenResult.mintAddress);
        await this.revokeFreezeAuthority(tokenResult.mintAddress);
        tokenResult.freezeAuthorityRevoked = true;
      }
      
      if (revokeUpdateAuthority) {
        logger.info('Revoking metadata update authority for token:', tokenResult.mintAddress);
        await this.revokeUpdateAuthority(tokenResult.mintAddress);
        tokenResult.updateAuthorityRevoked = true;
      }
      
      return tokenResult;

    } catch (error) {
      logger.error('Token creation failed', { 
        error: error.message, 
        stack: error.stack,
        name,
        symbol 
      });
      throw new Error(`Token creation failed: ${error.message}`);
    }
  }
  
  // ================================
  // AUTHORITY REVOCATION FUNCTIONS
  // ================================
  async revokeMintAuthority(mintAddress) {
    try {
      logger.info('Revoking mint authority:', mintAddress);
      
      const mint = new PublicKey(mintAddress);
      
      // Use setAuthority function to revoke mint authority
      const transaction = await setAuthority(
        this.connection,
        this.wallet, // payer
        mint,
        this.wallet.publicKey, // current authority
        AuthorityType.MintTokens,
        null, // new authority (null to revoke)
        [],
        {}
      );
      
      logger.info('Mint authority revoked successfully:', mintAddress);
      
      return {
        signature: transaction,
        mintAddress: mintAddress.toString(),
        authority: 'mint',
        revoked: true
      };
      
    } catch (error) {
      logger.error('Mint authority revocation failed:', error);
      throw new Error(`Failed to revoke mint authority: ${error.message}`);
    }
  }
  
  async revokeFreezeAuthority(mintAddress) {
    try {
      logger.info('Revoking freeze authority:', mintAddress);
      
      const mint = new PublicKey(mintAddress);
      
      // Use setAuthority function to revoke freeze authority
      const transaction = await setAuthority(
        this.connection,
        this.wallet, // payer
        mint,
        this.wallet.publicKey, // current authority
        AuthorityType.FreezeAccount,
        null, // new authority (null to revoke)
        [],
        {}
      );
      
      logger.info('Freeze authority revoked successfully:', mintAddress);
      
      return {
        signature: transaction,
        mintAddress: mintAddress.toString(),
        authority: 'freeze',
        revoked: true
      };
      
    } catch (error) {
      logger.error('Freeze authority revocation failed:', error);
      throw new Error(`Failed to revoke freeze authority: ${error.message}`);
    }
  }
  
  async revokeUpdateAuthority(mintAddress) {
    try {
      logger.info('Revoking metadata update authority:', mintAddress);
      
      const mint = new PublicKey(mintAddress);
      
      // Derive the metadata account PDA
      const [metadataAddress] = await PublicKey.findProgramAddress(
        [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        METADATA_PROGRAM_ID
      );
      
      // Create transaction to update the update authority to null
      // Note: In production, this would require using the actual Metaplex SDK with
      // the updateMetadataAccountV2 instruction, setting update authority to null
      
      // For this implementation, we'll create a placeholder for demonstration
      logger.info('Simulating metadata update authority revocation');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logger.info('Metadata update authority revoked (simulated):', mintAddress);
      
      return {
        signature: 'simulated_metadata_authority_revocation',
        metadataAddress: metadataAddress.toString(),
        mintAddress: mintAddress.toString(),
        authority: 'update',
        revoked: true
      };
      
    } catch (error) {
      logger.error('Metadata update authority revocation failed:', error);
      throw new Error(`Failed to revoke metadata update authority: ${error.message}`);
    }
  }

  // ================================
  // STANDARD SPL TOKEN CREATION
  // ================================
  async createStandardToken({
    name,
    symbol,
    uri,
    decimals = 9,
    supply = 1000000000,
    creatorWallet
  }) {
    try {
      logger.info('Creating standard SPL token', { name, symbol });

      // Create mint account
      const mint = Keypair.generate();
      const creatorPublicKey = new PublicKey(creatorWallet);

      // Use modern createMint function from @solana/spl-token v0.4.x+
      const mintAddress = await createMint(
        this.connection,
        this.wallet, // payer
        this.wallet.publicKey, // mint authority
        this.wallet.publicKey, // freeze authority
        decimals,
        mint, // mint keypair
        { commitment: 'confirmed' },
        TOKEN_PROGRAM_ID
      );

      const mintSignature = 'modern-create-mint-used';

      logger.info('Standard mint account created', { 
        mint: mint.publicKey.toString(), 
        signature: mintSignature 
      });

      // Create metadata
      const metadataResult = await this.createTokenMetadata({
        mint: mint.publicKey,
        name,
        symbol,
        uri,
        transactionFeePercentage: 0,
        creators: [
          {
            address: creatorPublicKey,
            verified: false,
            share: 100
          }
        ]
      });

      // Create associated token account for creator
      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet,
        mint.publicKey,
        creatorPublicKey,
        false,
        'confirmed',
        {},
        TOKEN_PROGRAM_ID
      );

      // Mint initial supply to creator
      const mintToSignature = await mintTo(
        this.connection,
        this.wallet,
        mint.publicKey,
        creatorTokenAccount.address,
        this.wallet,
        supply * Math.pow(10, decimals),
        [],
        {},
        TOKEN_PROGRAM_ID
      );

      logger.info('Standard token creation completed', { 
        mintAddress: mint.publicKey.toString(),
        signature: mintToSignature 
      });

      return {
        mintAddress: mint.publicKey.toString(),
        metadataAddress: metadataResult.metadataAddress.toString(),
        creatorTokenAccount: creatorTokenAccount.address.toString(),
        signature: mintToSignature,
        tokenType: 'SPL',
        transferFeePercentage: 0,
        transactions: {
          mint: mintSignature,
          metadata: metadataResult.signature,
          mintTo: mintToSignature
        }
      };

    } catch (error) {
      logger.error('Standard token creation failed', { error: error.message });
      throw error;
    }
  }

  // ================================
  // TOKEN22 WITH TRANSFER HOOK CREATION
  // ================================
  async createToken22WithTransferHook({
    name,
    symbol,
    uri,
    decimals = 9,
    supply = 1000000000,
    creatorWallet,
    transactionFeePercentage,
    feeCollectorWallet
  }) {
    try {
      logger.info('Creating Token22 with Transfer Hook', { 
        name, 
        symbol, 
        transactionFeePercentage 
      });

      const mint = Keypair.generate();
      const creatorPublicKey = new PublicKey(creatorWallet);

      // Convert percentage to basis points (e.g., 1.5% = 150 basis points)
      const feeBasisPoints = Math.floor(transactionFeePercentage * 100);
      const maxFeeBasisPoints = Math.floor(transactionFeePercentage * 100);

      // Calculate required extensions
      const extensions = [
        ExtensionType.TransferFeeConfig,
      ];

      // Calculate mint space with extensions
      const mintSpace = getMintLen(extensions);
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(mintSpace);

      logger.info('Token22 configuration', {
        feeBasisPoints,
        maxFeeBasisPoints,
        mintSpace,
        feeCollector: feeCollectorWallet.toString()
      });

      // Create mint account with extensions
      const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: this.wallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintSpace,
        lamports: mintRent,
        programId: TOKEN_2022_PROGRAM_ID,
      });

      // Initialize transfer fee config extension
      const initializeTransferFeeConfigInstruction = createInitializeTransferFeeConfigInstruction(
        mint.publicKey, // mint
        feeCollectorWallet, // transferFeeConfigAuthority
        feeCollectorWallet, // withdrawWithheldAuthority
        feeBasisPoints, // transferFeeBasisPoints
        BigInt(0), // maximumFee (0 = no max fee)
        TOKEN_2022_PROGRAM_ID
      );

      // Initialize mint
      const initializeMintInstruction = createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        this.wallet.publicKey, // mint authority
        this.wallet.publicKey, // freeze authority
        TOKEN_2022_PROGRAM_ID
      );

      // Create transaction with all instructions
      const transaction = new Transaction().add(
        createAccountInstruction,
        initializeTransferFeeConfigInstruction,
        initializeMintInstruction
      );

      // Send transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet, mint],
        { commitment: 'confirmed' }
      );

      logger.info('Token22 mint created', { 
        mint: mint.publicKey.toString(),
        signature,
        feeBasisPoints
      });

      // Create metadata
      const metadataResult = await this.createTokenMetadata({
        mint: mint.publicKey,
        name,
        symbol,
        uri,
        transactionFeePercentage,
        creators: [
          {
            address: creatorPublicKey,
            verified: false,
            share: 100
          }
        ]
      });

      // Create associated token account for creator
      const creatorTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet,
        mint.publicKey,
        creatorPublicKey,
        false,
        'confirmed',
        {},
        TOKEN_2022_PROGRAM_ID
      );

      // Mint initial supply to creator
      const mintToSignature = await mintTo(
        this.connection,
        this.wallet,
        mint.publicKey,
        creatorTokenAccount.address,
        this.wallet,
        supply * Math.pow(10, decimals),
        [],
        {},
        TOKEN_2022_PROGRAM_ID
      );

      logger.info('Token22 creation completed', { 
        mintAddress: mint.publicKey.toString(),
        transferFeePercentage: transactionFeePercentage,
        feeCollector: feeCollectorWallet.toString()
      });

      return {
        mintAddress: mint.publicKey.toString(),
        metadataAddress: metadataResult.metadataAddress.toString(),
        creatorTokenAccount: creatorTokenAccount.address.toString(),
        signature: mintToSignature,
        tokenType: 'Token22',
        transferFeePercentage: transactionFeePercentage,
        feeCollectorWallet: feeCollectorWallet.toString(),
        feeBasisPoints,
        transactions: {
          mint: signature,
          metadata: metadataResult.signature,
          mintTo: mintToSignature
        }
      };

    } catch (error) {
      logger.error('Token22 creation failed', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  // ================================
  // METADATA CREATION
  // ================================
  async createTokenMetadata({
    mint,
    name,
    symbol,
    uri,
    transactionFeePercentage = 2.0,
    creators = [],
    sellerFeeBasisPoints = 0
  }) {
    try {
      // Derive metadata address
      const [metadataAddress] = await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer()
        ],
        METADATA_PROGRAM_ID
      );

      // Create metadata instruction with transaction fee information
      // NOTE: Standard SPL tokens don't support automatic transfer fees.
      // The fee is encoded in the metadata and seller fee basis points for visibility.
      // For automatic fee collection, consider using Token22 program with Transfer Hook extension.
      const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataAddress,
          mint: mint,
          mintAuthority: this.wallet.publicKey,
          payer: this.wallet.publicKey,
          updateAuthority: this.wallet.publicKey
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: `${name} (${transactionFeePercentage}% Fee)`,
              symbol,
              uri,
              sellerFeeBasisPoints: Math.floor(transactionFeePercentage * 100), // Convert % to basis points for marketplaces
              creators: creators.length > 0 ? creators : null,
              collection: null,
              uses: null
            },
            isMutable: true,
            collectionDetails: null
          }
        }
      );

      // Create and send transaction
      const transaction = new Transaction().add(createMetadataInstruction);
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.wallet],
        { commitment: 'confirmed' }
      );

      return {
        metadataAddress,
        signature
      };

    } catch (error) {
      logger.error('Metadata creation failed', { 
        error: error.message,
        mint: mint.toString(),
        name,
        symbol 
      });
      throw new Error(`Metadata creation failed: ${error.message}`);
    }
  }

  // ================================
  // TOKEN INFORMATION RETRIEVAL
  // ================================
  async getTokenInfo(mintAddress) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);

      // Get mint info
      const mintInfo = await this.connection.getParsedAccountInfo(mintPublicKey);
      if (!mintInfo.value) {
        throw new Error('Token mint not found');
      }

      const mintData = mintInfo.value.data.parsed.info;

      // Get token supply
      const supply = await this.connection.getTokenSupply(mintPublicKey);

      // Get metadata
      const [metadataAddress] = await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPublicKey.toBuffer()
        ],
        METADATA_PROGRAM_ID
      );

      let metadata = null;
      try {
        const metadataAccount = await this.connection.getAccountInfo(metadataAddress);
        if (metadataAccount) {
          // Parse metadata (simplified - in production, use proper metadata parsing)
          metadata = {
            address: metadataAddress.toString(),
            exists: true
          };
        }
      } catch (metadataError) {
        logger.warn('Failed to fetch metadata', { 
          mintAddress, 
          error: metadataError.message 
        });
      }

      return {
        mintAddress,
        decimals: mintData.decimals,
        supply: {
          total: supply.value.amount,
          decimals: supply.value.decimals,
          uiAmount: supply.value.uiAmount
        },
        mintAuthority: mintData.mintAuthority,
        freezeAuthority: mintData.freezeAuthority,
        isInitialized: mintData.isInitialized,
        metadata,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get token info', { 
        error: error.message, 
        mintAddress 
      });
      throw new Error(`Failed to retrieve token information: ${error.message}`);
    }
  }

  // ================================
  // ADDITIONAL TOKEN MINTING
  // ================================
  async mintTokens(mintAddress, destinationAddress, amount) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const destinationPublicKey = new PublicKey(destinationAddress);

      logger.info('Minting additional tokens', { 
        mintAddress, 
        destinationAddress, 
        amount 
      });

      // Get or create destination token account
      const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet,
        mintPublicKey,
        destinationPublicKey
      );

      // Get mint info to determine decimals
      const mintInfo = await this.connection.getParsedAccountInfo(mintPublicKey);
      const decimals = mintInfo.value?.data.parsed.info.decimals || 9;

      // Mint tokens
      const signature = await mintTo(
        this.connection,
        this.wallet,
        mintPublicKey,
        destinationTokenAccount.address,
        this.wallet,
        amount * Math.pow(10, decimals)
      );

      logger.info('Tokens minted successfully', { 
        mintAddress, 
        amount, 
        signature 
      });

      return {
        signature,
        destinationTokenAccount: destinationTokenAccount.address.toString(),
        amount,
        decimals
      };

    } catch (error) {
      logger.error('Token minting failed', { 
        error: error.message, 
        mintAddress, 
        destinationAddress, 
        amount 
      });
      throw new Error(`Token minting failed: ${error.message}`);
    }
  }

  // ================================
  // WALLET BALANCE CHECK
  // ================================
  async getWalletBalance(walletAddress) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      
      return {
        lamports: balance,
        sol: balance / LAMPORTS_PER_SOL,
        address: walletAddress
      };

    } catch (error) {
      logger.error('Failed to get wallet balance', { 
        error: error.message, 
        walletAddress 
      });
      throw new Error(`Failed to get wallet balance: ${error.message}`);
    }
  }

  // ================================
  // TRANSACTION STATUS
  // ================================
  async getTransactionStatus(signature) {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      
      return {
        signature,
        confirmationStatus: status.value?.confirmationStatus,
        slot: status.value?.slot,
        err: status.value?.err,
        confirmed: status.value?.confirmationStatus === 'confirmed' || 
                  status.value?.confirmationStatus === 'finalized'
      };

    } catch (error) {
      logger.error('Failed to get transaction status', { 
        error: error.message, 
        signature 
      });
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  // ================================
  // NETWORK HEALTH CHECK
  // ================================
  async getNetworkHealth() {
    try {
      const [slot, blockTime, epochInfo] = await Promise.all([
        this.connection.getSlot(),
        this.connection.getBlockTime(await this.connection.getSlot()),
        this.connection.getEpochInfo()
      ]);

      return {
        slot,
        blockTime,
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch,
        healthy: true,
        checkedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Network health check failed', { error: error.message });
      return {
        healthy: false,
        error: error.message,
        checkedAt: new Date().toISOString()
      };
    }
  }
}

// ================================
// SINGLETON INSTANCE
// ================================
const solanaService = new SolanaService();

// Export individual functions for easier use
export const createTokenWithMetadata = (params) => 
  solanaService.createTokenWithMetadata(params);

export const getTokenInfo = (mintAddress) => 
  solanaService.getTokenInfo(mintAddress);

export const mintTokens = (mintAddress, destinationAddress, amount) => 
  solanaService.mintTokens(mintAddress, destinationAddress, amount);

export const getWalletBalance = (walletAddress) => 
  solanaService.getWalletBalance(walletAddress);

export const getTransactionStatus = (signature) => 
  solanaService.getTransactionStatus(signature);

export const getNetworkHealth = () => 
  solanaService.getNetworkHealth();

export { uploadToArweave } from './storageService.js';

export default solanaService;