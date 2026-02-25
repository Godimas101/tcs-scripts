/**
 * n8n JavaScript Code - Track twitterapi.io usage and costs
 * 
 * Detects Twitter API calls in workflow execution data and calculates:
 * - Total API calls and items returned
 * - Credit usage and costs (pay-as-you-go pricing)
 * - Per-endpoint breakdown
 * - Cost analysis by data type (tweets, profiles, followers)
 */

// Get the input data - this comes from "Get an execution" node
const inputData = $input.first().json;

// Extract workflow metadata
const workflowName = inputData.workflowData?.name || 'Unknown Workflow';
const workflowId = inputData.workflowData?.id || '';
const executionId = inputData.id || '';
const executionStatus = inputData.status || '';
const startedAt = inputData.startedAt || '';
const stoppedAt = inputData.stoppedAt || '';

// Navigate to runData
const runData = inputData.resultData?.runData || 
                inputData.data?.resultData?.runData || 
                inputData.runData;

if (!runData) {
  return [{
    json: {
      error: "Could not find runData in input",
      hint: "Check if path to runData is correct"
    }
  }];
}

// Twitter API pricing structure (twitterapi.io)
// Pay-as-you-go credit system: 1 USD = 100,000 Credits
const TWITTER_API_PRICING = {
  creditsPerUSD: 100000,
  
  // Per-item pricing (credits per returned item)
  perItem: {
    tweets: 15,      // 15 credits per tweet ($0.15 per 1K tweets)
    profiles: 18,    // 18 credits per user profile ($0.18 per 1K profiles)
    followers: 15,   // 15 credits per follower ($0.15 per 1K followers)
    following: 15    // Same as followers
  },
  
  // Minimum charges
  minChargePerRequest: 15,     // $0.00015 per API call (waived for bulk data)
  listFunctionCharge: 150,     // $0.0015 per list function call (effective Oct 1st)
  
  // Bulk data threshold (if response has this many items, min charge is waived)
  bulkDataThreshold: 10
};

// Initialize output structures
const twitter_api_calls = {};
const endpointUsage = {};

// Helper function to extract Twitter API data from HTTP node responses
function extractTwitterAPIData(nodeData, nodeName = '', execution = null) {
  const apiCalls = [];
  
  if (!nodeData || !Array.isArray(nodeData)) return apiCalls;
  
  nodeData.forEach((item, itemIdx) => {
    if (item?.json) {
      const json = item.json;
      
      // Multiple ways to detect twitterapi.io usage:
      // 1. Check response headers for twitterapi.io indicators
      const headers = item.headers || json.headers || {};
      const hasTwitterAPIHeaders = 
        headers['x-ratelimit-limit'] !== undefined ||
        headers['x-ratelimit-remaining'] !== undefined ||
        Object.keys(headers).some(h => h.toLowerCase().includes('rate-limit'));
      
      // 2. Check if response has Twitter/X data structure
      // Standard Twitter API v2: { data: [], meta: {}, includes: {} }
      // Custom wrapper format: { tweets: [], has_next_page: bool, next_cursor: string }
      const hasTwitterDataStructure = 
        json.data !== undefined || 
        json.meta !== undefined ||
        json.includes !== undefined ||
        json.tweets !== undefined;  // Custom wrapper format
      
      // 3. Check binary data metadata (for HTTP Request nodes)
      const requestUrl = item.binary?.data?.mimeType?.includes('application/json') 
        ? (item.binary?.data?.fileName || '')
        : '';
      
      // 4. Node name contains twitter or similar
      const nodeNameHasTwitter = nodeName?.toLowerCase().includes('twitter') || 
                                  nodeName?.toLowerCase().includes('x feed');
      
      const isTwitterAPI = 
        hasTwitterAPIHeaders ||
        (hasTwitterDataStructure && nodeNameHasTwitter) ||
        requestUrl.includes('twitterapi.io');
      
      if (isTwitterAPI) {
        // Count returned items to calculate cost
        let itemCount = 0;
        let dataType = 'unknown';
        
        // Detect data type and count items
        // Custom wrapper format: { tweets: [...], has_next_page: bool, next_cursor: string }
        if (json.tweets && Array.isArray(json.tweets)) {
          itemCount = json.tweets.length;
          dataType = 'tweets';
        }
        // Twitter API v2 structure: { data: [...], meta: {...} }
        else if (json.data) {
          if (Array.isArray(json.data)) {
            itemCount = json.data.length;
            
            // Try to detect type from data structure
            const firstItem = json.data[0];
            if (firstItem) {
              // Tweets have 'text', 'id', 'created_at', 'author_id'
              if (firstItem.text !== undefined || firstItem.tweet_id !== undefined) {
                dataType = 'tweets';
              } 
              // Users have 'username', 'name', 'id'
              else if (firstItem.username !== undefined || firstItem.name !== undefined) {
                dataType = 'profiles';
              }
              // Followers/Following have user data
              else if (firstItem.follower_id !== undefined || firstItem.following_id !== undefined) {
                dataType = 'followers';
              }
            }
          } 
          // Nested structure
          else if (typeof json.data === 'object') {
            if (json.data.tweets) {
              itemCount = Array.isArray(json.data.tweets) ? json.data.tweets.length : 1;
              dataType = 'tweets';
            } else if (json.data.users) {
              itemCount = Array.isArray(json.data.users) ? json.data.users.length : 1;
              dataType = 'profiles';
            } else if (json.data.followers) {
              itemCount = Array.isArray(json.data.followers) ? json.data.followers.length : 1;
              dataType = 'followers';
            }
          }
        }
        
        // Try to infer from node name if still unknown
        if (dataType === 'unknown' && nodeName) {
          const nameLower = nodeName.toLowerCase();
          if (nameLower.includes('tweet') || nameLower.includes('x feed') || nameLower.includes('post')) {
            dataType = 'tweets';
          } else if (nameLower.includes('user') || nameLower.includes('profile')) {
            dataType = 'profiles';
          } else if (nameLower.includes('follower')) {
            dataType = 'followers';
          }
        }
        
        // Check meta for pagination info (helps confirm it's Twitter API)
        const hasMeta = json.meta !== undefined;
        const hasIncludes = json.includes !== undefined;
        const isTwitterV2Response = hasMeta || hasIncludes;
        
        // Extract URL from various sources
        let apiUrl = 'twitterapi.io';
        if (json.url) {
          apiUrl = json.url;
        } else if (execution?.source?.[0]?.main?.[0]?.json?.url) {
          apiUrl = execution.source[0].main[0].json.url;
        }
        
        // Check if this is a list function
        const isListFunction = apiUrl.toLowerCase().includes('/list');
        
        apiCalls.push({
          url: apiUrl,
          method: json.method || 'GET',
          statusCode: json.status || json.statusCode || 200,
          headers: item.headers || json.headers || {},
          responseSize: JSON.stringify(json).length,
          timestamp: new Date().toISOString(),
          dataType: dataType,
          itemCount: itemCount,
          isListFunction: isListFunction,
          isTwitterV2: isTwitterV2Response,
          itemIndex: itemIdx
        });
      }
    }
  });
  
  return apiCalls;
}

