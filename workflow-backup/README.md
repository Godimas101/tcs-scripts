# n8n Workflow Backup

Automated daily backup of all n8n workflows to this GitHub repository.

Built using the **[Automated daily workflow backup to GitHub](https://n8n.io/workflows/4064-automated-daily-workflow-backup-to-github/)** template (workflow #4064) by [Hugo](https://n8n.io/creators/hugop/) on n8n.io.

## How it works

1. **Schedule Trigger** — runs daily
2. **List files from repo** (GitHub node) — fetches all existing backup files
3. **Aggregate** — consolidates the file list into a single lookup item
4. **Retrieve workflows** (n8n node) — fetches all workflows from the n8n instance
5. Per workflow:
   - Convert to JSON file → Base64 encode
   - Generate filename and commit date
   - **IF file exists** → Update file (GitHub node)
   - **IF file is new** → Upload file (GitHub node)

## Backed up workflows

Workflow JSON files are stored in the root of this repository.

Automatically backs up all n8n workflows to a private GitHub repository on a daily schedule.

## Workflow Overview

This workflow:
1. Fetches all workflows from your n8n instance API
2. Downloads the full JSON for each workflow
3. Checks if each workflow file already exists in GitHub
4. Creates or updates the file in your private GitHub repo
5. Generates a summary report of the backup operation

## Node Structure

### 1. Schedule Trigger
- **Type**: Schedule Trigger
- **Schedule**: Daily at 2:00 AM (configurable)
- **Purpose**: Triggers the workflow automatically

### 2. Get All Workflows
- **Type**: HTTP Request (GET)
- **URL**: `{{ $env.N8N_HOST }}/api/v1/workflows`
- **Authentication**: API Key via header (X-N8N-API-KEY)
- **Purpose**: Fetches list of all workflows from n8n API

### 3. Parse Workflow List
- **Type**: Code Node
- **File**: [parse_workflow_list.js](parse_workflow_list.js)
- **Purpose**: Extracts workflow IDs and metadata from API response
- **Handles**: Different API response structures

### 4. Get Workflow Details
- **Type**: HTTP Request (GET)
- **URL**: `{{ $env.N8N_HOST }}/api/v1/workflows/{{ $json.id }}`
- **Authentication**: API Key via header
- **Purpose**: Fetches full JSON for each workflow (runs once per workflow)

### 5. Prepare for GitHub
- **Type**: Code Node
- **File**: [prepare_for_github.js](prepare_for_github.js)
- **Purpose**: 
  - Sanitizes workflow name for filename
  - Base64 encodes workflow JSON
  - Creates commit message
  - Prepares data structure for GitHub API

### 6. Check File Exists
- **Type**: HTTP Request (GET)
- **URL**: `https://api.github.com/repos/{{ $env.GITHUB_USERNAME }}/{{ $env.GITHUB_REPO }}/contents/{{ $json.filepath }}`
- **Authentication**: Bearer token in header
- **Options**: 
  - **Never Error**: ON (returns 404 if file doesn't exist)
  - **Include Input Data in Output**: ON (if available - see solutions below)
- **Purpose**: Checks if workflow file already exists in GitHub repo

### 7. Determine Operation
- **Type**: Code Node
- **File**: [determine_operation.js](determine_operation.js) (primary version)
- **Alternative**: [determine_operation_with_node_reference.js](determine_operation_with_node_reference.js)
- **Alternative 2**: Use [merge_github_response.js](merge_github_response.js) as intermediate node
- **Purpose**: Decides whether to CREATE or UPDATE based on file existence
- **Important**: Must handle both GitHub response and prepared data

### 8. Commit to GitHub
- **Type**: HTTP Request (PUT)
- **URL**: `https://api.github.com/repos/{{ $env.GITHUB_USERNAME }}/{{ $env.GITHUB_REPO }}/contents/{{ $json.filepath }}`
- **Authentication**: Bearer token in header
- **Body**: JSON with message, content, and sha (if updating)
- **Purpose**: Creates or updates workflow file in GitHub

### 9. Generate Summary
- **Type**: Code Node
- **File**: [generate_summary.js](generate_summary.js)
- **Purpose**: Creates summary report of backup operation

## Environment Variables Required

```bash
N8N_HOST=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
GITHUB_USERNAME=your-github-username
GITHUB_REPO=your-private-repo-name
GITHUB_TOKEN=your-github-personal-access-token
```

## Memory Issue & Solutions

### The Problem
The original "Determine Operation" node used `$input.all()` and `$node["Prepare for GitHub"].all()` which loaded ALL workflows into memory at once. With many workflows (70+), this caused out-of-memory errors.

### Solution 1: Include Input Data in Output (Recommended)
**Best for**: n8n versions that support this feature

In the "Check File Exists" HTTP Request node:
1. Go to **Options**
2. Find **Request Options**
3. Enable **Include Input Data in Output**

This makes the HTTP Request node merge the input data (from "Prepare for GitHub") with the GitHub API response, so "Determine Operation" has access to both without loading everything into memory.

**Use**: [determine_operation.js](determine_operation.js)

### Solution 2: Merge Node (Alternative)
**Best for**: n8n versions without "Include Input Data in Output" option (like v2.9.2)

Insert a new Code node between "Check File Exists" and "Determine Operation":
1. Add Code node named "Merge GitHub Response"
2. Copy code from [merge_github_response.js](merge_github_response.js)
3. This manually combines the GitHub response with prepared data
4. Use [determine_operation.js](determine_operation.js) (same as Solution 1)

**Workflow**: `Check File Exists` → `Merge GitHub Response` → `Determine Operation`

### Solution 3: Node Reference with Index Matching (Fallback)
**Best for**: When other solutions aren't available

Uses `$node["Prepare for GitHub"]` but accesses data by index instead of loading all items.

**Use**: [determine_operation_with_node_reference.js](determine_operation_with_node_reference.js)

**Note**: This still accesses node data but processes items individually.

## File Structure

```
workflow-backup/
├── workflow_backup_automation.json    # Complete n8n workflow (import this)
├── parse_workflow_list.js             # Node 3: Parse workflow list
├── prepare_for_github.js              # Node 5: Format for GitHub
├── determine_operation.js             # Node 7: Decide create/update (Solution 1 & 2)
├── determine_operation_with_node_reference.js  # Node 7: Alternative (Solution 3)
├── merge_github_response.js           # Optional intermediate node (Solution 2)
├── generate_summary.js                # Node 9: Create summary report
├── README.md                          # This file
├── example-output-get-workflows.json  # Example API response
└── example-output-workflow-details.json  # Example workflow JSON
```

## Setup Instructions

### 1. Create GitHub Personal Access Token
1. Go to GitHub Settings > Developer Settings > Personal Access Tokens
2. Generate new token (classic)
3. Required scopes: `repo` (full control of private repositories)
4. Copy the token

### 2. Create Private GitHub Repository
```bash
# Create a new private repo on GitHub
# Name it something like: n8n-workflows-backup
```

### 3. Set Environment Variables in n8n
1. Go to Settings > Environment Variables
2. Add the required variables (see above)

### 4. Import Workflow
1. Download [workflow_backup_automation.json](workflow_backup_automation.json)
2. In n8n, click **Import from File**
3. Select the JSON file
4. The workflow will be imported with all connections

### 5. Configure Memory Solution
Choose one of the three solutions above based on your n8n version:
- **Solution 1**: Enable "Include Input Data in Output" in Check File Exists node
- **Solution 2**: Add "Merge GitHub Response" node with [merge_github_response.js](merge_github_response.js)
- **Solution 3**: Replace "Determine Operation" code with [determine_operation_with_node_reference.js](determine_operation_with_node_reference.js)

### 6. Test the Workflow
1. Click **Test workflow** (don't wait for schedule)
2. Check GitHub repo - should see `workflows/` folder with JSON files
3. Review the summary output

## Workflow Execution Flow

```
Schedule Trigger (2 AM daily)
    ↓
Get All Workflows (HTTP: GET /workflows)
    ↓
Parse Workflow List (Code: Extract IDs)
    ↓
Get Workflow Details (HTTP: GET /workflows/{id}) [runs for EACH workflow]
    ↓
Prepare for GitHub (Code: Format & encode)
    ↓
Check File Exists (HTTP: GET GitHub file)
    ↓
[Optional: Merge GitHub Response] <- if using Solution 2
    ↓
Determine Operation (Code: Create vs Update)
    ↓
Commit to GitHub (HTTP: PUT GitHub file)
    ↓
Generate Summary (Code: Build report)
```

## Monitoring & Troubleshooting

### Common Issues

**Memory Errors**:
- **Symptom**: "n8n may have run out of memory" at Determine Operation node
- **Cause**: Loading all workflows into memory
- **Solution**: Implement one of the three solutions above

**Authentication Errors**:
- **Symptom**: 401 Unauthorized
- **Cause**: Invalid or expired API keys/tokens
- **Solution**: Verify environment variables are set correctly

**409 Conflict Errors**:
- **Symptom**: GitHub returns 409 when updating
- **Cause**: SHA mismatch (file changed since we checked)
- **Solution**: This is handled by the workflow - it will retry on next run

**File Not Created**:
- **Symptom**: No files appear in GitHub repo
- **Cause**: Missing GitHub token permissions
- **Solution**: Ensure token has `repo` scope

### Verify Backup Success

Check the Summary output for:
```json
{
  "totalWorkflows": 70,
  "successful": 70,
  "failed": 0,
  "timestamp": "2026-02-27T02:00:00.000Z",
  "workflows": [...]
}
```

## GitHub Repository Structure

After successful backup:
```
your-private-repo/
└── workflows/
    ├── workflow_backup_to_github_private_repo_1.json
    ├── the_commercial_space_2.json
    ├── the_spacex_report_3.json
    └── ... (all workflows)
```

Each file contains the complete n8n workflow JSON with:
- All node configurations
- Connections
- Settings
- Credentials (names only, not sensitive data)

## Maintenance

### Updating Code Nodes
1. Edit the corresponding `.js` file
2. Copy the updated code
3. Paste into the Code node in n8n
4. Test the workflow
5. Export the updated workflow JSON
6. Commit changes to this repository

### Schedule Adjustment
Modify the Schedule Trigger cron expression:
- Current: `0 2 * * *` (2 AM daily)
- Example: `0 */6 * * *` (every 6 hours)
- Example: `0 0 * * 0` (weekly on Sunday)

## Performance Notes

- **Execution Time**: ~1-2 seconds per workflow
- **API Rate Limits**: 
  - n8n: No built-in rate limits
  - GitHub: 5,000 requests/hour (1,250 for search)
- **Memory Usage**: ~10-20 MB per workflow when properly configured
- **Recommendations**:
  - For 100+ workflows, consider increasing Node.js memory limit
  - Monitor GitHub API rate limit: https://api.github.com/rate_limit

## Version History

- **v1.0** (2026-02-24): Initial workflow creation
- **v1.1** (2026-02-27): Fixed memory issues with includeInputDataInOutput
- **v1.2** (2026-02-27): Extracted code nodes to separate files, added alternative solutions

## Support

For issues or questions:
1. Check the [n8n HTTP Request docs](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
2. Review the workflow execution logs
3. Test individual nodes with sample data
4. Check GitHub API response in browser developer console
