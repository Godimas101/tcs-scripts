# Twitter API Usage Tracker

## Overview
This tracker monitors twitterapi.io API calls within n8n workflows, categorizes endpoints, and calculates costs based on different pricing tiers.

## Features

### 1. **API Call Tracking**
- Detects Twitter API calls in HTTP nodes
- Extracts URL, method, status code, and response size
- Links calls to specific workflow nodes and executions

### 2. **Endpoint Categorization**
Automatically categorizes Twitter API v2 endpoints:
- `tweets` - Tweet operations
- `users` - User information
- `spaces` - Twitter Spaces
- `lists` - List management
- `dm` - Direct messages
- `search` - Search API
- `media` - Media uploads
- `timeline` - Timeline retrieval
- `mentions` - Mentions timeline
- `followers` - Follower data
- `following` - Following data
- `other` - Uncategorized endpoints

### 3. **Cost Calculation**
Uses the actual twitterapi.io **pay-as-you-go** pricing model:

#### Credit System
- **1 USD = 100,000 Credits**
- **Recharged credits never expire**
- **Bonus credits** included with every recharge (valid 30 days)
- **Higher recharges** = bigger discounts (up to 5% off)

#### Per-Item Pricing
- **Tweets:** 15 credits each ($0.15 per 1,000 tweets)
- **Profiles:** 18 credits each ($0.18 per 1,000 user profiles)
- **Followers:** 15 credits each ($0.15 per 1,000 followers)
- **Following:** 15 credits each ($0.15 per 1,000 following)

#### Minimum Charges
- **Regular requests:** 15 credits ($0.00015) per API call
  - ⚠️ **Waived for bulk data responses** (10+ items)
- **List functions:** 150 credits ($0.0015) per call (effective Oct 1st)

#### Special Offers
- 🎓 **Student/Research discounts** available

## Setup in n8n

### Step 1: Get Workflow Execution
Use the n8n HTTP Request node or "Get an Execution" node to retrieve execution data.

### Step 2: Add Code Node
1. Create a new **Code** node
2. Set mode to **Run Once for All Items**
3. Copy the contents of `track_twitter_api_usage.js`
4. Paste into the code editor

### Step 3: Process Results
The output includes:

```json
{
  "workflow_name": "My Twitter Workflow",
  "workflow_id": "abc123",
  "execution_id": "exec456",
  "usage_summary": {
    "total_api_calls": 5,
    "total_items_returned": 487,
    "endpoints_used": 2
  },
  "cost_analysis": {
    "total_credits": 7305,
    "total_cost_usd": "0.073050",
    "average_cost_per_call": "0.014610",
    "average_cost_per_item": "0.000150",
    "cost_by_data_type": {
      "tweets": {
        "items": 350,
        "credits": 5250,
        "costUSD": "0.052500",
        "avgCreditsPerItem": "15.00"
      },
      "profiles": {
        "items": 137,
        "credits": 2466,
        "costUSD": "0.024660",
        "avgCreditsPerItem": "18.00"
      }
    }
  },
  "pricing_reference": {
    "notes": [
      "Pay-as-you-go: No subscription fees",
      "Recharged credits never expire",
      "Bonus credits with recharges (valid 30 days)",
      "Minimum charge waived for bulk data responses"
    ]
  }
}
```

##creditsPerUSD: 100000,
  perItem: {
    tweets: 15,    // Update credits per tweet
    profiles: 18,  // Update credits per profile
    followers: 15  // Update credits per follower
  },
  minChargePerRequest: 15,    // Minimum charge
  listFunctionCharge: 150,    // List function charge
  bulkDataThreshold: 10       // Items to waive min chargeICING = {
  basic: {
    monthlyFee: 9,            // Update monthly subscription
    includedRequests: 1000,   // Update included requests
    costPerExtraRequest: 0.01 // Update per-request overage
  }
  // ... other tiers
};
```

## Differences from LLM Tracker

| Feature | LLM Tracker | Twitter API Tracker |Items returned, endpoints, data types |
| **Cost Basis** | Per token (input/output) | Per item returned (tweets/profiles/followers) |
| **Data Location** | `ai_languageModel` field | HTTP node data |
| **Pricing Model** | Pay-per-token | Pay-as-you-go credits (no subscriptions)nts, response size |
| **Cost Basis** | Per token (input/output) | Per request + monthly fees |
| **Data Location** | `ai_languageModel` field | HTTP node data |
| **Pricing Model** | Pay-per-token | Tiered subscription + overages |

## Integration Tips

### Combining Both Trackers
Create a workflow that:
1. Gets execution data
2. Splits into two branches:
   - Branch A: LLM usage tracker
   - Branch B: Twitter API tracker
3. Merges results for combined cost analysis

### Monitoring Multiple Workflows
Set up a scheduled workflow:
1. Fetch all executions from last 24 hours
2. Run Twitter tracker on each
3. Aggregate results
4. Store in database/spreadsheet
5. Alert if costs exceed threshold

### Cost Aletotal cost > $0.10
const costUSD = parseFloat($json.cost_analysis.total_cost_usd);
if (costUSD > 0.1
```javascript
// Alert if estimated monthly cost > $50
if ($json.estimated_monthly_cost > 50) {
  // Send notification
}
```

## Example Use Cases

1. **Cost Forecasting**: Run thigh-cost endpoints (profiles cost 20% more than tweets)
3. **Credit Budgeting**: Monitor credit burn rate and plan recharges
4. **Bulk Data Detection**: Verify bulk responses to ensure minimum charges are waived
5. **Endpoint Analysis**: Identify which workflow nodes return the most items
6. **Data Type Insights**: See if you're fetching more tweets vs profiles to optimize cost
5. **Endpoint Analysis**: Identify which workflow nodes make the most API calls

## Troubleshooting

### No API calls detected
- Ensure HTTP nodes include "twitter" in URL
- Check node names contain "http" or "twitter"
- Verify execution data structure matches expected format
 (15/18/15 credits)
- Check if item counts are being detected correctly
- Confirm data type detection matches your API responses
- Verify bulk data threshold (10+ items) to check if min charge is waivedING` matches current rates
- Check if your tier includes different overage rates
- Confirm request counts are accurate

### Missing endpoints
- Add new endpoint patterns to `categorizeEndpoint()` function
- Check for API v1 vs v2 endpoint differences
 (200 QPS per client)
- [ ] Failed request analysis
- [ ] Historical cost trending
- [ ] Credit balance monitoring
- [ ] Bonus credit expiration warnings (30-day validity)
- [ ] Response time metrics (avg 700ms)
- [ ] Recharge recommendations based on usage patterns
- [ ] Student/research discount eligibility checkerakdown
- [ ] Response time metrics
- [ ] Webhook usage tracking
- [ ] Cache hit/miss ratios

## Related Files
- `updated_find_nodes_with_llm_use.js` - LLM usage tracker
- `example output.txt` - Sample LLM tracker output
- `simplify_output_for_storage_code_node.js` - Data compression utilities
