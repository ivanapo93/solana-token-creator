/**
 * Promotional Website Generator
 * Automatically creates and deploys promotional websites for new coins
 */

const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

class PromoWebsiteGenerator {
    constructor(config = {}) {
        this.templatePath = config.templatePath || './promo-template.html';
        this.deploymentService = config.deploymentService || 'netlify'; // 'netlify', 'vercel', 'github'
        this.baseDomain = config.baseDomain || 'solmeme.site';
        this.apiKeys = config.apiKeys || {};
        
        // Deployment configurations
        this.deploymentConfigs = {
            netlify: {
                apiUrl: 'https://api.netlify.com/api/v1',
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.netlify}`,
                    'Content-Type': 'application/json'
                }
            },
            vercel: {
                apiUrl: 'https://api.vercel.com/v1',
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.vercel}`,
                    'Content-Type': 'application/json'
                }
            }
        };
    }

    /**
     * Generate promotional website for a coin
     * @param {Object} coinData - Coin information
     * @returns {Object} Generation result with URL and deployment info
     */
    async generatePromoSite(coinData) {
        try {
            console.log(`🚀 Generating promo site for ${coinData.name} (${coinData.symbol})`);
            
            // Validate coin data
            this.validateCoinData(coinData);
            
            // Generate unique site identifier
            const siteId = this.generateSiteId(coinData);
            
            // Create website content
            const websiteContent = await this.populateTemplate(coinData, siteId);
            
            // Deploy to hosting platform
            const deploymentResult = await this.deployWebsite(siteId, websiteContent, coinData);
            
            // Store deployment information
            await this.storeDeploymentInfo(siteId, coinData, deploymentResult);
            
            console.log(`✅ Promo site generated successfully: ${deploymentResult.url}`);
            
            return {
                success: true,
                siteId,
                url: deploymentResult.url,
                deploymentId: deploymentResult.deploymentId,
                generatedAt: new Date().toISOString(),
                coinData: {
                    name: coinData.name,
                    symbol: coinData.symbol,
                    contractAddress: coinData.contractAddress
                }
            };
            
        } catch (error) {
            console.error('❌ Error generating promo site:', error);
            
            return {
                success: false,
                error: error.message,
                siteId: coinData ? this.generateSiteId(coinData) : null,
                generatedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Validate required coin data
     * @param {Object} coinData 
     */
    validateCoinData(coinData) {
        const required = ['name', 'symbol', 'description', 'contractAddress'];
        const missing = required.filter(field => !coinData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        
        // Validate contract address format (Solana address)
        if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(coinData.contractAddress)) {
            throw new Error('Invalid contract address format');
        }
    }

    /**
     * Generate unique site identifier
     * @param {Object} coinData 
     * @returns {string} Site ID
     */
    generateSiteId(coinData) {
        const cleanSymbol = coinData.symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
        const timestamp = Date.now().toString(36);
        const hash = coinData.contractAddress.slice(-6).toLowerCase();
        
        return `${cleanSymbol}-${hash}-${timestamp}`;
    }

    /**
     * Populate template with coin data
     * @param {Object} coinData 
     * @param {string} siteId 
     * @returns {string} Populated HTML content
     */
    async populateTemplate(coinData, siteId) {
        try {
            // Read template file
            const template = await fs.readFile(this.templatePath, 'utf-8');
            
            // Generate site URL
            const siteUrl = `https://${siteId}.${this.baseDomain}`;
            
            // Prepare coin image URL
            const coinImageUrl = coinData.imageUrl || this.generateDefaultImage(coinData);
            
            // Social links section removed

            // Prepare replacement data
            const replacements = {
                '{{COIN_NAME}}': this.escapeHtml(coinData.name),
                '{{COIN_SYMBOL}}': this.escapeHtml(coinData.symbol),
                '{{COIN_DESCRIPTION}}': this.escapeHtml(coinData.description),
                '{{CONTRACT_ADDRESS}}': coinData.contractAddress,
                '{{COIN_IMAGE_URL}}': coinImageUrl,
                '{{SITE_URL}}': siteUrl,
                '{{SOCIAL_LINKS_SECTION}}': '', // Social links removed
                '{{GENERATION_DATE}}': new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            // Replace all placeholders
            let populatedContent = template;
            for (const [placeholder, value] of Object.entries(replacements)) {
                populatedContent = populatedContent.replace(new RegExp(placeholder, 'g'), value);
            }
            
            return populatedContent;
            
        } catch (error) {
            throw new Error(`Failed to populate template: ${error.message}`);
        }
    }

    /**
     * Deploy website to hosting platform
     * @param {string} siteId 
     * @param {string} content 
     * @param {Object} coinData 
     * @returns {Object} Deployment result
     */
    async deployWebsite(siteId, content, coinData) {
        switch (this.deploymentService) {
            case 'netlify':
                return await this.deployToNetlify(siteId, content, coinData);
            case 'vercel':
                return await this.deployToVercel(siteId, content, coinData);
            case 'github':
                return await this.deployToGitHub(siteId, content, coinData);
            default:
                throw new Error(`Unsupported deployment service: ${this.deploymentService}`);
        }
    }

    /**
     * Deploy to Netlify
     * @param {string} siteId 
     * @param {string} content 
     * @param {Object} coinData 
     * @returns {Object} Deployment result
     */
    async deployToNetlify(siteId, content, coinData) {
        try {
            // Create site
            const siteResponse = await fetch(`${this.deploymentConfigs.netlify.apiUrl}/sites`, {
                method: 'POST',
                headers: this.deploymentConfigs.netlify.headers,
                body: JSON.stringify({
                    name: siteId,
                    custom_domain: `${siteId}.${this.baseDomain}`
                })
            });
            
            if (!siteResponse.ok) {
                throw new Error(`Failed to create Netlify site: ${siteResponse.statusText}`);
            }
            
            const siteData = await siteResponse.json();
            
            // Deploy content
            const deployResponse = await fetch(`${this.deploymentConfigs.netlify.apiUrl}/sites/${siteData.id}/deploys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKeys.netlify}`,
                    'Content-Type': 'application/zip'
                },
                body: await this.createDeploymentZip(content, 'index.html')
            });
            
            if (!deployResponse.ok) {
                throw new Error(`Failed to deploy to Netlify: ${deployResponse.statusText}`);
            }
            
            const deployData = await deployResponse.json();
            
            return {
                url: siteData.ssl_url || siteData.url,
                deploymentId: deployData.id,
                siteId: siteData.id,
                platform: 'netlify'
            };
            
        } catch (error) {
            throw new Error(`Netlify deployment failed: ${error.message}`);
        }
    }

    /**
     * Deploy to Vercel
     * @param {string} siteId 
     * @param {string} content 
     * @param {Object} coinData 
     * @returns {Object} Deployment result
     */
    async deployToVercel(siteId, content, coinData) {
        try {
            const deploymentPayload = {
                name: siteId,
                files: [
                    {
                        file: 'index.html',
                        data: Buffer.from(content).toString('base64')
                    }
                ],
                projectSettings: {
                    framework: null,
                    buildCommand: null,
                    outputDirectory: null
                }
            };
            
            const response = await fetch(`${this.deploymentConfigs.vercel.apiUrl}/deployments`, {
                method: 'POST',
                headers: this.deploymentConfigs.vercel.headers,
                body: JSON.stringify(deploymentPayload)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to deploy to Vercel: ${response.statusText}`);
            }
            
            const deployData = await response.json();
            
            return {
                url: `https://${deployData.url}`,
                deploymentId: deployData.uid,
                siteId: deployData.name,
                platform: 'vercel'
            };
            
        } catch (error) {
            throw new Error(`Vercel deployment failed: ${error.message}`);
        }
    }

    /**
     * Deploy to GitHub Pages
     * @param {string} siteId 
     * @param {string} content 
     * @param {Object} coinData 
     * @returns {Object} Deployment result
     */
    async deployToGitHub(siteId, content, coinData) {
        try {
            const repoName = `promo-${siteId}`;
            const githubApi = 'https://api.github.com';
            
            // Create repository
            const repoResponse = await fetch(`${githubApi}/user/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.apiKeys.github}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: repoName,
                    description: `Promotional site for ${coinData.name} (${coinData.symbol})`,
                    private: false,
                    has_pages: true
                })
            });
            
            if (!repoResponse.ok) {
                throw new Error(`Failed to create GitHub repository: ${repoResponse.statusText}`);
            }
            
            const repoData = await repoResponse.json();
            
            // Create index.html file
            const fileResponse = await fetch(`${githubApi}/repos/${repoData.full_name}/contents/index.html`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.apiKeys.github}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Initial commit: ${coinData.name} promotional site`,
                    content: Buffer.from(content).toString('base64')
                })
            });
            
            if (!fileResponse.ok) {
                throw new Error(`Failed to create file in GitHub repository: ${fileResponse.statusText}`);
            }
            
            // Enable GitHub Pages
            const pagesResponse = await fetch(`${githubApi}/repos/${repoData.full_name}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.apiKeys.github}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: {
                        branch: 'main',
                        path: '/'
                    }
                })
            });
            
            return {
                url: `https://${repoData.owner.login}.github.io/${repoName}`,
                deploymentId: repoData.id,
                siteId: repoName,
                platform: 'github',
                repositoryUrl: repoData.html_url
            };
            
        } catch (error) {
            throw new Error(`GitHub deployment failed: ${error.message}`);
        }
    }

    /**
     * Store deployment information in database
     * @param {string} siteId 
     * @param {Object} coinData 
     * @param {Object} deploymentResult 
     */
    async storeDeploymentInfo(siteId, coinData, deploymentResult) {
        try {
            // This would typically store in your database (Supabase, etc.)
            const deploymentRecord = {
                site_id: siteId,
                coin_name: coinData.name,
                coin_symbol: coinData.symbol,
                contract_address: coinData.contractAddress,
                url: deploymentResult.url,
                deployment_id: deploymentResult.deploymentId,
                platform: deploymentResult.platform,
                status: 'deployed',
                created_at: new Date().toISOString()
            };
            
            // Store in local JSON for demo (replace with actual database)
            const recordPath = './promo-deployments.json';
            let records = [];
            
            try {
                const existingData = await fs.readFile(recordPath, 'utf-8');
                records = JSON.parse(existingData);
            } catch (error) {
                // File doesn't exist yet
            }
            
            records.push(deploymentRecord);
            await fs.writeFile(recordPath, JSON.stringify(records, null, 2));
            
            console.log(`📝 Deployment info stored for ${siteId}`);
            
        } catch (error) {
            console.error('⚠️ Failed to store deployment info:', error);
            // Don't throw error as deployment was successful
        }
    }

    /**
     * Generate social links section HTML - REMOVED per user request
     * Social media functionality completely removed
     */
    generateSocialLinksSection() {
        return ''; // Social links completely removed
    }

    /**
     * Generate default image URL for coins without custom images
     * @param {Object} coinData 
     * @returns {string} Image URL
     */
    generateDefaultImage(coinData) {
        // Use a service like Dicebear or similar to generate unique avatars
        const seed = encodeURIComponent(coinData.symbol);
        return `https://avatars.dicebear.com/api/identicon/${seed}.svg?background=%23667eea&size=200`;
    }

    /**
     * Escape HTML characters
     * @param {string} str 
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        
        return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
    }

    /**
     * Create ZIP file for deployment
     * @param {string} content 
     * @param {string} filename 
     * @returns {Buffer} ZIP buffer
     */
    async createDeploymentZip(content, filename) {
        const JSZip = require('jszip');
        const zip = new JSZip();
        
        zip.file(filename, content);
        
        return await zip.generateAsync({ type: 'nodebuffer' });
    }

    /**
     * Get deployment status
     * @param {string} siteId 
     * @returns {Object} Deployment status
     */
    async getDeploymentStatus(siteId) {
        try {
            const recordPath = './promo-deployments.json';
            const data = await fs.readFile(recordPath, 'utf-8');
            const records = JSON.parse(data);
            
            return records.find(record => record.site_id === siteId) || null;
            
        } catch (error) {
            console.error('Error getting deployment status:', error);
            return null;
        }
    }

    /**
     * List all deployments
     * @returns {Array} List of deployments
     */
    async listDeployments() {
        try {
            const recordPath = './promo-deployments.json';
            const data = await fs.readFile(recordPath, 'utf-8');
            
            return JSON.parse(data);
            
        } catch (error) {
            console.error('Error listing deployments:', error);
            return [];
        }
    }

    /**
     * Delete a deployment
     * @param {string} siteId 
     * @returns {boolean} Success status
     */
    async deleteDeployment(siteId) {
        try {
            // Get deployment info
            const deployment = await this.getDeploymentStatus(siteId);
            if (!deployment) {
                throw new Error('Deployment not found');
            }
            
            // Delete from hosting platform
            switch (deployment.platform) {
                case 'netlify':
                    await this.deleteFromNetlify(deployment.deployment_id);
                    break;
                case 'vercel':
                    await this.deleteFromVercel(deployment.deployment_id);
                    break;
                case 'github':
                    await this.deleteFromGitHub(deployment.site_id);
                    break;
            }
            
            // Remove from records
            const recordPath = './promo-deployments.json';
            const data = await fs.readFile(recordPath, 'utf-8');
            const records = JSON.parse(data);
            
            const filteredRecords = records.filter(record => record.site_id !== siteId);
            await fs.writeFile(recordPath, JSON.stringify(filteredRecords, null, 2));
            
            console.log(`🗑️ Deployment ${siteId} deleted successfully`);
            return true;
            
        } catch (error) {
            console.error('Error deleting deployment:', error);
            return false;
        }
    }
}

module.exports = PromoWebsiteGenerator;