// Helper function to categorize Twitter API endpoints
function categorizeEndpoint(url) {
  if (!url) return 'unknown';
  
  const urlLower = url.toLowerCase();
  
  // Categorize by common Twitter API v2 endpoints
  if (urlLower.includes('/tweet')) return 'tweets';
  if (urlLower.includes('/user')) return 'users';
  if (urlLower.includes('/space')) return 'spaces';
  if (urlLower.includes('/list')) return 'lists';
  if (urlLower.includes('/direct_message')) return 'dm';
  if (urlLower.includes('/search')) return 'search';
  if (urlLower.includes('/media')) return 'media';
  if (urlLower.includes('/timeline')) return 'timeline';
  if (urlLower.includes('/mention')) return 'mentions';
  if (urlLower.includes('/follower')) return 'followers';
  if (urlLower.includes('/following')) return 'following';
  
  return 'other';
}

// Helper function to calculate credits for an API call
function calculateCallCredits(call) {
  const pricing = TWITTER_API_PRICING;
  
  // List functions have special pricing
  if (call.isListFunction) {
    return pricing.listFunctionCharge;
  }
  
  // Calculate based on returned items
  let itemCredits = 0;
  if (call.itemCount > 0 && call.dataType !== 'unknown') {
    const creditsPerItem = pricing.perItem[call.dataType] || pricing.perItem.tweets;
    itemCredits = call.itemCount * creditsPerItem;
  }
  
  // Apply minimum charge (waived for bulk data)
  const isBulkData = call.itemCount >= pricing.bulkDataThreshold;
  const minCharge = isBulkData ? 0 : pricing.minChargePerRequest;
  
  return Math.max(itemCredits, minCharge);
}

