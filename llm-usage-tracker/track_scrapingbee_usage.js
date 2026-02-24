/**
 * n8n JavaScript Code - Track ScrapingBee usage and costs
 * 
 * Detects ScrapingBee API calls in workflow execution data and calculates:
 * - Total API calls and credits consumed
 * - Usage breakdown by configuration (JS rendering, premium proxies)
 * - Remaining credits in billing cycle
 * - Cost analysis and warnings for plan limits
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

// Get workflow configuration to access node parameters
const workflowNodes = inputData.workflowData?.nodes || [];
const nodeConfigMap = {};

// Build a map of node names to their configurations
workflowNodes.forEach(node => {
  if (node.name) {
    nodeConfigMap[node.name] = node.parameters || {};
  }
});

// ScrapingBee pricing structure
// Usage measured in "API credits" - 1 credit per basic request
const SCRAPINGBEE_PRICING = {
  plans: {
    free: {
      credits: 1000,           // 1,000 API credits (one-time trial)
      costUSD: 0,
      rateLimitPerSecond: 1,
      features: ['Basic web scraping', 'Rotating proxies', 'No credit card required']
    },
    freelance: {
      credits: 250000,         // 250k credits/month
      costUSD: 49,
      rateLimitPerSecond: 10,
      features: ['All free features', 'Premium proxies', 'Priority support']
    },
    startup: {
      credits: 1000000,        // 1M credits/month
      costUSD: 99,
      rateLimitPerSecond: 50,
      features: ['All freelance features', 'Higher rate limits']
    },
    business: {
      credits: 3000000,        // 3M credits/month
      costUSD: 249,
      rateLimitPerSecond: 100,
      features: ['All startup features', 'Dedicated account manager']
    },
    business_plus: {
      credits: 8000000,        // 8M credits/month
      costUSD: 599,
      rateLimitPerSecond: 200,
      features: ['All business features', 'Team management', 'Custom quotas']
    }
  },
  
  // Credit multipliers based on features used
  creditCosts: {
    basic: 1,                  // Basic request: 1 credit
    withJS: 5,                 // JavaScript rendering: 5 credits
    premiumProxy: 10,          // Premium proxy (no JS): 10 credits
    premiumProxyWithJS: 25     // Premium proxy + JS: 25 credits
  },
  
  // Common parameter configurations
  parameterOptions: {
    render_js: {
      description: 'Execute JavaScript on page',
      creditMultiplier: 5,
      values: ['true', 'false']
    },
    premium_proxy: {
      description: 'Use premium residential proxies',
      creditMultiplier: 10,  // Base, can be 25 with JS
      values: ['true', 'false']
    },
    country_code: {
      description: 'Geotargeting (requires premium proxy)',
      requiresPremium: true
    },
    stealth_proxy: {
      description: 'Stealth mode for harder targets',
      requiresPremium: true
    },
    screenshot: {
      description: 'Take full-page screenshot',
      creditCost: 'Uses JS rendering cost (5 credits)'
    }
  }
};

// Initialize output structures
const scrapingbee_calls = {};
const configUsage = {};
const debugInfo = {
  nodeConfigs: [],
  nodesProcessed: [],
  detectionAttempts: []
};

// Helper function to parse URL parameters (URLSearchParams not available in n8n)
function parseUrlParams(url) {
  const params = {};
  if (!url || !url.includes('?')) return params;
  
  const queryString = url.split('?')[1];
  if (!queryString) return params;
  
  queryString.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[key] = value ? decodeURIComponent(value) : '';
    }
  });
  
  return params;
}

// Helper function to extract ScrapingBee data from HTTP node responses
function extractScrapingBeeData(nodeData, nodeName = '', nodeConfig = null) {
  const apiCalls = [];
  
  if (!nodeData || !Array.isArray(nodeData)) return apiCalls;
  
  // Get node configuration URL (remove n8n expression prefix = if present)
  let configUrl = nodeConfig?.url || '';
  if (configUrl.startsWith('=')) {
    configUrl = configUrl.substring(1);
  }
  
  nodeData.forEach((item, itemIdx) => {
    if (item?.json) {
      const json = item.json;
      
      // Get response headers (ScrapingBee uses Spb-* headers)
      // Headers can be in different locations depending on response format
      const headers = item.headers || json.headers || {};
      
      // Check if this is a ScrapingBee call by looking for Spb-* headers or scrapingbee.com URL
      const hasScrapingBeeHeaders = 
        headers['Spb-cost'] !== undefined ||
        headers['spb-cost'] !== undefined ||
        Object.keys(headers).some(h => h.toLowerCase().startsWith('spb-'));
      
      const configHasScrapingBee = configUrl.includes('scrapingbee.com') ||
                                   configUrl.includes('app.scrapingbee.com');
      
      const nodeNameHasScrapingBee = nodeName?.toLowerCase().includes('scrapingbee') ||
                                      nodeName?.toLowerCase().includes('scraping bee');
      
      // Debug logging
      if (nodeName && (nodeNameHasScrapingBee || configHasScrapingBee)) {
        const detectionDebug = {
          nodeName: nodeName,
          itemIndex: itemIdx,
          configUrl: configUrl,
          hasScrapingBeeHeaders: hasScrapingBeeHeaders,
          configHasScrapingBee: configHasScrapingBee,
          nodeNameHasScrapingBee: nodeNameHasScrapingBee,
          headerKeys: Object.keys(headers),
          jsonKeys: Object.keys(json)
        };
        
        console.log(`      DEBUG item ${itemIdx}:`);
        console.log(`        configUrl: ${configUrl}`);
        console.log(`        hasScrapingBeeHeaders: ${hasScrapingBeeHeaders}`);
        console.log(`        configHasScrapingBee: ${configHasScrapingBee}`);
        
        debugInfo.detectionAttempts.push(detectionDebug);
      }
      
      const isScrapingBee = configHasScrapingBee || 
                            (hasScrapingBeeHeaders && (nodeNameHasScrapingBee || configHasScrapingBee));
      
      if (isScrapingBee) {
        // Extract credit cost from Spb-cost header (case-insensitive)
        let creditsUsed = 1; // Default to 1 credit
        const costHeader = headers['Spb-cost'] || headers['spb-cost'] || 
                          headers['SPB-COST'] || headers['Spb-Cost'];
        
        if (costHeader) {
          creditsUsed = parseInt(costHeader);
        }
        
        // Extract other ScrapingBee headers
        const initialStatusCode = headers['Spb-initial-status-code'] || 
                                  headers['spb-initial-status-code'] || 'unknown';
        const resolvedUrl = headers['Spb-resolved-url'] || 
                           headers['spb-resolved-url'] || 'unknown';
        
        // Parse URL parameters from config URL
        let targetUrl = 'unknown';
        let renderJs = false;
        let premiumProxy = false;
        let countryCode = null;
        let screenshot = false;
        
        if (configUrl.includes('?')) {
          // Extract parameters from URL using custom parser
          const params = parseUrlParams(configUrl);
          targetUrl = params.url || 'unknown';
          renderJs = params.render_js === 'true';
          premiumProxy = params.premium_proxy === 'true';
          countryCode = params.country_code || null;
          screenshot = params.screenshot === 'true' || params.screenshot_full_page === 'true';
        }
        
        // Determine configuration type
        let configurationType = 'basic';
        if (premiumProxy && renderJs) {
          configurationType = 'premium_with_js';
        } else if (premiumProxy) {
          configurationType = 'premium';
        } else if (renderJs || screenshot) {
          configurationType = 'with_js';
        }
        
        // Calculate response size
        const dataField = json.data || json.html || json.body || '';
        const responseSize = typeof dataField === 'string' ? dataField.length : 
                           (item.binary ? '(binary data)' : JSON.stringify(json).length);
        
        apiCalls.push({
          url: configUrl,
          targetUrl: targetUrl,
          resolvedUrl: resolvedUrl,
          creditsUsed: creditsUsed,
          configurationType: configurationType,
          renderJs: renderJs,
          premiumProxy: premiumProxy,
          countryCode: countryCode,
          screenshot: screenshot,
          statusCode: json.status || json.statusCode || initialStatusCode,
          responseSize: responseSize,
          timestamp: new Date().toISOString(),
          itemIndex: itemIdx
        });
      }
    }
  });
  
  return apiCalls;
}

// Helper function to categorize target domain
function categorizeTarget(url) {
  if (!url || url === 'unknown') return 'unknown';
  
  try {
    // Handle n8n expressions like {{ $node["..."].json.field }}
    if (url.includes('{{') || url.includes('$node')) {
      return 'dynamic_expression';
    }
    
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return 'invalid_url';
  }
}

// Debug: Log node configuration map
console.log('=== DEBUG: Node Config Map ===');
console.log('Total nodes in config:', Object.keys(nodeConfigMap).length);
Object.keys(nodeConfigMap).forEach(name => {
  const url = nodeConfigMap[name]?.url || 'no url';
  console.log(`  ${name}: ${url}`);
  debugInfo.nodeConfigs.push({
    nodeName: name,
    url: url,
    method: nodeConfigMap[name]?.method || 'unknown'
  });
});

// Process each node
Object.keys(runData).forEach(nodeName => {
  const nodeExecutions = runData[nodeName];
  const nodeConfig = nodeConfigMap[nodeName] || null;
  
  const nodeDebug = {
    nodeName: nodeName,
    configUrl: nodeConfig?.url || 'none',
    executionCount: nodeExecutions.length,
    outputs: []
  };
  
  // Debug logging
  console.log(`\n=== Processing node: ${nodeName} ===`);
  console.log(`  Config URL: ${nodeConfig?.url || 'none'}`);
  console.log(`  Executions: ${nodeExecutions.length}`);
  
  // Process each execution in the node's array
  nodeExecutions.forEach((execution, idx) => {
    // n8n stores data in execution.data.main, NOT execution.main
    const mainData = execution.data?.main || execution.main;
    
    // Debug execution structure
    const execDebug = {
      executionIndex: idx,
      hasMain: !!mainData,
      isMainArray: Array.isArray(mainData),
      mainLength: Array.isArray(mainData) ? mainData.length : 'N/A'
    };
    
    nodeDebug.executionStructure = nodeDebug.executionStructure || [];
    nodeDebug.executionStructure.push(execDebug);
    
    console.log(`  Execution ${idx}:`, JSON.stringify(execDebug, null, 2));
    
    // Look for ScrapingBee calls in node data
    if (mainData && Array.isArray(mainData)) {
      mainData.forEach((mainOutput, outputIdx) => {
        console.log(`  Output ${outputIdx}: ${mainOutput?.length || 0} items`);
        
        const outputDebug = {
          outputIndex: outputIdx,
          itemCount: mainOutput?.length || 0,
          firstItemKeys: [],
          detectedCalls: 0
        };
        
        if (mainOutput && mainOutput.length > 0) {
          const firstItem = mainOutput[0];
          const firstItemKeys = Object.keys(firstItem.json || {});
          outputDebug.firstItemKeys = firstItemKeys;
          console.log(`    First item keys: ${firstItemKeys.join(', ')}`);
        }
        
        const apiCalls = extractScrapingBeeData(mainOutput, nodeName, nodeConfig);
        outputDebug.detectedCalls = apiCalls.length;
        
        console.log(`  → Found ${apiCalls.length} ScrapingBee calls`);
        
        if (apiCalls.length > 0) {
          const nodeKey = `${nodeName}_exec${idx}_output${outputIdx}`;
          scrapingbee_calls[nodeKey] = {
            node_name: nodeName,
            execution_index: idx,
            output_index: outputIdx,
            api_calls: apiCalls
          };
        }
        
        nodeDebug.outputs.push(outputDebug);
      });
    } else {
      console.log(`  ⚠️ No valid execution.main found`);
    }
  });
  
  debugInfo.nodesProcessed.push(nodeDebug);
});

// Calculate summary statistics
let totalAPICalls = 0;
let totalCreditsUsed = 0;
let callsByConfig = {};
let callsByTarget = {};

Object.values(scrapingbee_calls).forEach(nodeData => {
  nodeData.api_calls.forEach(call => {
    totalAPICalls++;
    totalCreditsUsed += call.creditsUsed;
    
    // Track by configuration type
    if (!callsByConfig[call.configurationType]) {
      callsByConfig[call.configurationType] = {
        calls: 0,
        credits: 0,
        avgCreditsPerCall: 0
      };
    }
    callsByConfig[call.configurationType].calls++;
    callsByConfig[call.configurationType].credits += call.creditsUsed;
    
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

// Calculate averages for configurations
Object.keys(callsByConfig).forEach(config => {
  const data = callsByConfig[config];
  data.avgCreditsPerCall = (data.credits / data.calls).toFixed(2);
});

// Determine current plan and limits
// Assume free tier unless we can detect otherwise
const currentPlan = 'free';
const planLimit = SCRAPINGBEE_PRICING.plans[currentPlan].credits;
const remainingCredits = planLimit - totalCreditsUsed;
const percentUsed = (totalCreditsUsed / planLimit * 100).toFixed(2);

// Warnings
const warnings = [];
if (totalCreditsUsed >= planLimit) {
  warnings.push('⚠️ PLAN LIMIT EXCEEDED - Requests may fail');
} else if (totalCreditsUsed >= planLimit * 0.9) {
  warnings.push('⚠️ 90% of plan credits used');
} else if (totalCreditsUsed >= planLimit * 0.75) {
  warnings.push('⚠️ 75% of plan credits used');
}

// Check if using premium features on free tier
if (currentPlan === 'free') {
  const hasPremiumCalls = Object.values(scrapingbee_calls).some(nodeData =>
    nodeData.api_calls.some(call => call.premiumProxy)
  );
  if (hasPremiumCalls) {
    warnings.push('ℹ️ Using premium proxies - high credit consumption');
  }
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
    plan_limit: planLimit,
    current_plan: currentPlan,
    average_credits_per_call: totalAPICalls > 0 
      ? (totalCreditsUsed / totalAPICalls).toFixed(2) 
      : 0
  },
  
  configuration_breakdown: callsByConfig,
  
  target_breakdown: callsByTarget,
  
  warnings: warnings,
  
  debug_info: {
    total_nodes_configured: debugInfo.nodeConfigs.length,
    total_nodes_processed: debugInfo.nodesProcessed.length,
    total_detection_attempts: debugInfo.detectionAttempts.length,
    node_configurations: debugInfo.nodeConfigs,
    nodes_processed: debugInfo.nodesProcessed,
    detection_attempts: debugInfo.detectionAttempts,
    hint: "Check node_configurations for URLs found, nodes_processed for what was analyzed, and detection_attempts for detailed checks"
  },
  
  pricing_reference: {
    current_plan_details: SCRAPINGBEE_PRICING.plans[currentPlan],
    available_plans: SCRAPINGBEE_PRICING.plans,
    credit_costs: {
      basic: `${SCRAPINGBEE_PRICING.creditCosts.basic} credit (standard request)`,
      with_js: `${SCRAPINGBEE_PRICING.creditCosts.withJS} credits (JavaScript rendering)`,
      premium_proxy: `${SCRAPINGBEE_PRICING.creditCosts.premiumProxy} credits (premium proxy, no JS)`,
      premium_with_js: `${SCRAPINGBEE_PRICING.creditCosts.premiumProxyWithJS} credits (premium proxy + JS)`
    },
    parameter_guide: SCRAPINGBEE_PRICING.parameterOptions,
    notes: [
      'Usage measured in API credits',
      'Free tier: 1,000 credits (trial, no credit card)',
      'Credits reset monthly on billing cycle',
      'JavaScript rendering costs 5× base rate',
      'Premium proxies cost 10× base rate (25× with JS)',
      'Geotargeting requires premium proxies',
      'Dashboard: https://www.scrapingbee.com/dashboard'
    ]
  },
  
  detailed_calls: scrapingbee_calls
};

// Log summary to console
console.log('=== ScrapingBee Usage Summary ===');
console.log(`Workflow: ${workflowName}`);
console.log(`Total API Calls: ${totalAPICalls}`);
console.log(`Total Credits Used: ${totalCreditsUsed} credits`);
console.log(`Limit: ${planLimit} credits - ${percentUsed}% used`);
console.log(`Remaining: ${remainingCredits} credits`);
if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach(w => console.log(`  ${w}`));
}
console.log('===================================');

return [{ json: output }];
