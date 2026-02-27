/**
 * Prepare for GitHub
 * Formats workflow data for GitHub API commit
 */

// Prepare workflow data for GitHub commit
const workflowData = $input.item.json;

// Sanitize filename (remove special characters)
const sanitizedName = workflowData.name
  .replace(/[^a-zA-Z0-9-_ ]/g, '')
  .replace(/\s+/g, '_')
  .toLowerCase();

const filename = `${sanitizedName}_${workflowData.id}.json`;
const filepath = `workflows/${filename}`;

// Format workflow JSON with proper indentation
const workflowJson = JSON.stringify(workflowData, null, 2);

// Base64 encode for GitHub API
const base64Content = Buffer.from(workflowJson).toString('base64');

// Generate commit message
const timestamp = new Date().toISOString();
const commitMessage = `Auto-backup: ${workflowData.name} (${timestamp})`;

return [{
  json: {
    filename: filename,
    filepath: filepath,
    content: base64Content,
    commitMessage: commitMessage,
    workflowName: workflowData.name,
    workflowId: workflowData.id,
    workflowActive: workflowData.active,
    timestamp: timestamp
  }
}];
