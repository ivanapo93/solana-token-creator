# SolMeme Creator

This project is a Solana token creator with AI image generation capabilities, deployed as a static website.

## Features

-   **Solana Mainnet Integration:** Connect to the Solana Mainnet to create real SPL tokens.
-   **Phantom Wallet Support:** Connect to your Phantom wallet to create and manage your tokens.
-   **AI-Powered Token Generation:** Use AI to generate a token name, symbol, and description based on your ideas.
-   **AI-Generated Logos:** Automatically generate a unique logo for your token using DALL-E.
-   **IPFS/Arweave Integration:** Upload your token's logo and metadata to IPFS or Arweave for decentralized storage.
-   **Authority Revocation:** Optionally revoke mint, freeze, and update authorities for your token.
-   **Real-time On-chain Data:** View the number of token holders and the live price of your token.
-   **Socials Integration:** Display your social media links on your token's page.
-   **Tokenomics Chart:** View a tokenomics chart to see the distribution of your token.
-   **Landing Page, About Page, and FAQ Page:** Learn more about the project and get answers to your questions.

## Getting Started

To get started with this project, you will need to have the following installed:

-   [Node.js](https://nodejs.org/en/)
-   [Yarn](https://yarnpkg.com/) (or [npm](https://www.npmjs.com/))

You will also need to have a Phantom wallet installed in your browser.

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-username/solmeme-creator.git
    ```

2.  Install the dependencies:

    ```bash
    cd solmeme-creator
    yarn install
    ```

### Configuration

1.  Create a `.env.local` file in the root of the project.
2.  Add the following environment variables to the `.env.local` file:

    ```
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    OPENAI_API_KEY=your_openai_api_key
    ```

    You can get your Supabase URL and anonymous key from your Supabase project settings. You can get your OpenAI API key from the [OpenAI website](https://beta.openai.com/signup/).

### Running the Project

To run the project in development mode, run the following command:

```bash
yarn dev
```

This will start the development server at `http://localhost:3000`.

## Deployment

To deploy the project, you can use a service like [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/). You will need to configure the environment variables in your deployment settings.

## Contributing

Contributions are welcome! If you would like to contribute to this project, please fork the repository and submit a pull request.