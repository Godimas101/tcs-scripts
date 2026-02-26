# ScraperAPI Usage Tracker

## Overview
This tracker monitors scraperapi.io API calls within n8n workflows, tracks credit usage, and provides warnings when approaching free tier limits.

## Features

### 1. **API Call Detection**
- Detects ScraperAPI calls by examining node configurations in workflow execution data
- Identifies all HTTP Request nodes pointing to `api.scraperapi.com`
- Extracts feature parameters from query string configuration
- Links calls to specific workflow nodes and executions
- **Note:** Detection works by reading node parameters, not response headers (headers not available in n8n execution data)

### 2. **Feature Tracking**
Automatically detects and categorizes ScraperAPI features from node configuration:
- **Base requests** - 1 credit per request
- **JavaScript rendering** (`render=true`) - 5x multiplier (5 credits)
- **Premium/residential proxies** (`premium=true`) - 10x multiplier (10 credits)
- **Geotargeting** (`country_code` parameter) - Included, no extra cost
- **AutoParse** (`autoparse=true`) - 50x multiplier (50 credits)

### 3. **Credit Monitoring**
Tracks estimated credit usage against free tier limits:
- **Free tier:** 1,000 credits/month
- Estimated remaining credits based on detected usage
- Percentage used calculation
- Warning alerts at 75%, 90%, and 100%
- **Note:** Credit calculations are estimates based on feature detection; actual usage viewable at [ScraperAPI Dashboard](https://dashboard.scraperapi.com/billing)

### 4. **Cost Analysis**
Provides detailed breakdown:
- Total credits used vs. available
- Credits per feature type
- Credits per target domain
- Average credits per API call
- Recommendations for plan upgrades

## Setup in n8n

### Step 1: Get Workflow Execution
Use the n8n HTTP Request node or "Get an Execution" node to retrieve execution data.

### Step 2: Add Code Node
1. Create a new **Code** node
2. Set mode to **Run Once for All Items**
3. Copy the contents of `track_scraperapi_usage.js`
4. Paste into the code editor

### Step 3: Process Results
The output includes:

```json
{
  "workflow_name": "My Scraping Workflow",
  "workflow_id": "abc123",
  "execution_id": "exec456",
  "usage_summary": {
    "total_api_calls": 12,
    "total_credits_used": 47,
    "credits_remaining": 953,
    "percent_used": "4.70",
    "free_tier_limit": 1000,
    "average_credits_per_call": "3.92"
  },
  "feature_breakdown": {
    "base_requests": {
      "calls": 8,
      "credits_per_call": 1,
      "total_credits": 8
    },
    "js_render": {
      "calls": 3,
      "credits_per_call": 5,
      "total_credits": 15
    },
    "premium_proxy": {
      "calls": 1,
      "credits_per_call": 10,
      "total_credits": 10
    }
  },
  "target_breakdown": {
    "example.com": {
      "calls": 5,
      "credits": 25
    },
    "test-site.com": {
      "calls": 7,
      "credits": 22
    }
  },
  "warnings": [],
  "pricing_reference": {
    "free_tier": {
      "credits": 1000,
      "costUSD": 0,
      "concurrentRequests": 1
    },
    "paid_plans": {
      "hobby": {
        "credits": 100000,
        "costUSD": 49,
        "concurrentRequests": 10
      },
      "startup": {
        "credits": 1000000,
        "costUSD": 149,
        "concurrentRequests": 25
      },
      "business": {
        "credits": 3000000,
        "costUSD": 299,
        "concurrentRequests": 50
      }
    }
  }
}
```

## ScraperAPI Pricing

### Free Tier (Current)
- **1,000 credits/month**
- **1 concurrent request**
- All features available (JS rendering, geotargeting, etc.)
- Credits reset monthly

### Paid Plans

| Plan | Credits/Month | Cost | Concurrent Requests |
|------|---------------|------|---------------------|
| **Hobby** | 100,000 | $49 | 10 |
| **Startup** | 1,000,000 | $149 | 25 |
| **Business** | 3,000,000 | $299 | 50 |

### Feature Costs

| Feature | Credit Multiplier | Example Cost |
|---------|-------------------|--------------|
| **Base request** | 1x | 1 credit |
| **JS rendering** (`render=true`) | 5x | 5 credits |
| **Premium proxy** (`premium=true`) | 10x | 10 credits |
| **AutoParse** (`autoparse=true`) | 50x | 50 credits |
| **Geotargeting** (`country_code=us`) | Included | No extra cost |

### Credit Calculation Examples

1. **Simple scrape:** `http://api.scraperapi.com?api_key=XXX&url=example.com`
   - Cost: **1 credit**

2. **With JS rendering:** `...&render=true`
   - Cost: **5 credits**

3. **Premium proxy + JS:** `...&premium=true&render=true`
   - Cost: **10 credits** (highest multiplier wins)

4. **AutoParse:** `...&autoparse=true`
   - Cost: **50 credits**

## Detection Methods

The tracker identifies ScraperAPI calls by examining workflow node configurations:

### Primary Detection
1. **Node Configuration Inspection:**
   - Reads `workflowData.nodes` from execution data
   - Checks each node's `parameters.url` field
   - Identifies nodes with URLs containing `scraperapi.com` or `api.scraperapi.com`

2. **Feature Parameter Extraction:**
   - Parses `parameters.queryParameters.parameters` array
   - Detects feature flags: `render`, `premium`, `country_code`, `autoparse`
   - Extracts `api_key` and target `url` parameters

### Why Not Response Headers?
n8n execution data **does not include HTTP response headers** from API calls. The tracker cannot access:
- `x-scraperapi-credits-remaining` (actual remaining credits)
- `x-scraperapi-credit-cost` (actual cost per request)

Instead, the tracker **estimates credits** based on detected feature parameters:
- `render=true` → 5 credits
- `premium=true` → 10 credits  
- `autoparse=true` → 50 credits
- No features → 1 credit

### Accuracy
- ✅ **Call detection:** 100% accurate (finds all ScraperAPI nodes)
- ✅ **Feature detection:** 100% accurate (reads from configuration)
- ⚠️ **Credit calculation:** Estimated (verify actual usage at [dashboard](https://dashboard.scraperapi.com/billing))

### Data Structure
```javascript
// Execution data structure
{
  workflowData: {
    nodes: [
      {
        name: "Article Scrape",
        type: "n8n-nodes-base.httpRequest",
        parameters: {
          url: "https://api.scraperapi.com",
          queryParameters: {
            parameters: [
              { name: "api_key", value: "your_key" },
              { name: "url", value: "https://example.com" },
              { name: "render", value: "true" }  // 5x credit multiplier
            ]
          }
        }
      }
    ]
  },
  resultData: {
    runData: {
      "Article Scrape": [ /* execution results */ ]
    }
  }
}
```

## Warning System

The tracker provides automatic warnings:

- **⚠️ 75% used:** Start monitoring usage more closely
- **⚠️ 90% used:** Consider optimizing or upgrading
- **⚠️ 100% exceeded:** FREE TIER LIMIT EXCEEDED - Upgrade required

## Tips for Reducing Credit Usage

1. **Avoid JS rendering when not needed**
   - Only use `render=true` for JavaScript-heavy sites
   - Saves 4 credits per request (80% reduction)

2. **Use datacenter proxies first**
   - Try without `premium=true` before using residential proxies
   - Saves 9 credits per request (90% reduction)

3. **Optimize request frequency**
   - Cache results when possible
   - Implement rate limiting in workflows
   - Batch related requests

4. **Target specific content**
   - Use CSS selectors or AutoParse sparingly
   - Only scrape necessary pages
   - Filter out duplicate URLs before scraping

5. **Monitor dashboard regularly**
   - Check https://dashboard.scraperapi.com/billing
   - Review credit usage patterns
   - Set up alerts for high usage

## Integration with Existing Trackers

This tracker can be combined with LLM and Twitter API trackers:

```javascript
// Combine multiple tracking outputs
const scraperUsage = $('Track ScraperAPI Usage').item.json;
const llmUsage = $('Track LLM Usage').item.json;
const twitterUsage = $('Track Twitter API Usage').item.json;

return [{
  json: {
    scraperapi: scraperUsage,
    llm: llmUsage,
    twitter: twitterUsage,
    combined_warnings: [
      ...scraperUsage.warnings,
      ...llmUsage.warnings,
      ...twitterUsage.warnings
    ]
  }
}];
```

## Dashboard Links

- **Billing Dashboard:** https://dashboard.scraperapi.com/billing
- **Usage Stats:** https://dashboard.scraperapi.com/
- **Documentation:** https://docs.scraperapi.com/

## Limitations

### Known Limitations
1. **No Actual Credit Data:** Cannot access actual remaining credits from ScraperAPI headers (not available in n8n execution data)
2. **Estimated Costs:** Credit calculations are estimates based on configuration, not actual API charges
3. **Target URL Display:** Shows n8n expressions (e.g., `={{$json.url}}`) instead of resolved URLs when using dynamic values
4. **POST Parameters:** Only detects features in query parameters, not POST body

### Verification Recommended
- Always verify actual usage at [ScraperAPI Dashboard](https://dashboard.scraperapi.com/billing)
- Cross-check estimated credits with actual monthly consumption
- Monitor for any discrepancies between tracker estimates and real usage

## Troubleshooting

### Calls not detected
- Verify node configuration includes `url: "https://api.scraperapi.com"`
- Check that `workflowData.nodes` is available in execution data
- Ensure workflow execution completed successfully

### Inaccurate feature detection
- Tracker reads `queryParameters.parameters` from node configuration
- Features must be specified as query parameters (e.g., `render=true`)
- If using POST body for parameters, detection will not work
- Verify parameter names match expected values: `render`, `premium`, `country_code`, `autoparse`

### Showing 0 calls when calls were made
- This means node configurations weren't found in `workflowData.nodes`
- Verify execution data includes complete workflow definition
- Check that node names match between runData and node definitions

## Version History

- **v1.1** (Feb 2026) - Detection method update
  - Changed to node configuration-based detection
  - Removed dependency on response headers (not available in n8n)
  - Added estimated credit calculations
  - Improved accuracy documentation

- **v1.0** (Feb 2026) - Initial release
  - Basic credit tracking
  - Feature detection
  - Free tier warnings
  - Target domain breakdown
