/**
 * n8n JavaScript Code - Track scraperapi.io usage and costs
 * 
 * Detects ScraperAPI calls in workflow execution data and calculates:
 * - Total API calls and credits used
 * - Credit usage breakdown by feature type
 * - Remaining credits in billing cycle
 * - Cost analysis and warnings for free tier limits
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

// ScraperAPI pricing structure (scraperapi.io)
// Free tier: 1,000 credits/month
const SCRAPERAPI_PRICING = {
  plans: {
    free: {
      credits: 1000,
      costUSD: 0,
      concurrentRequests: 1
    },
    hobby: {
      credits: 100000,
      costUSD: 49,
      concurrentRequests: 10
    },
    startup: {
      credits: 1000000,
      costUSD: 149,
      concurrentRequests: 25
    },
    business: {
      credits: 3000000,
      costUSD: 299,
      concurrentRequests: 50
    }
  },
  
  // Per-request credit costs
  baseCost: 1,              // Base cost per request
  
  // Feature multipliers
  features: {
    js_render: 5,           // JavaScript rendering (5x credits)
    premium_proxy: 10,      // Premium/residential proxies (10x credits)
    geotargeting: 1,        // No extra cost
    custom_headers: 1       // No extra cost
  },
  
  // Additional features
  autoparse: {
    enabled: false,         // AutoParse costs extra
    baseMultiplier: 50      // 50x credits when enabled
  }
};

// Initialize output structures
const scraperapi_calls = {};
const featureUsage = {};

// Helper function to extract ScraperAPI data from HTTP node responses
function extractScraperAPIData(nodeData, nodeName = '', execution = null) {
  const apiCalls = [];
  
  if (!nodeData || !Array.isArray(nodeData)) return apiCalls;
  
  nodeData.forEach((item, itemIdx) => {
    if (item?.json) {
      const json = item.json;
      
      // Multiple ways to detect scraperapi.io usage:
      // 1. Check request URL contains scraperapi.com or api.scraperapi.com
      const requestUrl = json.requestUrl || 
                        json.url || 
                        item.binary?.data?.fileName || 
                        '';
      
      // 2. Check response headers for scraperapi indicators
      const headers = item.headers || json.headers || {};
      const hasScraperAPIHeaders = 
        headers['x-scraperapi-credits-remaining'] !== undefined ||
        headers['x-scraperapi-credit-cost'] !== undefined ||
        Object.keys(headers).some(h => h.toLowerCase().includes('scraperapi'));
      
      // 3. Check if node name contains scraperapi or similar
      const nodeNameHasScraper = nodeName?.toLowerCase().includes('scraper') || 
                                  nodeName?.toLowerCase().includes('scrape') ||
                                  nodeName?.toLowerCase().includes('scraperapi');
      
      // 4. Check query parameters for api_key or scraperapi indicators
      const hasScraperAPIParams = requestUrl.includes('api_key=') ||
                                  requestUrl.includes('scraperapi.com') ||
                                  requestUrl.includes('api.scraperapi.com');
      
      const isScraperAPI = 
        hasScraperAPIHeaders ||
        hasScraperAPIParams ||
        (nodeNameHasScraper && requestUrl.includes('http'));
      
      if (isScraperAPI) {
        // Extract credit usage from headers (if available)
        let creditsUsed = parseInt(headers['x-scraperapi-credit-cost']) || null;
        let creditsRemaining = parseInt(headers['x-scraperapi-credits-remaining']) || null;
        
        // Detect features used from URL parameters
        const urlParams = new URLSearchParams(requestUrl.split('?')[1] || '');
        const features = {
          js_render: urlParams.get('render') === 'true' || 
                    urlParams.get('js_render') === 'true',
          premium_proxy: urlParams.get('premium') === 'true' || 
                        urlParams.get('residential') === 'true',
          geotargeting: urlParams.get('country_code') !== null,
          autoparse: urlParams.get('autoparse') === 'true'
        };
        
        // Calculate estimated credits if not provided in headers
        if (creditsUsed === null) {
          creditsUsed = calculateEstimatedCredits(features);
        }
        
        // Extract target URL being scraped
        let targetUrl = urlParams.get('url') || 'unknown';
        if (requestUrl.includes('scraperapi.com') && !targetUrl) {
          // Alternative: check if URL is passed in body
          targetUrl = json.targetUrl || json.scrape_url || 'unknown';
        }
        
        apiCalls.push({
          url: requestUrl,
          targetUrl: targetUrl,
          method: json.method || 'GET',
          statusCode: json.status || json.statusCode || 200,
          headers: headers,
          responseSize: JSON.stringify(json).length,
          timestamp: new Date().toISOString(),
          creditsUsed: creditsUsed,
          creditsRemaining: creditsRemaining,
          features: features,
          itemIndex: itemIdx
        });
      }
    }
  });
  
  return apiCalls;
}

// Helper function to calculate estimated credits based on features
function calculateEstimatedCredits(features) {
  const pricing = SCRAPERAPI_PRICING;
  let credits = pricing.baseCost;
  
  if (features.js_render) {
    credits *= pricing.features.js_render;
  }
  
  if (features.premium_proxy) {
    credits *= pricing.features.premium_proxy;
  }
  
  if (features.autoparse) {
    credits *= pricing.autoparse.baseMultiplier;
  }
  
  return credits;
}

// Helper function to categorize scraping target
function categorizeTarget(url) {
  if (!url || url === 'unknown') return 'unknown';
  
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return 'invalid_url';
  }
}

// Process each node
Object.keys(runData).forEach(nodeName => {
  const nodeExecutions = runData[nodeName];
  
  // Process each execution in the node's array
  nodeExecutions.forEach((execution, idx) => {
    // Look for ScraperAPI calls in node data
    // Check main data
    if (execution.main && Array.isArray(execution.main)) {
      execution.main.forEach((mainOutput, outputIdx) => {
        const apiCalls = extractScraperAPIData(mainOutput, nodeName, execution);
        
        if (apiCalls.length > 0) {
          const nodeKey = `${nodeName}_exec${idx}_output${outputIdx}`;
          scraperapi_calls[nodeKey] = {
            node_name: nodeName,
            execution_index: idx,
            output_index: outputIdx,
            api_calls: apiCalls
          };
        }
      });
    }
  });
});

// Calculate summary statistics
let totalAPICalls = 0;
let totalCreditsUsed = 0;
let callsByFeature = {
  base: 0,
  js_render: 0,
  premium_proxy: 0,
  geotargeting: 0,
  autoparse: 0
};
let callsByTarget = {};
let latestCreditsRemaining = null;

Object.values(scraperapi_calls).forEach(nodeData => {
  nodeData.api_calls.forEach(call => {
    totalAPICalls++;
    totalCreditsUsed += call.creditsUsed;
    
    // Track latest credits remaining value
    if (call.creditsRemaining !== null) {
      latestCreditsRemaining = call.creditsRemaining;
    }
    
    // Track feature usage
    if (call.features.autoparse) {
      callsByFeature.autoparse++;
    } else if (call.features.premium_proxy) {
      callsByFeature.premium_proxy++;
    } else if (call.features.js_render) {
      callsByFeature.js_render++;
    } else {
      callsByFeature.base++;
    }
    
    if (call.features.geotargeting) {
      callsByFeature.geotargeting++;
    }
    
    // Track by target domain
    const target = categorizeTarget(call.targetUrl);
    if (!callsByTarget[target]) {
      callsByTarget[target] = {
        calls: 0,
        credits: 0
      };
    }
    callsByTarget[target].calls++;
    callsByTarget[target].credits += call.creditsUsed;
  });
});

// Calculate cost analysis
const freeTierLimit = SCRAPERAPI_PRICING.plans.free.credits;
const remainingCredits = latestCreditsRemaining !== null 
  ? latestCreditsRemaining 
  : freeTierLimit - totalCreditsUsed;
const percentUsed = (totalCreditsUsed / freeTierLimit * 100).toFixed(2);

// Warnings
const warnings = [];
if (totalCreditsUsed >= freeTierLimit) {
  warnings.push('⚠️ FREE TIER LIMIT EXCEEDED - Upgrade required');
} else if (totalCreditsUsed >= freeTierLimit * 0.9) {
  warnings.push('⚠️ 90% of free tier credits used');
} else if (totalCreditsUsed >= freeTierLimit * 0.75) {
  warnings.push('⚠️ 75% of free tier credits used');
}

// Build detailed output
const output = {
  workflow_name: workflowName,
  workflow_id: workflowId,
  execution_id: executionId,
  execution_status: executionStatus,
  started_at: startedAt,
  stopped_at: stoppedAt,
  
  usage_summary: {
    total_api_calls: totalAPICalls,
    total_credits_used: totalCreditsUsed,
    credits_remaining: remainingCredits,
    percent_used: percentUsed,
    free_tier_limit: freeTierLimit,
    average_credits_per_call: totalAPICalls > 0 
      ? (totalCreditsUsed / totalAPICalls).toFixed(2) 
      : 0
  },
  
  feature_breakdown: {
    base_requests: {
      calls: callsByFeature.base,
      credits_per_call: SCRAPERAPI_PRICING.baseCost,
      total_credits: callsByFeature.base * SCRAPERAPI_PRICING.baseCost
    },
    js_render: {
      calls: callsByFeature.js_render,
      credits_per_call: SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.features.js_render,
      total_credits: callsByFeature.js_render * SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.features.js_render
    },
    premium_proxy: {
      calls: callsByFeature.premium_proxy,
      credits_per_call: SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.features.premium_proxy,
      total_credits: callsByFeature.premium_proxy * SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.features.premium_proxy
    },
    geotargeting: {
      calls: callsByFeature.geotargeting,
      note: 'No extra cost - included with base request'
    },
    autoparse: {
      calls: callsByFeature.autoparse,
      credits_per_call: SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.autoparse.baseMultiplier,
      total_credits: callsByFeature.autoparse * SCRAPERAPI_PRICING.baseCost * SCRAPERAPI_PRICING.autoparse.baseMultiplier
    }
  },
  
  target_breakdown: callsByTarget,
  
  warnings: warnings,
  
  pricing_reference: {
    free_tier: SCRAPERAPI_PRICING.plans.free,
    paid_plans: {
      hobby: SCRAPERAPI_PRICING.plans.hobby,
      startup: SCRAPERAPI_PRICING.plans.startup,
      business: SCRAPERAPI_PRICING.plans.business
    },
    feature_costs: {
      base: '1 credit per request',
      js_render: '5 credits per request (5x multiplier)',
      premium_proxy: '10 credits per request (10x multiplier)',
      autoparse: '50 credits per request (50x multiplier)',
      geotargeting: 'Included - no extra cost'
    },
    notes: [
      'Free tier: 1,000 credits/month',
      'Credits reset monthly on billing cycle',
      'JavaScript rendering costs 5x base rate',
      'Premium/residential proxies cost 10x base rate',
      'AutoParse feature costs 50x base rate',
      'Dashboard: https://dashboard.scraperapi.com/billing'
    ]
  },
  
  detailed_calls: scraperapi_calls
};

// Log summary to console
console.log('=== ScraperAPI Usage Summary ===');
console.log(`Workflow: ${workflowName}`);
console.log(`Total API Calls: ${totalAPICalls}`);
console.log(`Total Credits Used: ${totalCreditsUsed}/${freeTierLimit} (${percentUsed}%)`);
console.log(`Credits Remaining: ${remainingCredits}`);
if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach(w => console.log(`  ${w}`));
}
console.log('==================================');

return [{ json: output }];
