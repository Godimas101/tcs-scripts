/**
 * Check File and Merge
 * Replaces both "Check File Exists" (HTTP Request) and "Merge GitHub Response" nodes
 *
 * PLACEMENT: Between "Inject Credentials" (Set node) and "Determine Operation"
 * REQUIRES: A Set node named "Inject Credentials" immediately before this node that adds:
 *   - githubUsername: {{ $env.GITHUB_USERNAME }}
 *   - githubRepo:     {{ $env.GITHUB_REPO }}
 *   - githubToken:    {{ $env.GITHUB_TOKEN }}
 *   (Set node runs in main n8n process where $env is accessible)
 *
 * This node:
 * 1. Takes prepared workflow data + injected credentials from input
 * 2. Makes the GitHub API call to check if file exists
 * 3. Returns merged data containing both the prepared data AND GitHub response
 *
 * This avoids both the $node and $env limitations in n8n 2.9.2's external task runner.
 */

const preparedData = $input.item.json;

// Credentials injected by the preceding "Inject Credentials" Set node
const githubUsername = preparedData.githubUsername;
const githubRepo = preparedData.githubRepo;
const githubToken = preparedData.githubToken;
const filepath = preparedData.filepath;

const apiUrl = `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filepath}`;

// Make the GitHub API call to check if file exists
let githubResponse = {};
try {
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (response.status === 404) {
    // File doesn't exist - expected case
    githubResponse = { status: '404', message: 'File not found' };
  } else if (response.ok) {
    githubResponse = await response.json();
  } else {
    const body = await response.json().catch(() => ({}));
    githubResponse = {
      status: String(response.status),
      message: body.message || 'Unknown error'
    };
  }
} catch (error) {
  githubResponse = {
    status: 'error',
    message: error.message || 'Network error'
  };
}

// Return merged data - prepared data + GitHub response (credentials stripped out)
return {
  json: {
    // Prepared data fields (from "Prepare for GitHub" via "Inject Credentials")
    filepath: preparedData.filepath,
    content: preparedData.content,
    workflowName: preparedData.workflowName,
    workflowId: preparedData.workflowId,
    workflowActive: preparedData.workflowActive,
    timestamp: preparedData.timestamp,
    // githubUsername/githubRepo/githubToken intentionally excluded from output

    // GitHub API response fields
    sha: githubResponse.sha || null,
    status: githubResponse.status || null,
    message: githubResponse.message || null,
    path: githubResponse.path || null
  }
};
