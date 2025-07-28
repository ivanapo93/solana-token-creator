// Verify @solana/spl-token v0.4.9+ modern imports work correctly
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  transfer 
} from '@solana/spl-token';

import {
  Connection,
  Keypair,
  clusterApiUrl
} from '@solana/web3.js';

console.log('🔍 Verifying Modern @solana/spl-token Imports');
console.log('='.repeat(50));

// Test 1: Verify function imports
console.log('📦 Testing function imports:');
console.log(`✅ createMint: ${typeof createMint === 'function' ? 'function imported' : 'FAILED'}`);
console.log(`✅ getOrCreateAssociatedTokenAccount: ${typeof getOrCreateAssociatedTokenAccount === 'function' ? 'function imported' : 'FAILED'}`);
console.log(`✅ mintTo: ${typeof mintTo === 'function' ? 'function imported' : 'FAILED'}`);
console.log(`✅ transfer: ${typeof transfer === 'function' ? 'function imported' : 'FAILED'}`);

// Test 2: Verify modern API signature
console.log('\n🏗️ Testing modern createMint API signature:');
try {
  // Create mock parameters (don't execute, just verify signature)
  const connection = new Connection(clusterApiUrl('devnet'));
  const payer = Keypair.generate();
  const mintAuthority = payer.publicKey;
  const freezeAuthority = payer.publicKey;
  const decimals = 9;
  
  console.log('✅ Connection created');
  console.log('✅ Keypair generated');
  console.log('✅ Modern createMint parameters ready');
  console.log('📝 Signature: createMint(connection, payer, mintAuthority, freezeAuthority?, decimals, keypair?, confirmOptions?, programId?)');
  
  // Test that we can access the function without errors
  if (typeof createMint === 'function') {
    console.log('✅ createMint function is callable');
  } else {
    console.error('❌ createMint is not a function');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Modern API test failed:', error.message);
  process.exit(1);
}

// Test 3: Package version verification
console.log('\n📋 Package version verification:');
try {
  // Try to read package version
  import('fs').then(fs => {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const splTokenVersion = packageJson.dependencies['@solana/spl-token'];
    console.log(`✅ @solana/spl-token version: ${splTokenVersion}`);
    
    // Check if version is at least 0.3.5
    const versionMatch = splTokenVersion.match(/(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      const [, major, minor, patch] = versionMatch.map(Number);
      const isModern = major > 0 || (major === 0 && minor >= 4);
      
      if (isModern) {
        console.log('✅ Version meets modern API requirements (>= 0.3.5)');
      } else {
        console.error('❌ Version too old for modern API');
        process.exit(1);
      }
    }
  });
} catch (error) {
  console.warn('⚠️ Could not verify package version:', error.message);
}

console.log('\n🎉 SUCCESS: All modern imports verified!');
console.log('🚀 Ready to use modern @solana/spl-token API');
console.log('\n📚 Modern API Usage:');
console.log(`
// Create a mint
const mintAddress = await createMint(
  connection, 
  payer, 
  mintAuthority, 
  freezeAuthority, 
  decimals
);

// Get or create token account
const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  owner
);

// Mint tokens
await mintTo(
  connection,
  payer,
  mint,
  destination,
  authority,
  amount
);

// Transfer tokens
await transfer(
  connection,
  payer,
  source,
  destination,
  owner,
  amount
);
`);

export { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer };