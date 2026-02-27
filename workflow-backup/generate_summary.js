/**
 * Generate Summary
 * Creates backup operation summary report
 */

// Generate summary report of backup operation
const items = $input.all();

const summary = {
  totalWorkflows: items.length,
  successful: items.filter(i => i.json.commit && !i.json.status).length,
  failed: items.filter(i => i.json.status || !i.json.commit).length,
  timestamp: new Date().toISOString(),
  workflows: items.map(i => {
    if (i.json.status) {
      // Failed commit (409 or other error)
      return {
        name: 'Unknown (failed)',
        operation: 'failed',
        error: i.json.message || 'Unknown error',
        status: i.json.status
      };
    } else if (i.json.commit) {
      // Successful commit
      return {
        name: i.json.content?.name || 'Unknown',
        operation: i.json.commit.message?.startsWith('Create') ? 'created' : 'updated',
        url: i.json.content?.html_url || 'No URL',
        sha: i.json.commit.sha
      };
    } else {
      // Unexpected structure
      return {
        name: 'Unknown',
        operation: 'unknown',
        error: 'Unexpected response structure'
      };
    }
  })
};

return [{ json: summary }];
