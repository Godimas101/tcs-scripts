/**
 * Determine Operation
 * Decides whether to create or update file in GitHub
 * 
 * IMPORTANT: The "Check File Exists" HTTP Request node MUST have these settings:
 * - Options > Response > Never Error: ON
 * - The node should pass through input data from "Prepare for GitHub"
 * 
 * If your n8n version doesn't support includeInputDataInOutput, you'll need to:
 * 1. Use a Code node after "Check File Exists" to merge the data, OR
 * 2. Use the alternative version: determine_operation_with_node_reference.js
 */

// This code assumes the HTTP Request node passes through the input data
// along with the GitHub API response

const item = $input.item.json;

// The GitHub API response fields (sha if file exists)
const githubSha = item.sha;
const githubStatus = item.status;

// The prepared data fields from earlier node
const filepath = item.filepath;
const content = item.content;
const workflowName = item.workflowName;
const workflowId = item.workflowId;
const workflowActive = item.workflowActive;
const timestamp = item.timestamp;

// Check if file exists (has sha property and no error status)
if (githubSha && !githubStatus) {
  // File exists - need SHA for update
  return {
    json: {
      filepath: filepath,
      content: content,
      workflowName: workflowName,
      workflowId: workflowId,
      workflowActive: workflowActive,
      timestamp: timestamp,
      operation: 'update',
      sha: githubSha,
      message: `Update: ${workflowName} (${timestamp})`
    }
  };
} else {
  // File doesn't exist - create new
  return {
    json: {
      filepath: filepath,
      content: content,
      workflowName: workflowName,
      workflowId: workflowId,
      workflowActive: workflowActive,
      timestamp: timestamp,
      operation: 'create',
      message: `Create: ${workflowName} (${timestamp})`
    }
  };
}
