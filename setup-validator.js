/**
 * Setup Validation Script for Promotional Website Generator
 * Validates all configuration and API keys before production deployment
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class SetupValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    // Validate environment variables
    validateEnvironment() {
        console.log('🔧 Validating Environment Configuration...\n');
        
        const required = {
            'SUPABASE_URL': process.env.SUPABASE_URL,
            'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'NETLIFY_API_TOKEN': process.env.NETLIFY_API_TOKEN,
            'PROMO_BASE_DOMAIN': process.env.PROMO_BASE_DOMAIN,
            'PLATFORM_NAME': process.env.PLATFORM_NAME
        };

        const optional = {
            'VERCEL_API_TOKEN': process.env.VERCEL_API_TOKEN,
            'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
            'GOOGLE_ANALYTICS_ID': process.env.GOOGLE_ANALYTICS_ID,
            'WEBHOOK_URL': process.env.WEBHOOK_URL
        };

        // Check required variables
        for (const [key, value] of Object.entries(required)) {
            if (!value) {
                this.errors.push(`Missing required environment variable: ${key}`);
            } else {
                this.success.push(`✅ ${key} is configured`);
            }
        }

        // Check optional variables
        for (const [key, value] of Object.entries(optional)) {
            if (!value) {
                this.warnings.push(`⚠️ Optional environment variable not set: ${key}`);
            } else {
                this.success.push(`✅ ${key} is configured`);
            }
        }
    }

    // Test Supabase connection
    async testSupabaseConnection() {
        console.log('🗄️ Testing Supabase Connection...\n');
        
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Test connection with a simple query
            const { data, error } = await supabase
                .from('promo_deployments')
                .select('count(*)')
                .limit(1);

            if (error) {
                if (error.code === '42P01') {
                    this.errors.push('Supabase table "promo_deployments" does not exist. Please run the database setup script.');
                } else {
                    this.errors.push(`Supabase connection error: ${error.message}`);
                }
            } else {
                this.success.push('✅ Supabase connection successful');
                this.success.push('✅ Database tables accessible');
            }
        } catch (error) {
            this.errors.push(`Supabase setup error: ${error.message}`);
        }
    }

    // Test API keys
    async testAPIKeys() {
        console.log('🔑 Testing API Keys...\n');

        const apis = [
            {
                name: 'Netlify',
                token: process.env.NETLIFY_API_TOKEN,
                url: 'https://api.netlify.com/api/v1/user',
                required: true
            },
            {
                name: 'Vercel',
                token: process.env.VERCEL_API_TOKEN,
                url: 'https://api.vercel.com/v1/user',
                required: false
            },
            {
                name: 'GitHub',
                token: process.env.GITHUB_TOKEN,
                url: 'https://api.github.com/user',
                required: false
            }
        ];

        for (const api of apis) {
            if (!api.token) {
                if (api.required) {
                    this.errors.push(`Missing required API token: ${api.name}`);
                } else {
                    this.warnings.push(`Optional API token not configured: ${api.name}`);
                }
                continue;
            }

            try {
                const headers = {
                    'User-Agent': 'SolMeme-Promo-Generator/1.0'
                };

                if (api.name === 'GitHub') {
                    headers['Authorization'] = `token ${api.token}`;
                } else {
                    headers['Authorization'] = `Bearer ${api.token}`;
                }

                const response = await fetch(api.url, { headers });

                if (response.ok) {
                    const data = await response.json();
                    this.success.push(`✅ ${api.name} API key is valid (User: ${data.name || data.login || 'Unknown'})`);
                } else {
                    this.errors.push(`❌ ${api.name} API key is invalid (Status: ${response.status})`);
                }
            } catch (error) {
                this.errors.push(`❌ ${api.name} API test failed: ${error.message}`);
            }
        }
    }

    // Test file structure
    async testFileStructure() {
        console.log('📁 Testing File Structure...\n');

        const requiredFiles = [
            'promo-template.html',
            'promo-template-branded.html',
            'promo-generator.js',
            'promo-config.js',
            'promo-backend.js',
            'supabase-client.js',
            '.env.example'
        ];

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                this.success.push(`✅ ${file} exists`);
            } catch (error) {
                this.errors.push(`❌ Missing required file: ${file}`);
            }
        }

        // Check for .env file
        try {
            await fs.access('.env');
            this.success.push('✅ .env file exists');
        } catch (error) {
            this.warnings.push('⚠️ .env file not found. Copy from .env.example and configure.');
        }
    }

    // Test template syntax
    async testTemplateSyntax() {
        console.log('🎨 Testing Template Syntax...\n');

        const templates = ['promo-template.html', 'promo-template-branded.html'];
        const requiredPlaceholders = [
            '{{COIN_NAME}}',
            '{{COIN_SYMBOL}}',
            '{{COIN_DESCRIPTION}}',
            '{{CONTRACT_ADDRESS}}',
            '{{COIN_IMAGE_URL}}',
            '{{SITE_URL}}',
            '{{GENERATION_DATE}}'
        ];

        for (const template of templates) {
            try {
                const content = await fs.readFile(template, 'utf-8');
                
                let missingPlaceholders = [];
                for (const placeholder of requiredPlaceholders) {
                    if (!content.includes(placeholder)) {
                        missingPlaceholders.push(placeholder);
                    }
                }

                if (missingPlaceholders.length > 0) {
                    this.errors.push(`❌ ${template} missing placeholders: ${missingPlaceholders.join(', ')}`);
                } else {
                    this.success.push(`✅ ${template} has all required placeholders`);
                }

                // Check for basic HTML structure
                if (content.includes('<!DOCTYPE html>') && content.includes('</html>')) {
                    this.success.push(`✅ ${template} has valid HTML structure`);
                } else {
                    this.errors.push(`❌ ${template} has invalid HTML structure`);
                }

            } catch (error) {
                this.errors.push(`❌ Cannot read template ${template}: ${error.message}`);
            }
        }
    }

    // Test configuration loading
    async testConfiguration() {
        console.log('⚙️ Testing Configuration Loading...\n');

        try {
            const { validateConfig } = require('./promo-config');
            const validation = validateConfig();

            if (validation.valid) {
                this.success.push('✅ Configuration validation passed');
            } else {
                this.errors.push(`❌ Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    this.warnings.push(`⚠️ Configuration warning: ${warning}`);
                });
            }
        } catch (error) {
            this.errors.push(`❌ Configuration loading failed: ${error.message}`);
        }
    }

    // Test dependencies
    async testDependencies() {
        console.log('📦 Testing Dependencies...\n');

        const requiredDeps = [
            '@supabase/supabase-js',
            'node-fetch',
            'form-data',
            'jszip',
            'express-rate-limit'
        ];

        for (const dep of requiredDeps) {
            try {
                require.resolve(dep);
                this.success.push(`✅ ${dep} is installed`);
            } catch (error) {
                this.errors.push(`❌ Missing dependency: ${dep}. Run: npm install ${dep}`);
            }
        }
    }

    // Generate setup report
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 SETUP VALIDATION REPORT');
        console.log('='.repeat(60));

        if (this.success.length > 0) {
            console.log('\n🎉 SUCCESSFUL CHECKS:');
            this.success.forEach(item => console.log(`  ${item}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach(item => console.log(`  ${item}`));
        }

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS (MUST BE FIXED):');
            this.errors.forEach(item => console.log(`  ${item}`));
        }

        console.log('\n' + '='.repeat(60));
        
        if (this.errors.length === 0) {
            console.log('🎉 VALIDATION PASSED! Your setup is ready for production.');
            console.log('\nNext steps:');
            console.log('1. Start your server: npm start');
            console.log('2. Create a test token to verify promotional website generation');
            console.log('3. Monitor deployment logs for any issues');
        } else {
            console.log('❌ VALIDATION FAILED! Please fix the errors above before deploying.');
            console.log('\nCommon solutions:');
            console.log('1. Copy .env.example to .env and configure all values');
            console.log('2. Run database setup script in Supabase');
            console.log('3. Verify all API tokens are valid and have correct permissions');
            console.log('4. Install missing dependencies with npm install');
        }

        console.log('='.repeat(60));

        return this.errors.length === 0;
    }

    // Run all validation tests
    async runAll() {
        console.log('🧪 Running Complete Setup Validation...\n');

        this.validateEnvironment();
        await this.testFileStructure();
        await this.testDependencies();
        await this.testConfiguration();
        await this.testTemplateSyntax();
        await this.testSupabaseConnection();
        await this.testAPIKeys();

        return this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    (async () => {
        const validator = new SetupValidator();
        const success = await validator.runAll();
        process.exit(success ? 0 : 1);
    })().catch(error => {
        console.error('❌ Validation script failed:', error);
        process.exit(1);
    });
}

module.exports = SetupValidator;