// Process each node
Object.keys(runData).forEach(nodeName => {
  const nodeExecutions = runData[nodeName];
  
  // Process each execution in the node's array
  nodeExecutions.forEach((execution, idx) => {
    // Look for Twitter API calls in node data
    // Check main data
    if (execution.data?.main && execution.data.main[0]) {
      // execution.data.main is a 2D array: [outputBranch][items]
      // execution.data.main[0] = array of items from main output
      const apiCalls = extractTwitterAPIData(execution.data.main[0], nodeName, execution);
      apiCalls.forEach((call, callIdx) => {
        const key = `twitter_${nodeName}_${idx}_${callIdx}`;
        twitter_api_calls[key] = {
          ...call,
          nodeName: nodeName,
          executionIndex: idx
        };
        
        // Track endpoint usage
        const endpoint = categorizeEndpoint(call.url);
        if (!endpointUsage[endpoint]) {
          endpointUsage[endpoint] = {
            count: 0,
            methods: {},
            totalResponseSize: 0,
            totalItems: 0,
            totalCredits: 0,
            dataTypes: {}
          };
        }
        endpointUsage[endpoint].count++;
        endpointUsage[endpoint].totalResponseSize += call.responseSize;
        endpointUsage[endpoint].totalItems += call.itemCount || 0;
        
        const method = call.method || 'GET';
        endpointUsage[endpoint].methods[method] = 
          (endpointUsage[endpoint].methods[method] || 0) + 1;
        
        // Track data types
        if (call.dataType !== 'unknown') {
          endpointUsage[endpoint].dataTypes[call.dataType] = 
            (endpointUsage[endpoint].dataTypes[call.dataType] || 0) + 1;
        }
        
        // Calculate credits for this call
        const credits = calculateCallCredits(call);
        endpointUsage[endpoint].totalCredits += credits;
      });
    }
  });
});

// Calculate total API calls and costs
const totalCalls = Object.keys(twitter_api_calls).length;
const totalResponseSize = Object.values(endpointUsage)
  .reduce((sum, ep) => sum + ep.totalResponseSize, 0);

// Calculate total credits used
let totalCredits = 0;
let totalItems = 0;
const itemTypeBreakdown = {
  tweets: { count: 0, credits: 0 },
  profiles: { count: 0, credits: 0 },
  followers: { count: 0, credits: 0 },
  following: { count: 0, credits: 0 }
};

// Calculate credits for each call
Object.values(twitter_api_calls).forEach(call => {
  const credits = calculateCallCredits(call);
  totalCredits += credits;
  
  if (call.dataType !== 'unknown' && call.itemCount > 0) {
    totalItems += call.itemCount;
    if (itemTypeBreakdown[call.dataType]) {
      itemTypeBreakdown[call.dataType].count += call.itemCount;
      itemTypeBreakdown[call.dataType].credits += credits;
    }
  }
});

// Convert credits to USD
const totalCostUSD = totalCredits / TWITTER_API_PRICING.creditsPerUSD;

// Calculate average cost per call and per item
const avgCostPerCall = totalCalls > 0 ? totalCostUSD / totalCalls : 0;
const avgCostPerItem = totalItems > 0 ? totalCostUSD / totalItems : 0;

// Calculate cost breakdown by data type
const costByDataType = {};
Object.keys(itemTypeBreakdown).forEach(type => {
  const data = itemTypeBreakdown[type];
  if (data.count > 0) {
    costByDataType[type] = {
      items: data.count,
      credits: data.credits,
      costUSD: (data.credits / TWITTER_API_PRICING.creditsPerUSD).toFixed(6),
      avgCreditsPerItem: (data.credits / data.count).toFixed(2),
      avgCostPerItem: ((data.credits / TWITTER_API_PRICING.creditsPerUSD) / data.count).toFixed(6)
    };
  }
});

// Return the extracted data WITH workflow metadata
return [{
  json: {
    // Workflow metadata
    workflow_name: workflowName,
    workflow_id: workflowId,
    execution_id: executionId,
    execution_status: executionStatus,
    started_at: startedAt,
    stopped_at: stoppedAt,
    
    // Twitter API usage data
    twitter_api_calls: twitter_api_calls,
    
    // Usage statistics
    usage_summary: {
      total_api_calls: totalCalls,
      total_items_returned: totalItems,
      total_response_size_bytes: totalResponseSize,
      endpoints_used: Object.keys(endpointUsage).length,
      endpoint_breakdown: endpointUsage
    },
    
    // Cost analysis (pay-as-you-go)
    cost_analysis: {
      total_credits: totalCredits,
      total_cost_usd: totalCostUSD.toFixed(6),
      average_cost_per_call: avgCostPerCall.toFixed(6),
      average_cost_per_item: avgCostPerItem.toFixed(6),
      cost_by_data_type: costByDataType,
      item_type_breakdown: itemTypeBreakdown
    },
    
    // Pricing reference for transparency
    pricing_reference: {
      credits_per_usd: TWITTER_API_PRICING.creditsPerUSD,
      per_item_credits: TWITTER_API_PRICING.perItem,
      minimum_charge_credits: TWITTER_API_PRICING.minChargePerRequest,
      list_function_credits: TWITTER_API_PRICING.listFunctionCharge,
      bulk_data_threshold: TWITTER_API_PRICING.bulkDataThreshold,
      notes: [
        "Pay-as-you-go: No subscription fees",
        "Recharged credits never expire",
        "Bonus credits with recharges (valid 30 days)",
        "Minimum charge waived for bulk data responses"
      ]
    }
  }
}];
