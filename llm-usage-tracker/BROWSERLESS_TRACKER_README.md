# Browserless.io Usage Tracker for n8n

Track and monitor [Browserless.io](https://www.browserless.io/) usage in your n8n workflows. Monitor session time, identify expensive operations, and stay within your plan limits.

## Overview

Browserless.io measures usage in **units** where **1 unit = 1 second** of browser session time.

### Plan Limits
| Plan | Units/Month | Time/Month | Cost | Concurrent Sessions |
|------|-------------|------------|------|---------------------|
| **Free** | 6,000 | 100 minutes | $0 | 2 |
| **Starter** | 360,000 | 100 hours | $29 | 5 |
| **Business** | 1,800,000 | 500 hours | $99 | 10 |
| **Enterprise** | Custom | Custom | Custom | Custom |

## What This Tracker Does

✅ **Detects** Browserless calls from HTTP Request nodes  
✅ **Calculates** total units (seconds) used  
✅ **Breaks down** usage by endpoint type (screenshot, PDF, scrape, etc.)  
✅ **Categorizes** by target domain  
✅ **Warns** at 75%, 90%, 100% usage thresholds  
✅ **Estimates** session time when actual data unavailable  

## Setup Instructions

### Step 1: Get Workflow Execution Data

Add to your workflow:
1. **"Get an execution" node** (or use n8n API)
2. Configure to fetch the current/latest execution data

### Step 2: Add Tracker Code Node

1. Add new **Code** node after execution data node
2. Set mode to: **"Run Once for All Items"**
3. Copy entire contents of `track_browserless_usage.js`
4. Paste into Code node editor

### Step 3: Test

Execute workflow and check output:
```json
{
  "usage_summary": {
    "total_api_calls": 12,
    "total_units_used": 87,
    "total_time_used": "1m 27s",
    "units_remaining": 5913,
    "time_remaining": "98m 33s",
    "percent_used": "1.45",
    "current_plan": "free"
  },
  "endpoint_breakdown": {
    "screenshot": {
      "calls": 8,
      "units": 42,
      "avgUnitsPerCall": "5.25"
    },
    "download": {
      "calls": 4,
      "units": 45,
      "avgUnitsPerCall": "11.25"
    }
  },
  "warnings": []
}
```

## How Detection Works

The tracker identifies Browserless calls by checking:

### 1. **URL Patterns**
```
browserless.io
chrome.browserless.io
```

### 2. **Response Headers**
```
x-response-code
x-response-url
x-session-time
```

### 3. **Node Naming**
Node names containing:
- "browserless"
- "browser"
- "screenshot"
- "scrape"

### 4. **Endpoint Detection**
Recognizes these endpoint paths:
- `/screenshot` - Take screenshots
- `/content` - Get HTML/text
- `/pdf` - Generate PDFs
- `/scrape` - Scrape data
- `/function` - Execute JavaScript
- `/download` - Download files
- `/chrome` - Chrome DevTools Protocol
- `/chromium` - Chromium sessions

## Endpoint Time Estimates

When actual session time is unavailable, tracker uses these estimates:

| Endpoint | Estimated Time | Typical Use |
|----------|---------------|-------------|
| `/content` | 3 seconds | Simple HTML fetch |
| `/screenshot` | 5 seconds | Single page capture |
| `/scrape` | 5 seconds | Structured data extraction |
| `/pdf` | 8 seconds | PDF generation |
| `/function` | 10 seconds | Custom JavaScript execution |
| `/download` | 15 seconds | File downloads |
| `/chrome` | 30 seconds | CDP automation |
| `/chromium` | 30 seconds | Browser sessions |

**Note**: Actual time varies based on:
- Page load time
- JavaScript complexity
- Network speed
- Page size
- Wait conditions

## Understanding Session Time

### What Counts as Usage?
```
Session Start → Page Load → Wait/Execute → Complete = Total Seconds
```

### Example Calculations

**Simple Screenshot (5 seconds)**
```json
{
  "url": "https://chrome.browserless.io/screenshot?token=YOUR_TOKEN",
  "body": {
    "url": "https://example.com"
  }
}
```
Cost: **5 units** (~0.08% of free tier)

**Complex Scraping (15 seconds)**
```json
{
  "url": "https://chrome.browserless.io/scrape?token=YOUR_TOKEN",
  "body": {
    "url": "https://example.com",
    "waitFor": 5000,
    "elements": [...]
  }
}
```
Cost: **15 units** (~0.25% of free tier)

**Large Download (30 seconds)**
```json
{
  "url": "https://chrome.browserless.io/download?token=YOUR_TOKEN",
  "body": {
    "url": "https://example.com/large-file.pdf"
  }
}
```
Cost: **30 units** (~0.50% of free tier)

## Tips for Reducing Usage

### 1. ⚡ Use Appropriate Endpoints
```javascript
// ❌ BAD: Using /function for simple content
POST /function
{ code: "return document.body.innerHTML" }
// Cost: ~10 seconds

// ✅ GOOD: Use /content endpoint
POST /content
{ url: "https://example.com" }
// Cost: ~3 seconds (70% savings)
```

### 2. 🎯 Minimize Wait Times
```javascript
// ❌ BAD: Long unnecessary waits
{
  url: "https://example.com",
  waitFor: 10000  // 10 seconds
}

// ✅ GOOD: Wait for specific element
{
  url: "https://example.com",
  waitFor: "selector:.content-loaded"
}
```

### 3. 🚫 Block Unnecessary Resources
```javascript
// ✅ GOOD: Block ads and trackers
{
  url: "https://example.com",
  blockAds: true,  // Faster page load
  stealth: true
}
```

### 4. 📦 Batch Operations
```javascript
// ❌ BAD: 10 separate calls = 10 sessions
for (let url of urls) {
  await browserless.screenshot(url);
}

// ✅ GOOD: Process multiple in one session
await browserless.function({
  code: `
    const urls = ['url1', 'url2', 'url3'];
    const results = [];
    for (let url of urls) {
      await page.goto(url);
      results.push(await page.screenshot());
    }
    return results;
  `
});
```

### 5. ⏱️ Set Reasonable Timeouts
```javascript
{
  url: "https://example.com",
  timeout: 15000  // Don't wait longer than needed
}
```

## Output Structure

### usage_summary
```json
{
  "total_api_calls": 25,
  "total_units_used": 187,
  "total_time_used": "3m 7s",
  "units_remaining": 5813,
  "time_remaining": "96m 53s",
  "percent_used": "3.12",
  "plan_limit": 6000,
  "current_plan": "free"
}
```

### endpoint_breakdown
```json
{
  "screenshot": {
    "calls": 15,
    "units": 78,
    "avgUnitsPerCall": "5.20"
  },
  "download": {
    "calls": 10,
    "units": 109,
    "avgUnitsPerCall": "10.90"
  }
}
```

### target_breakdown
```json
{
  "example.com": {
    "calls": 12,
    "units": 87
  },
  "test-site.com": {
    "calls": 13,
    "units": 100
  }
}
```

### warnings
```json
[
  "⚠️ 75% of plan units used",
  "ℹ️ 5 call(s) using estimated time"
]
```

## Warning Levels

| Usage | Warning | Action |
|-------|---------|--------|
| 75%+ | ⚠️ 75% used | Start monitoring closely |
| 90%+ | ⚠️ 90% used | Optimize or upgrade soon |
| 100%+ | ⚠️ LIMIT EXCEEDED | Upgrade required - requests throttled |

## Common Issues

### ❌ "Could not find runData in input"
**Cause**: Tracker doesn't have execution data  
**Fix**:
```
1. Add "Get an execution" node before tracker
2. Or use HTTP Request to n8n API: GET /executions/{id}
3. Ensure tracker receives workflow execution JSON
```

### ❌ "No Browserless calls detected"
**Possible causes**:
- URL doesn't contain `browserless.io`
- Node name doesn't match patterns
- Response headers missing

**Fix**: Check HTTP Request node shows:
```
URL: https://chrome.browserless.io/screenshot?token=...
Headers: x-response-code, x-response-url
```

### ❌ "All timings are estimates"
**Cause**: Response doesn't include session time  
**Impact**: Estimates may be 20-50% off actual usage  
**Fix**: Browserless may not return session time in all responses. Estimates are based on typical endpoint performance.

## Integration Examples

### Monitor Daily Usage
```
Schedule Trigger (daily)
  ↓
HTTP Request (get yesterday's executions)
  ↓
Track Browserless Usage
  ↓
IF (percent_used > 75%)
  ↓
Send Email Alert
```

### Per-Workflow Tracking
```
Your Workflow (with Browserless calls)
  ↓
Get an Execution (currentExecutionId)
  ↓
Track Browserless Usage
  ↓
Store Results (Google Sheets/DB)
```

### Combined Usage Dashboard
```javascript
// Combine multiple tracker outputs
const browserlessUsage = $('Track Browserless Usage').item.json;
const scraperUsage = $('Track ScraperAPI Usage').item.json;
const llmUsage = $('Track LLM Usage').item.json;

return [{
  json: {
    total_costs: {
      browserless: browserlessUsage.usage_summary.total_units_used,
      scraper: scraperUsage.usage_summary.total_credits_used,
      llm: llmUsage.total_cost_usd
    },
    warnings: [
      ...browserlessUsage.warnings,
      ...scraperUsage.warnings,
      ...llmUsage.warnings
    ]
  }
}];
```

## Resources

- **Dashboard**: https://www.browserless.io/dashboard
- **Pricing**: https://www.browserless.io/pricing
- **API Docs**: https://docs.browserless.io/
- **Support**: https://www.browserless.io/contact

## Notes

- Units reset monthly on billing cycle
- Concurrent session limits enforced per plan
- Free tier requires no credit card
- Unused units do not roll over
- Enterprise plans available for custom needs

---

**Need Help?** Check the [Browserless documentation](https://docs.browserless.io/) or contact support.
