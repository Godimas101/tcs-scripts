# n8n Workflow Backup Automation

**Purpose**: Automatically backup all n8n workflows to a private GitHub repository daily.

**Status**: Ready to deploy  
**Schedule**: Daily at 2:00 AM (customizable)  
**Target**: Private GitHub repository

---

## Features

✅ **Automated Daily Backups** - Runs on schedule without manual intervention  
✅ **Smart Create/Update** - Detects existing files and updates them (no duplicates)  
✅ **Formatted JSON** - All workflows saved with proper indentation for readability  
✅ **Commit Messages** - Timestamped commits with workflow names  
✅ **Summary Reports** - Generates report of successful/failed backups  
✅ **Error Handling** - Gracefully handles API failures  

---

## Prerequisites

### 1. Create Private GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `tcs-workflows` (or your preferred name)
3. **Visibility**: ✅ **Private** (CRITICAL - protects your workflow data)
4. **Do NOT initialize** with README (we'll push from n8n)
5. Click "Create repository"

### 2. Generate GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. **Note**: `n8n workflow backup`
4. **Expiration**: Set to "No expiration" or 1 year
5. **Scopes** - Select these permissions:
   - ✅ `repo` (Full control of private repositories)
     - ✅ `repo:status`
     - ✅ `repo_deployment`
     - ✅ `public_repo`
     - ✅ `repo:invite`
6. Click "Generate token"
7. **COPY TOKEN IMMEDIATELY** - You won't see it again!

### 3. Get n8n API Key

#### Option A: n8n Cloud (Recommended)
1. Go to n8n Settings → API
2. Copy your API key

#### Option B: Self-Hosted n8n
1. Go to Settings → n8n API
2. Create new API key if needed
3. Copy the key

### 4. Set Environment Variables in n8n

Add these environment variables to your n8n instance:

#### n8n Cloud
1. Go to Settings → Environment Variables
2. Add these variables:

```
N8N_HOST=https://your-instance.app.n8n.cloud
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=Godimas101
GITHUB_REPO=tcs-workflows
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Self-Hosted n8n (Environment Variables)
Add to your `.env` file or docker-compose.yml:

```bash
N8N_HOST=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here
GITHUB_USERNAME=Godimas101
GITHUB_REPO=tcs-workflows
GITHUB_TOKEN=ghp_your_github_token_here
```

---

## Installation

### Step 1: Import Workflow

1. Open n8n
2. Click "+" → "Import from File"
3. Select `workflow_backup_automation.json`
4. Workflow will appear in your canvas

### Step 2: Verify Environment Variables

1. Click on any HTTP Request node
2. Check that `{{ $env.GITHUB_TOKEN }}` and other variables are highlighted (green = found)
3. If red, double-check environment variables are set correctly

### Step 3: Test Manually

1. Click "Test workflow" button (do NOT activate yet)
2. Watch execution:
   - ✅ Green = Success
   - ❌ Red = Error (check node for details)
3. Verify workflows appear in GitHub repo at: `https://github.com/Godimas101/tcs-workflows`

### Step 4: Activate Automation

1. Click "Active" toggle at top-right
2. Workflow will now run daily at 2:00 AM

---

## How It Works

### Workflow Architecture

```
┌─────────────────┐
│ Schedule Trigger│ ← Runs daily at 2 AM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Get All Workflows│ ← Fetch workflow list from n8n API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Parse Workflow   │ ← Extract IDs and metadata
│     List        │
└────────┬────────┘
         │
         ▼ (Loop for each workflow)
┌─────────────────┐
│Get Workflow     │ ← Fetch full JSON for workflow
│    Details      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Prepare for      │ ← Sanitize filename, Base64 encode
│    GitHub       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Check File Exists│ ← See if file already in GitHub
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Determine        │ ← Decide: create new or update existing
│  Operation      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Commit to GitHub │ ← Push workflow JSON to repo
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Generate Summary │ ← Create backup report
└─────────────────┘
```

### File Naming Convention

Workflows are saved as:
```
workflows/workflow_name_123.json
```

- `workflow_name` = Sanitized workflow name (lowercase, underscores)
- `123` = Workflow ID (ensures uniqueness)

Example: `workflows/daily_broadcast_generator_45.json`

### Commit Messages

**Create new file:**
```
Create: Daily Broadcast Generator (2026-02-24T02:00:00.000Z)
```

**Update existing file:**
```
Update: Daily Broadcast Generator (2026-02-24T02:00:00.000Z)
```

---

## Customization

### Change Backup Schedule

Edit the "Schedule Trigger" node:

**Daily at 2 AM** (default):
```
0 2 * * *
```

**Every 6 hours**:
```
0 */6 * * *
```

**Weekly on Sunday at midnight**:
```
0 0 * * 0
```

**Twice daily (2 AM and 2 PM)**:
```
0 2,14 * * *
```

[Cron expression generator](https://crontab.guru/)

### Change Repository Structure

Edit the "Prepare for GitHub" code node:

**Current** (flat structure):
```javascript
const filepath = `workflows/${filename}`;
```

**Organized by active status**:
```javascript
const folder = workflowData.active ? 'active' : 'inactive';
const filepath = `workflows/${folder}/${filename}`;
```

**Organized by date**:
```javascript
const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const filepath = `backups/${date}/${filename}`;
```

---

## Troubleshooting

### ❌ "Repository not found"

**Problem**: GitHub token doesn't have access to private repo

**Solution**:
1. Verify repository name: `https://github.com/Godimas101/tcs-workflows`
2. Check GitHub token has `repo` scope (full permissions)
3. Ensure token isn't expired
4. Verify `GITHUB_USERNAME` and `GITHUB_REPO` environment variables

### ❌ "Unauthorized" or "Bad credentials"

**Problem**: GitHub token is invalid or missing

**Solution**:
1. Generate new GitHub token (see Prerequisites)
2. Update `GITHUB_TOKEN` environment variable
3. Restart n8n (if self-hosted)

### ❌ "X-N8N-API-KEY header is required"

**Problem**: n8n API key not set or incorrect

**Solution**:
1. Get API key from n8n Settings → API
2. Update `N8N_API_KEY` environment variable
3. Ensure `N8N_HOST` is correct (with http:// or https://)

### ❌ Workflow runs but no files in GitHub

**Problem**: 
- GitHub API is failing silently
- Repository doesn't exist
- Permissions issue

**Solution**:
1. Click on "Check File Exists" node and examine output
2. Click on "Commit to GitHub" node and check for errors
3. Manually verify repository exists and is private
4. Check GitHub token permissions

### ❌ Some workflows backup, others don't

**Problem**: Individual workflow API calls failing

**Solution**:
1. Check "Get Workflow Details" node for specific errors
2. Verify all workflows are accessible via n8n API
3. Check if any workflows have special characters causing issues

---

## Security Best Practices

### ✅ DO:
- ✅ Use a **private** GitHub repository
- ✅ Store GitHub token in environment variables (never hardcode)
- ✅ Set GitHub token expiration (review annually)
- ✅ Use minimal required permissions (repo scope only)
- ✅ Regularly review repository access

### ❌ DON'T:
- ❌ Use a public repository (exposes all your workflows!)
- ❌ Hardcode GitHub token in workflow JSON
- ❌ Share repository with untrusted parties
- ❌ Commit tokens to git (n8n handles this with env vars)

---

## What Gets Backed Up

Each workflow JSON contains:

- ✅ All nodes and their configurations
- ✅ Connections between nodes
- ✅ Workflow settings and metadata
- ✅ Node positions (canvas layout)
- ✅ Credentials **references** (not actual secrets!)

**Important**: Actual API keys and credentials are NOT stored in workflow JSON. n8n stores these separately and only includes credential IDs in backups.

---

## Future Enhancements

Possible additions for future versions:

- **Slack/Email Notifications** - Get alerts when backups complete
- **Differential Backups** - Only backup workflows that changed
- **Version History** - Keep multiple versions with timestamps
- **Restore Workflow** - Reverse workflow to restore from GitHub
- **Backup Credentials** - Separate credential export (requires manual approval)
- **Backup Schedule Analysis** - Track which workflows execute most
- **Failed Workflow Detection** - Alert on workflows with errors

---

## Support

**Questions?** Check:
- [n8n API Documentation](https://docs.n8n.io/api/)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [n8n Community Forum](https://community.n8n.io/)

**Created by**: GitHub Copilot  
**Date**: February 24, 2026  
**Version**: 1.0
