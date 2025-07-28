// PoisonChimp Token Creation via Helius API
async function createPoisonChimpToken() {
    const apiUrl = 'https://api.helius.xyz/v0/token/mint';
    const apiKey = '85e4288c-67e9-48fa-bf0a-2c03ed1aa0f7';
    
    const tokenData = {
        "name": "PoisonChimp",
        "symbol": "POCH",
        "description": "PoisonChimp (POCH) – A wild Solana meme coin swinging through the jungle of DeFi. Mischievous, toxic, and maybe a little banana-fueled, POCH is here to infect your bags with unstoppable chimp energy.",
        "initialSupply": 1000000000,
        "decimals": 9,
        "transactionFee": 0,
        "authorities": {
            "mintAuthority": false,
            "freezeAuthority": false,
            "updateAuthority": false
        },
        "metadata": {
            "website": "https://poisonchimp.vercel.app",
            "twitter": "https://x.com/SolMemeCre40459",
            "telegram": "https://t.me/SolMemeCreatorNews",
            "discord": "https://discord.gg/S9GvueaU"
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(tokenData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            console.error('API Error:', result);
            return result;
        }
        
        console.log('Token Creation Result:', result);
        return result;
        
    } catch (error) {
        console.error('Request Error:', error);
        return { error: error.message };
    }
}

// Execute the token creation
createPoisonChimpToken().then(result => {
    console.log('Final Result:', JSON.stringify(result, null, 2));
});