# SolMeme Creator - Transaction Fees Documentation

This document explains the advanced transaction fee system implemented in SolMeme Creator, featuring both traditional metadata-based fees and cutting-edge Token22 Transfer Hook implementation for real on-chain fee collection.

## 🚀 Token22 Transfer Hook Feature (NEW)

### Overview
SolMeme Creator now supports **Solana's Token22 program with Transfer Hook extension**, enabling real on-chain transaction fees that are automatically collected during every transfer. This is a significant upgrade from metadata-only fee systems.

### Key Features
- **Real On-Chain Fees**: Fees are collected automatically by the blockchain during transfers
- **Flexible Range**: 0% to 5% in 0.1% increments
- **Zero Fee Option**: 0% creates standard SPL tokens with no fees
- **Custom Fee Collector**: Specify any wallet to receive fees
- **Automatic Bypass**: Zero fees use optimized standard SPL token functionality

## 💰 How Transaction Fees Work

### 1. Fee Selection During Token Creation

Users can choose from two fee models:

#### Option A: No Fees (0%)
- **Token Type**: Standard SPL Token
- **Behavior**: No transfer fees, standard functionality
- **Use Case**: Traditional meme tokens, airdrops, gaming tokens
- **Performance**: Optimized for speed and low cost

#### Option B: Transfer Fees (0.1% - 5.0%)
- **Token Type**: Token22 with Transfer Hook
- **Behavior**: Automatic fee collection on every transfer
- **Fee Range**: 0.1%, 0.2%, 0.3%... up to 5.0%
- **Use Case**: Revenue-generating tokens, utility tokens, DeFi protocols

### 2. Fee Collector Configuration

When setting fees > 0%, users specify:
- **Fee Collector Wallet**: Where fees are automatically sent
- **Default Behavior**: Uses creator's wallet if not specified
- **Validation**: Ensures valid Solana wallet address format
- **One-Click Option**: "Use My Wallet" button for convenience

### 3. Technical Implementation

#### Standard SPL Tokens (0% fees)
```javascript
// Uses traditional TOKEN_PROGRAM_ID
const tokenProgram = TOKEN_PROGRAM_ID;
// No extensions, standard mint creation
```

#### Token22 with Transfer Hook (>0% fees)
```javascript
// Uses modern TOKEN_2022_PROGRAM_ID
const tokenProgram = TOKEN_2022_PROGRAM_ID;
const extensions = [ExtensionType.TransferFeeConfig];

// Automatic fee collection on every transfer
const feeBasisPoints = Math.floor(transactionFeePercentage * 100);
createInitializeTransferFeeConfigInstruction(
    mint.publicKey,
    feeCollectorWallet, // Where fees go
    feeCollectorWallet, // Who can withdraw
    feeBasisPoints,     // Fee amount
    BigInt(0),          // No maximum fee
    TOKEN_2022_PROGRAM_ID
);
```

## 🔧 User Interface

### Fee Selection Interface
```
Transaction Fee Percentage (0% to 5%) *
[0.0] %

Enter the fee percentage for Token22 Transfer Hook (0% for no fees, 
increments of 0.1%). Example: 0%, 1.5%, 2.0%

💡 Token22 Transfer Hook: This uses Solana's Token22 program with 
Transfer Hook extension for real on-chain fees. If you set 0%, the 
token will have no transfer fees and use standard SPL token functionality.
```

### Fee Collector Wallet (appears when fee > 0%)
```
Fee Collector Wallet Address *
[Enter wallet address to receive fees] [Use My Wallet]

This wallet will receive all transfer fees. Leave empty to use your 
connected wallet address.
```

### Confirmation Dialog
```
🔔 Confirm Transaction Fee

Transaction Fee: 1.5%
This fee will be applied to every transfer using Token22 Transfer Hook 
and automatically sent to your specified wallet. This setting cannot be 
changed after token creation.

[Cancel] [Confirm & Create Token]
```

## 📊 Technical Specifications

### Fee Calculation
- **Input Range**: 0.0% to 5.0%
- **Increment**: 0.1% (validated)
- **Basis Points**: Percentage × 100 (e.g., 1.5% = 150 basis points)
- **Maximum Fee**: Unlimited (set to 0 for no cap)

### Token Program Selection
```javascript
// Automatic program selection based on fee
const useToken22 = transactionFeePercentage > 0;
const tokenProgram = useToken22 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
```

### Fee Collection Mechanism
- **Transfer Hook**: Executes automatically on every transfer
- **Immediate Collection**: Fees collected instantly
- **Withdrawal Authority**: Fee collector can withdraw accumulated fees
- **No Manual Intervention**: Completely automated process

## 🛡️ Validation & Error Handling

