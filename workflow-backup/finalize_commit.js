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

// Determine if commit succeeded or failed
const isSuccess = commitResponse.commit && !commitResponse.status;
const is409 = commitResponse.status === '409' || commitResponse.status === 409;

// Extract workflow name from commit message (e.g. "Update: My Workflow (2026-02-28T...)")
// This is reliable for successes since GitHub echoes back the commit message we sent
let workflowName = 'Unknown';
let operation = 'unknown';

if (commitResponse.commit?.message) {
  const match = commitResponse.commit.message.match(/^(Update|Create): (.+?) \(20\d\d-/);
  if (match) {
    operation = match[1].toLowerCase() === 'update' ? 'update' : 'create';
    workflowName = match[2];
  }
}

// For 409 failures, try to get name from the filepath in the GitHub response
// GitHub returns: "is at {sha} but expected {sha}" - no name available
// So fall back to the file path if we can find it nearby in the pairedItem chain
const filepath = commitResponse.content?.path || commitResponse.path || '';
const workflowId = '';
const timestamp = new Date().toISOString();

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
