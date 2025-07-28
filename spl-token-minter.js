import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";

// Example UI state setters (replace with your actual UI logic)
function showLoading(isLoading) {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}

function showMessage(message, isError = false) {
  const msgBox = document.getElementById("message");
  if (msgBox) {
    msgBox.innerText = message;
    msgBox.style.color = isError ? "red" : "green";
  } else {
    alert(message);
  }
}

// Minting function
async function mintToken({
  wallet, // Phantom wallet object connected to mainnet-beta
  tokenName,
  tokenSymbol,
  initialSupply,
  decimals = 9,
  rpcUrl = clusterApiUrl("mainnet-beta"), // default to mainnet public RPC
}) {
  showLoading(true);
  showMessage("");

  try {
    // Create connection with timeout support (simple example)
    const connection = new Connection(rpcUrl, "confirmed");

    // Generate new mint keypair
    const mintKeypair = Keypair.generate();

    // Create mint account
    const mintTxSignature = await createMint(
      connection,
      wallet, // payer Keypair or wallet adapter signer
      mintKeypair.publicKey,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
      decimals
    );
    console.log("Mint created with tx:", mintTxSignature);

    // Get or create associated token account for wallet
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mintKeypair.publicKey,
      wallet.publicKey
    );

    // Mint initial supply to token account
    const mintAmount = BigInt(initialSupply) * BigInt(10 ** decimals);
    const mintToTx = await mintTo(
      connection,
      wallet,
      mintKeypair.publicKey,
      tokenAccount.address,
      wallet.publicKey,
      mintAmount
    );
    console.log("Tokens minted with tx:", mintToTx);

    // Optionally: Revoke minting/freeze/update authority here
    // (Add your logic later based on user checkboxes)

    showMessage(
      `Token minted successfully!\nMint Address: ${mintKeypair.publicKey.toBase58()}\nTransaction: ${mintToTx}`
    );

    // Return mint address and tx signature for further use
    return {
      mintAddress: mintKeypair.publicKey.toBase58(),
      mintTx: mintToTx,
    };
  } catch (error) {
    console.error("Minting failed:", error);
    showMessage(`Minting failed: ${error.message || error}`, true);
    throw error;
  } finally {
    showLoading(false);
  }
}

/* 
Usage example with Phantom wallet adapter:
Assuming you have wallet connected and accessible as `wallet`
*/

document.getElementById("mintBtn").onclick = async () => {
  try {
    await mintToken({
      wallet: window.solana, // Phantom injected wallet object
      tokenName: "MyToken",
      tokenSymbol: "MTK",
      initialSupply: 1000000000,
      decimals: 9,
      rpcUrl: "https://api.mainnet-beta.solana.com", // Replace with your preferred RPC
    });
  } catch (e) {
    console.log("Mint error:", e);
  }
};