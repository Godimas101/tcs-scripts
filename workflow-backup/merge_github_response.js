/**
 * Merge GitHub Response with Prepared Data
 * 
 * USE THIS NODE IF:
 * - Your n8n version doesn't have "Include Input Data in Output" option
 * - You need to combine GitHub API response with prepared workflow data
 * 
 * PLACEMENT: Insert this Code node between "Check File Exists" and "Determine Operation"
 * 
 * This node:
 * 1. Gets the GitHub API response from the current item
 * 2. Gets the corresponding prepared data from "Prepare for GitHub" node
 * 3. Merges them into a single object
 * 4. Passes the merged data to "Determine Operation"
 */

// Get the current GitHub response
const githubResponse = $input.item.json;

// Get the matching prepared data from the "Prepare for GitHub" node
const preparedData = $node["Prepare for GitHub"].item.json;

// Merge the data - prepared data fields with GitHub response fields
const mergedData = {
  // Prepared data fields (from "Prepare for GitHub")
  filepath: preparedData.filepath,
  content: preparedData.content,
  workflowName: preparedData.workflowName,
  workflowId: preparedData.workflowId,
  workflowActive: preparedData.workflowActive,
  timestamp: preparedData.timestamp,
  
  // GitHub API response fields (from "Check File Exists")
  sha: githubResponse.sha,           // File SHA if it exists
  status: githubResponse.status,     // Error status if file doesn't exist
  message: githubResponse.message,   // Error message if any
  path: githubResponse.path          // File path from GitHub
};

return {
  json: mergedData
};
