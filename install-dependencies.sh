#!/bin/bash

# Install latest @solana/spl-token and dependencies
echo "🚀 Installing @solana/spl-token v0.4.9 and dependencies..."

# Update to latest versions
npm install @solana/web3.js@^1.95.4
npm install @solana/spl-token@^0.4.9

# Verify installation
echo "📦 Verifying installation..."
npm list @solana/web3.js
npm list @solana/spl-token

echo "✅ Installation complete!"
echo "🔧 Modern API functions available: createMint, getMint, mintTo, getOrCreateAssociatedTokenAccount"
echo "📚 Documentation: https://solana-labs.github.io/solana-program-library/token/js/"

# Test import
node -e "
try {
  const { createMint, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
  console.log('✅ createMint function imported successfully');
  console.log('✅ TOKEN_PROGRAM_ID available:', TOKEN_PROGRAM_ID.toString());
  console.log('🎉 @solana/spl-token v0.4.x+ modern API ready!');
} catch (error) {
  console.error('❌ Import test failed:', error.message);
  process.exit(1);
}
"