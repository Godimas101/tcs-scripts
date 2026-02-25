# ScrapingBee Usage Tracker

Track ScrapingBee API usage and credit consumption in n8n workflows.

## Overview

ScrapingBee is a web scraping API that handles headless browsers, proxies, and anti-bot bypassing. This tracker monitors credit usage across your n8n workflows to help manage your monthly quota.

## Pricing Structure

**Free Tier:** 1,000 API credits (trial, no credit card)

**Paid Plans:**
- **Freelance:** $49/mo - 250,000 credits
- **Startup:** $99/mo - 1,000,000 credits  
- **Business:** $249/mo - 3,000,000 credits
- **Business+:** $599/mo - 8,000,000 credits

### Credit Costs

| Configuration | Credits per Request |
|--------------|---------------------|
| Basic request | 1 credit |
| JavaScript rendering (`render_js=true`) | 5 credits |
| Premium proxy (`premium_proxy=true`) | 10 credits |
| Premium proxy + JS | 25 credits |

## Files

1. **`track_scrapingbee_usage.js`** - Main tracker
   - Detects ScrapingBee API calls in workflow execution data
   - Extracts credit usage from `Spb-cost` response headers
   - Calculates totals, breakdowns, and plan usage percentage
   - Provides configuration analysis (basic, JS, premium, premium+JS)

2. **`simplify_scrapingbee_output.js`** - Output formatter
   - Flattens detailed tracker output for data tables
   - Includes configuration breakdown (basic, JS, premium)
   - Top 3 target domains
   - Cost estimation for paid plans

3. **`combine_llm_and_twitter.js`** - Updated combined tracker
   - Now includes ScrapingBee alongside LLM, Twitter, and Browserless
   - Unified cost tracking across all services

## Setup in n8n

### Workflow Structure

```
Manual Trigger
    ↓
Get an Execution (n8n API)
    ↓
Track ScrapingBee Usage (Code node)
    ↓
Simplify ScrapingBee Output (Code node)
    ↓
Store to Google Sheets / Send Alert
```

### Detection Method

The tracker identifies ScrapingBee calls by:
1. **URL pattern:** `app.scrapingbee.com/api/v1/`
2. **Response headers:** Presence of `Spb-*` headers (e.g., `Spb-cost`, `Spb-resolved-url`)
3. **Node configuration:** ScrapingBee credential usage

### Key Headers

ScrapingBee returns these custom headers:

```javascript
Spb-cost: "1"                  // Credits used for this request
Spb-initial-status-code: "200" // Original HTTP status
Spb-resolved-url: "https://..." // Final URL after redirects
Spb-content-length: "12345"    // Response size
```

## URL Parameters

Common ScrapingBee parameters:

```
https://app.scrapingbee.com/api/v1/
  ?url=https://example.com           # Target URL
  &render_js=false                   # JavaScript rendering (5x cost)
  &premium_proxy=false               # Premium residential proxies (10x cost)
  &country_code=us                   # Geotargeting (requires premium)
  &screenshot=true                   # Take screenshot (uses JS cost)
  &api_key=YOUR_KEY                  # Authentication
```

## Output Fields

### Simplified Output (for data tables)

```javascript
{
  workflow_name: "My Workflow",
  execution_date: "2026-02-22T...",
  
  // Summary
  total_api_calls: 5,
  total_credits_used: 15,
  credits_remaining: 985,
  percent_used: 1.5,
  
  // Configuration breakdown
  basic_calls: 2,          // 1 credit each
  basic_credits: 2,
  js_rendering_calls: 2,   // 5 credits each
  js_rendering_credits: 10,
  premium_proxy_calls: 0,
  premium_js_calls: 1,     // 25 credits each
  premium_js_credits: 25,
  
  // Top targets
  top_target_1: "example.com (3 calls, 8 credits)",
  top_target_2: "test.com (2 calls, 7 credits)",
  
  // Warnings
  has_warnings: true,
  warnings: "⚠️ 75% of plan credits used",
  
  // Cost (for paid plans)
  estimated_cost_usd: 0.735
}
```

## Usage Examples

### Example 1: Basic Scraping

**Configuration:**
```
url: https://example.com
render_js: false
premium_proxy: false
```

**Cost:** 1 credit per request

### Example 2: JavaScript-Heavy Site

**Configuration:**
```
url: https://spa-app.com
render_js: true
premium_proxy: false
```

**Cost:** 5 credits per request

### Example 3: Geo-Targeted Scraping

**Configuration:**
```
url: https://geo-restricted.com
render_js: true
premium_proxy: true
country_code: ca
```

**Cost:** 25 credits per request

## Integration with Combined Tracker

The combined tracker now supports 4 services:

1. **LLM Usage** - Token tracking and costs
2. **Twitter API** - Rate limits and costs
3. **Browserless** - Browser automation units
4. **ScrapingBee** - Web scraping credits ✨ NEW

### n8n Workflow for Combined Tracking

```
Get Execution
    ↓
    ├─→ Track LLM Usage → Simplify LLM Output
    ├─→ Track Twitter Usage → Simplify Twitter Output
    ├─→ Track Browserless Usage → Simplify Browserless Output
    └─→ Track ScrapingBee Usage → Simplify ScrapingBee Output
    ↓
Merge (4 inputs)
    ↓
Combine All Services
    ↓
Store to Google Sheets
```

## Monitoring & Alerts

### Recommended Thresholds

- **Warning:** 75% of plan credits used
- **Critical:** 90% of plan credits used
- **Monitor:** Premium proxy usage (expensive)

### Example Alert Conditions

```javascript
// n8n IF node condition
{{ $json.scrapingbee_percent_used >= 75 }}

// Alert message
"⚠️ ScrapingBee usage at {{ $json.scrapingbee_percent_used }}%
Used: {{ $json.scrapingbee_total_credits_used }} / {{ $json.scrapingbee_plan_limit }} credits
Premium calls: {{ $json.scrapingbee_premium_js_calls + $json.scrapingbee_premium_calls }}"
```

## Best Practices

1. **Start with free tier** - Good for testing and low-volume workflows
2. **Disable JS when possible** - Saves 5× credits
3. **Use premium selectively** - Reserve for sites that block datacenter IPs
4. **Monitor credit burn** - Premium+JS costs 25× basic rate
5. **Cache results** - Store scraped data to avoid redundant calls

## Troubleshooting

### "No ScrapingBee calls detected"

**Check:**
1. Node uses `app.scrapingbee.com` URL
2. Response includes `Spb-*` headers
3. Execution data includes the HTTP Request node output

### "Credits higher than expected"

**Common causes:**
1. `render_js=true` enabled (5× cost)
2. `premium_proxy=true` enabled (10× or 25× cost)
3. Multiple retries on failed requests
4. Large page downloads triggering timeouts

### "Free tier exhausted"

**Solutions:**
1. Optimize scraping (disable JS/premium when possible)
2. Implement caching to reduce API calls
3. Upgrade to paid plan
4. Use alternative services for non-critical scraping

## Links

- **ScrapingBee Dashboard:** https://app.scrapingbee.com/dashboard
- **Pricing:** https://www.scrapingbee.com/pricing/
- **Documentation:** https://www.scrapingbee.com/documentation/
- **API Reference:** https://www.scrapingbee.com/documentation/api/

## Related Files

- `track_browserless_usage.js` - Similar tracker for Browserless.io
- `track_llm_usage.js` - LLM token tracking
- `track_twitter_usage.js` - Twitter API tracking
- `combine_llm_and_twitter.js` - Unified tracker for all services
