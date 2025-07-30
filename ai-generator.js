class AIGenerator {
    constructor(apiKey) {
        this.openai = new window.OpenAI({
            apiKey: apiKey
        });
    }

    async generateTokenDetailsFromOpenAI(prompt) {
        const response = await this.openai.completions.create({
            model: "text-davinci-003",
            prompt: `Generate a token name, symbol, and description for a meme coin based on the following concept: ${prompt}.`,
            max_tokens: 100,
        });
        const text = response.choices[0].text;
        const lines = text.split('\n');
        const name = lines[0].split(':')[1].trim();
        const symbol = lines[1].split(':')[1].trim();
        const description = lines[2].split(':')[1].trim();
        return {
            name,
            symbol,
            description
        };
    }

    async generateTokenLogoFromDalle(name, description) {
        const response = await this.openai.images.generate({
            prompt: `A logo for a meme coin called ${name}, described as: ${description}`,
            n: 1,
            size: "256x256",
        });
        return response.data[0].url;
    }

    async generateTokenDetails(prompt) {
        return this.generateTokenDetailsFromOpenAI(prompt);
    }

    async generateTokenLogo(name, description) {
        return this.generateTokenLogoFromDalle(name, description);
    }
}
