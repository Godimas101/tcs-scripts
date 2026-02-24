# Quick Start Guide - Workflow Backup Automation

**Time to setup**: ~10 minutes  
**Difficulty**: Beginner-friendly

---

## 🚀 Fast Track Setup

### Step 1: Create Private GitHub Repo (2 minutes)

1. Go to: https://github.com/new
2. Name: `tcs-workflows`
3. Set to: **Private** ✅
4. Click: "Create repository" (don't add README)

### Step 2: Get GitHub Token (3 minutes)

1. Go to: https://github.com/settings/tokens
2. Click: "Generate new token (classic)"
3. Name: `n8n workflow backup`
4. Check: ✅ `repo` (all sub-items)
5. Click: "Generate token"
6. **COPY TOKEN NOW** - save it somewhere safe!

### Step 3: Get n8n API Key (1 minute)

**n8n Cloud:**
- Settings → API → Copy key

**Self-Hosted:**
- Settings → n8n API → Create key → Copy

### Step 4: Set Environment Variables (3 minutes)

**n8n Cloud:**
1. Go to: Settings → Environment Variables
2. Add these (replace with your values):

```
N8N_HOST = https://your-instance.app.n8n.cloud
N8N_API_KEY = n8n_api_your_key_here
GITHUB_USERNAME = Godimas101
GITHUB_REPO = tcs-workflows
GITHUB_TOKEN = ghp_your_token_here
```

**Self-Hosted:**
Add to your `.env` file:

```bash
N8N_HOST=http://localhost:5678
N8N_API_KEY=your_n8n_api_key
GITHUB_USERNAME=Godimas101
GITHUB_REPO=tcs-workflows
GITHUB_TOKEN=ghp_your_github_token
```

Then restart n8n.

### Step 5: Import & Test (2 minutes)

1. In n8n, click: "+" → "Import from File"
2. Select: `workflow_backup_automation.json`
3. Click: "Test workflow" button
4. Watch it run - all nodes should be green ✅
5. Check GitHub: https://github.com/Godimas101/tcs-workflows
6. You should see a `workflows/` folder with JSON files!

### Step 6: Activate (1 second)

1. Click: "Active" toggle at top-right
2. Done! ✅

Your workflows will now backup daily at 2 AM.

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Private GitHub repo `tcs-workflows` exists
- [ ] All 5 environment variables are set in n8n
- [ ] Test run completes successfully (all green nodes)
- [ ] Workflow JSON files appear in GitHub repo
- [ ] Workflow is activated (toggle shows "Active")

---

## 🔧 Common Issues

**"Repository not found"**
- → Check repo name is exactly `tcs-workflows`
- → Ensure GitHub token has `repo` scope
- → Verify `GITHUB_USERNAME` is correct

**"Unauthorized"**
- → Get new GitHub token
- → Update `GITHUB_TOKEN` variable
- → Restart n8n (if self-hosted)

**"No workflows backed up"**
- → Check n8n API key is correct
- → Verify `N8N_HOST` matches your instance URL
- → Look at node errors for details

---

## 📝 Next Steps

Once working:

1. **Customize Schedule**: Change from 2 AM to your preferred time
2. **Add Notifications**: Get alerts when backups complete (see README)
3. **Test Restore**: Try importing a JSON file back to n8n
4. **Monitor**: Check repository weekly to ensure backups running

---

## 🆘 Need Help?

See full README.md for:
- Detailed troubleshooting
- Schedule customization
- Security best practices
- Advanced configurations

---

**Setup complete?** You're now protected against workflow loss! 🎉
