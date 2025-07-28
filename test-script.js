/**
 * Test script to check for JavaScript syntax errors
 */

// Helper function to test code execution
function checkSyntaxError() {
  // Fixed try block with proper syntax
  try {
    console.log("Testing try block with proper syntax");
  } catch (error) {
    console.error("Error in test function:", error);
  }
}

// Export the function
module.exports = { checkSyntaxError };