/**
 * Check File and Merge
 * Replaces both "Check File Exists" (HTTP Request) and "Merge GitHub Response" nodes
 *
 * PLACEMENT: Between "Prepare for GitHub" and "Determine Operation"
 *
 * This node:
 * 1. Takes prepared workflow data from "Prepare for GitHub"
 * 2. Makes the GitHub API call to check if file exists
 * 3. Returns merged data containing both the prepared data AND GitHub response
 *
 * Requires env vars set in docker-compose.yml:
 *   GITHUB_USERNAME, GITHUB_REPO, GITHUB_TOKEN
 */

const preparedData = $input.item.json;

const githubUsername = $env.GITHUB_USERNAME;
const githubRepo = $env.GITHUB_REPO;
const githubToken = $env.GITHUB_TOKEN;
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

// Return merged data - prepared data + GitHub response
return {
  json: {
    // Prepared data fields (from "Prepare for GitHub")
    filepath: preparedData.filepath,
    content: preparedData.content,
    workflowName: preparedData.workflowName,
    workflowId: preparedData.workflowId,
    workflowActive: preparedData.workflowActive,
    timestamp: preparedData.timestamp,

    // GitHub API response fields
    sha: githubResponse.sha || null,
    status: githubResponse.status || null,
    message: githubResponse.message || null,
    path: githubResponse.path || null
  }
};
