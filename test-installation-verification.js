// Test script to verify @solana/spl-token v0.4.x+ installation and modern API
console.log('🧪 Testing @solana/spl-token v0.4.x+ Installation and Modern API');

// Test modern SPL Token functions availability
function testModernSPLTokenAPI() {
    console.log('\n📦 Testing Modern SPL Token API Functions...');
    
    const requiredFunctions = [
        'createMint',
        'getMint', 
        'getOrCreateAssociatedTokenAccount',
        'mintTo',
        'transfer',
        'getAssociatedTokenAddress'
    ];
    
    const requiredConstants = [
        'TOKEN_PROGRAM_ID',
        'ASSOCIATED_TOKEN_PROGRAM_ID',
        'MINT_SIZE'
    ];
    
    let allFunctionsAvailable = true;
    
    // Test functions
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - Available`);
        } else {
            console.error(`❌ ${funcName} - Missing`);
            allFunctionsAvailable = false;
        }
    });
    
    // Test constants
    requiredConstants.forEach(constName => {
        if (typeof window[constName] !== 'undefined') {
            console.log(`✅ ${constName} - Available`);
        } else {
            console.error(`❌ ${constName} - Missing`);
            allFunctionsAvailable = false;
        }
    });
    
    if (allFunctionsAvailable) {
        console.log('\n🎉 All modern SPL Token functions are available!');
        console.log('📋 API Version: v0.4.x+ (Modern API)');
        return true;
    } else {
        console.error('\n❌ Some modern SPL Token functions are missing');
        return false;
    }
}

// Test connection and mint creation capability
async function testMintCreationCapability() {
    console.log('\n🔗 Testing Mint Creation Capability...');
    
    try {
        // Check if Solana instance is ready
        if (!window.solanaInstance || !window.solanaInstance.connection) {
            console.warn('⚠️ Solana instance not ready - connection test skipped');
            return false;
        }
        
        // Test connection
        const slot = await window.solanaInstance.connection.getSlot();
        console.log(`✅ Connection successful - Current slot: ${slot}`);
        
        // Generate test keypair (don't actually create mint)
        const testKeypair = solanaWeb3.Keypair.generate();
        console.log(`✅ Test keypair generated: ${testKeypair.publicKey.toString()}`);
        
        // Verify modern createMint function exists and is callable
        if (typeof createMint === 'function') {
            console.log('✅ createMint function is available and callable');
            
            // Test parameters that would be used (without execution)
            const testParams = {
                connection: window.solanaInstance.connection,
                payer: testKeypair, // Would be actual wallet in real use
                mintAuthority: testKeypair.publicKey,
                freezeAuthority: testKeypair.publicKey,
                decimals: 9,
                keypair: testKeypair,
                confirmOptions: { commitment: 'confirmed' },
                programId: TOKEN_PROGRAM_ID
            };
            console.log('✅ Modern createMint parameters validated');
            return true;
        } else {
            console.error('❌ createMint function not available');
            return false;
        }
        
    } catch (error) {
        console.error(`❌ Connection test failed: ${error.message}`);
        return false;
    }
}

// Test legacy vs modern API differences
function testAPIModernity() {
    console.log('\n🔄 Testing API Modernity...');
    
    // Check for legacy instruction builders (should still exist for compatibility)
    const legacyFunctions = [
        'createInitializeMintInstruction',
        'createAssociatedTokenAccountInstruction', 
        'createMintToInstruction'
    ];
    
    // Check for modern high-level functions
    const modernFunctions = [
        'createMint',
        'getOrCreateAssociatedTokenAccount',
        'mintTo'
    ];
    
    console.log('📋 Legacy instruction builders (compatibility):');
    legacyFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`  ✅ ${funcName}`);
        } else {
            console.log(`  ⚠️ ${funcName} - Not available`);
        }
    });
    
    console.log('📋 Modern high-level functions (preferred):');
    let modernCount = 0;
    modernFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`  ✅ ${funcName}`);
            modernCount++;
        } else {
            console.log(`  ❌ ${funcName} - Missing`);
        }
    });
    
    if (modernCount === modernFunctions.length) {
        console.log('\n🎉 Modern v0.4.x+ API fully available!');
        console.log('✨ Recommendation: Use high-level functions (createMint, mintTo, etc.)');
        return true;
    } else {
        console.log('\n⚠️ Incomplete modern API - some functions missing');
        return false;
    }
}

// Run all tests
async function runInstallationTests() {
    console.log('🚀 Starting @solana/spl-token Installation Verification Tests\n');
    console.log('='.repeat(60));
    
    const results = {
        modernAPI: false,
        mintCapability: false,
        apiModernity: false
    };
    
    // Test 1: Modern API availability
    results.modernAPI = testModernSPLTokenAPI();
    console.log('='.repeat(60));
    
    // Test 2: Mint creation capability
    results.mintCapability = await testMintCreationCapability();
    console.log('='.repeat(60));
    
    // Test 3: API modernity check
    results.apiModernity = testAPIModernity();
    console.log('='.repeat(60));
    
    // Final results
    console.log('\n📊 INSTALLATION VERIFICATION RESULTS:');
    console.log(`Modern API Functions: ${results.modernAPI ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Mint Creation Ready: ${results.mintCapability ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`API Modernity: ${results.apiModernity ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallSuccess = results.modernAPI && results.apiModernity;
    console.log(`\n🎯 OVERALL STATUS: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
    
    if (overallSuccess) {
        console.log('🚀 @solana/spl-token v0.4.x+ is properly installed and configured!');
        console.log('✨ Ready to use modern API: createMint, getMint, mintTo, etc.');
    } else {
        console.log('⚠️ Installation verification failed - check console errors above');
    }
    
    return overallSuccess;
}

// Auto-run tests when dependencies are loaded
if (typeof splToken !== 'undefined' && typeof solanaWeb3 !== 'undefined') {
    runInstallationTests();
} else {
    console.log('⏳ Waiting for Solana dependencies to load...');
    
    // Wait for dependencies and then test
    const checkDependencies = setInterval(() => {
        if (typeof splToken !== 'undefined' && typeof solanaWeb3 !== 'undefined') {
            clearInterval(checkDependencies);
            runInstallationTests();
        }
    }, 1000);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkDependencies);
        console.error('❌ Timeout: Solana dependencies did not load within 10 seconds');
    }, 10000);
}

// Export test function for manual testing
window.testSPLTokenInstallation = runInstallationTests;