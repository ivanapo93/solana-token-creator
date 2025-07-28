// Test file to validate JavaScript syntax
const fs = require('fs');

// Read the HTML file
const htmlContent = fs.readFileSync('index.html', 'utf8');

// Extract all JavaScript content between <script> tags
const scriptMatches = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);

if (scriptMatches) {
    scriptMatches.forEach((script, index) => {
        // Remove script tags and get the content
        const jsContent = script.replace(/<script[^>]*>|<\/script>/gi, '');
        
        try {
            // Use Function constructor to validate syntax
            new Function(jsContent);
            console.log(`✅ Script block ${index + 1}: Valid syntax`);
        } catch (error) {
            console.error(`❌ Script block ${index + 1}: Syntax error - ${error.message}`);
            
            // Find line number of error
            const lines = jsContent.split('\n');
            if (error.message.includes('line')) {
                const lineMatch = error.message.match(/line (\d+)/);
                if (lineMatch) {
                    const lineNum = parseInt(lineMatch[1]);
                    console.error(`Error at line ${lineNum}: ${lines[lineNum - 1]}`);
                }
            }
        }
    });
} else {
    console.log('No script blocks found');
}