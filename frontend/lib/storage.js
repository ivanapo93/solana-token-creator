class Storage {
    constructor(provider) {
        this.provider = provider; // 'ipfs' or 'arweave'
        this.pinata = new window.PinataSDK(getEnvVariable('PINATA_API_KEY'), getEnvVariable('PINATA_SECRET_API_KEY'));
    }

    async uploadFileToPinata(file) {
        const readableStreamForFile = new ReadableStream({
            start(controller) {
                controller.enqueue(file);
                controller.close();
            }
        });

        const options = {
            pinataMetadata: {
                name: file.name,
            },
            pinataOptions: {
                cidVersion: 0
            }
        };

        const result = await this.pinata.pinFileToIPFS(readableStreamForFile, options);
        return `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    }

    async uploadFile(file) {
        if (this.provider === 'ipfs') {
            return this.uploadFileToPinata(file);
        } else {
            // This is a placeholder for the actual Arweave upload logic
            console.log(`🚀 Uploading file to ${this.provider}...`);
            // In a real implementation, we would use the Arweave API to upload the file.
            // For now, we'll return a placeholder URL.
            return `https://placeholder.com/${this.provider}/${Date.now()}`;
        }
    }
}
