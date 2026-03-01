/**
 * Generate Summary
 * Creates backup operation summary report
 *
 * Expects input from "Finalize Commit" node which provides:
 * - workflowName (always present, even for failures)
 * - success (boolean)
 * - operation ('create' or 'update')
 * - html_url, commit_sha (for successes)
 * - status, error_message (for failures)
 */

// Generate summary report of backup operation
const items = $input.all();

const successful = items.filter(i => i.json.success === true);
const failed = items.filter(i => i.json.success === false || i.json.status);

const summary = {
  totalWorkflows: items.length,
  successful: successful.length,
  failed: failed.length,
  timestamp: new Date().toISOString(),
  workflows: items.map(i => {
    const data = i.json;

    if (!data.success || data.status) {
      // Failed commit
      return {
        name: data.workflowName || 'Unknown',
        operation: 'failed',
        error: data.error_message || data.status || 'Unknown error',
        status: data.status || 'error'
      };
    } else if (data.commit) {
      // Successful commit
      return {
        name: data.workflowName || data.content?.name || 'Unknown',
        operation: data.operation === 'create' ? 'created' : 'updated',
        url: data.html_url || 'No URL',
        sha: data.commit_sha
      };
    } else {
      // Unexpected structure
      return {
        name: data.workflowName || 'Unknown',
        operation: 'unknown',
        error: 'Unexpected response structure'
      };
    }
  })
};

return [{ json: summary }];
