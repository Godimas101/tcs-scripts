/**
 * Determine Operation (Alternative Version)
 * Uses $node reference to access data from "Prepare for GitHub" node
 * 
 * USE THIS VERSION IF:
 * - Your n8n version doesn't support includeInputDataInOutput
 * - The HTTP Request node doesn't pass through input data
 * 
 * IMPORTANT: This processes workflows ONE AT A TIME to avoid memory issues
 */

// Get the current GitHub response
const githubResponse = $input.item.json;

// Find the matching workflow data from "Prepare for GitHub" node
// We need to find it by matching the filepath in the GitHub URL
const prepareNode = $node["Prepare for GitHub"];
const allPreparedData = prepareNode.json;

// Extract filepath from the GitHub response (if available)
let matchedData = null;

// Try to find matching data
// If the GitHub response has a 'path' field, use that to match
if (githubResponse.path) {
  matchedData = allPreparedData.find(item => item.filepath === githubResponse.path);
}

// If we couldn't match by path, use the current index
// This assumes items are processed in order
if (!matchedData) {
  const currentIndex = $itemIndex;
  matchedData = allPreparedData[currentIndex];
}

// Fallback if we still don't have data
if (!matchedData) {
  throw new Error('Could not match GitHub response with prepared workflow data');
}

// Check if file exists (has sha property and no error status)
if (githubResponse.sha && !githubResponse.status) {
  // File exists - need SHA for update
  return {
    json: {
      filepath: matchedData.filepath,
      content: matchedData.content,
      workflowName: matchedData.workflowName,
      workflowId: matchedData.workflowId,
      workflowActive: matchedData.workflowActive,
      timestamp: matchedData.timestamp,
      operation: 'update',
      sha: githubResponse.sha,
      message: `Update: ${matchedData.workflowName} (${matchedData.timestamp})`
    }
  };
} else {
  // File doesn't exist - create new
  return {
    json: {
      filepath: matchedData.filepath,
      content: matchedData.content,
      workflowName: matchedData.workflowName,
      workflowId: matchedData.workflowId,
      workflowActive: matchedData.workflowActive,
      timestamp: matchedData.timestamp,
      operation: 'create',
      message: `Create: ${matchedData.workflowName} (${matchedData.timestamp})`
    }
  };
}