### Frontend Validation
```javascript
// Fee range validation
if (feeValue < 0.0 || feeValue > 5.0) {
    showError('Fee must be between 0.0% and 5.0%');
}

// Increment validation (0.1% steps)
const rounded = Math.round(feeValue * 10) / 10;
if (Math.abs(feeValue - rounded) > 0.01) {
    showError('Fee must be in 0.1% increments');
}

// Wallet address validation
if (feePercentage > 0 && !isValidSolanaAddress(feeCollectorWallet)) {
    showError('Invalid fee collector wallet address');
}
```

### Backend Validation
```javascript
// Route validation
body('transactionFeePercentage')
    .isFloat({ min: 0.0, max: 5.0 })
    .withMessage('Transaction fee must be between 0.0% and 5.0%'),

body('feeCollectorWallet')
    .optional()
    .isLength({ min: 32, max: 44 })
    .withMessage('Invalid fee collector wallet address format')
```

### Error Messages
- **Invalid Range**: "Fee must be between 0.0% and 5.0% in 0.1% increments"
- **Invalid Wallet**: "Invalid fee collector wallet address"
- **Token22 Failure**: "Token22 creation failed. This may be due to network issues"
- **Fee Config Error**: "Transfer fee configuration failed. Please check your settings"

## 📈 Token Response Data

### Standard SPL Token Response
```json
{
    "mintAddress": "...",
    "tokenType": "SPL",
    "transferFeePercentage": 0,
    "feeCollectorWallet": null,
    "transactions": {
        "mint": "signature...",
        "metadata": "signature...",
        "mintTo": "signature..."
    }
}
```

### Token22 Response
```json
{
    "mintAddress": "...",
    "tokenType": "Token22",
    "transferFeePercentage": 1.5,
    "feeCollectorWallet": "wallet_address...",
    "feeBasisPoints": 150,
    "transactions": {
        "mint": "signature...",
        "metadata": "signature...",
        "mintTo": "signature..."
    }
}
```

## 🎯 Use Cases

### No Fee Tokens (0%)
- **Meme Tokens**: Pure community-driven tokens
- **Airdrops**: Tokens distributed for free
- **Gaming Tokens**: In-game currencies
- **Social Tokens**: Community engagement tokens

### Fee-Generating Tokens (0.1% - 5%)
- **Utility Tokens**: Tokens with real-world utility
- **Revenue Sharing**: Tokens that generate income for holders
- **Protocol Tokens**: DeFi protocol governance tokens
- **Business Tokens**: Tokens representing business shares

## 🔄 Migration from Legacy System

### Before (Metadata-Only)
- Fee information stored in token name and metadata
- No automatic collection
- Manual enforcement required
- Limited marketplace compatibility

### After (Token22 Transfer Hook)
- Real on-chain fee collection
- Automatic enforcement by blockchain
- Native marketplace support
- Enhanced user experience

## 🎉 Benefits

### For Users
- **Transparency**: Clear fee structure before token creation
- **Flexibility**: Choose the right fee model for your use case
- **Automation**: No manual fee collection required
- **Compatibility**: Works with all major Solana tools and marketplaces

### For Developers
- **Modern Technology**: Uses latest Solana Token22 program
- **Automatic Handling**: Blockchain enforces fees automatically
- **Extensible**: Easy to add more Token22 features in the future
- **Future-Proof**: Built on Solana's latest token standard

## 📝 Implementation Notes

### Package Dependencies
```json
{
    "@solana/spl-token": "^0.4.0", // Includes Token22 support
    "@solana/web3.js": "^1.87.0"
}
```

### Required Imports
```javascript
import {
    TOKEN_2022_PROGRAM_ID,
    ExtensionType,
    createInitializeTransferFeeConfigInstruction,
    getMintLen
} from '@solana/spl-token';
```

### Environment Considerations
- **Mainnet**: Full Token22 support available
- **Devnet**: Available for testing
- **Localnet**: Requires Token22-compatible validator

## 🎯 Quick Reference

### Fee Settings
- **0%**: Standard SPL token, no fees
- **0.1% - 5.0%**: Token22 with automatic fees
- **Increments**: 0.1% only
- **Collector**: Any valid Solana wallet

### Token Types
- **SPL**: Traditional token program
- **Token22**: Modern token program with extensions

### Validation Rules
- Fee range: 0.0% ≤ fee ≤ 5.0%
- Increment: Must be multiple of 0.1%
- Wallet: Valid base58 Solana address (32-44 chars)

## 🚀 Future Enhancements

Planned features for future releases:
- **Dynamic Fee Adjustment**: Allow fee changes after token creation
- **Fee Distribution**: Split fees among multiple wallets
- **Time-Based Fees**: Different fees based on holding period
- **Volume Discounts**: Lower fees for large transfers

---

**Built with Solana Token22 Transfer Hook • Fully Automated • Production Ready**

This comprehensive fee system provides the flexibility and automation needed for modern token economies while maintaining backward compatibility with traditional SPL tokens.