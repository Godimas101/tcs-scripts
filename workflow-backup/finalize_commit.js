/**
 * Finalize Commit
 * Merges GitHub commit response with workflow metadata from Determine Operation
 *
 * PLACEMENT: Insert this Code node between "Commit to GitHub" and "Generate Summary"
 * (or between "Commit to GitHub" and the loop back to "Split In Batches")
 *
 * This ensures workflow name is always available in Generate Summary,
 * even for failed 409 commits where GitHub doesn't return a content object.
 */

const commitResponse = $input.item.json;

// Pull workflow metadata from Determine Operation via pairedItem relationship
const determineData = $node["Determine Operation"].item.json;

const workflowName = determineData.workflowName || 'Unknown';
const filepath = determineData.filepath || '';
const workflowId = determineData.workflowId || '';
const operation = determineData.operation || 'unknown';
const timestamp = determineData.timestamp || new Date().toISOString();

// Determine if commit succeeded or failed
const isSuccess = commitResponse.commit && !commitResponse.status;
const is409 = commitResponse.status === '409' || commitResponse.status === 409;

return {
  json: {
    // Workflow identity (always present)
    workflowName: workflowName,
    workflowId: workflowId,
    filepath: filepath,
    operation: operation,
    timestamp: timestamp,

    // Success fields (from GitHub API response)
    commit: commitResponse.commit || null,
    content: commitResponse.content || null,
    html_url: commitResponse.content?.html_url || null,
    commit_sha: commitResponse.commit?.sha || null,

    // Status
    success: isSuccess,
    status: commitResponse.status || null,
    error_message: !isSuccess ? (commitResponse.message || 'Unknown error') : null,

    // Raw response (for debugging)
    raw_response: commitResponse
  }
};
