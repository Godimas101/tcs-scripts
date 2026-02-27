/**
 * Parse Workflow List
 * Extracts workflow IDs and metadata from n8n API response
 */

// Extract workflow IDs and names from API response
// Handle different possible response structures
let workflows;

if (Array.isArray($input.item.json)) {
  // Response is already an array
  workflows = $input.item.json;
} else if ($input.item.json.data && Array.isArray($input.item.json.data)) {
  // Response has data property with array
  workflows = $input.item.json.data;
} else if ($input.item.json.workflows && Array.isArray($input.item.json.workflows)) {
  // Response has workflows property with array
  workflows = $input.item.json.workflows;
} else {
  // Unexpected structure - provide helpful error
  throw new Error(
    'Unexpected API response structure. ' +
    'Expected array of workflows. ' +
    'Received: ' + JSON.stringify($input.item.json).substring(0, 500)
  );
}

const workflowList = workflows.map(wf => ({
  id: wf.id,
  name: wf.name,
  active: wf.active,
  updatedAt: wf.updatedAt
}));

return workflowList.map(wf => ({ json: wf }));
