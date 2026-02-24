/**
 * n8n JavaScript Code - Track browserless.io usage and costs
 * 
 * Detects Browserless calls in workflow execution data and calculates:
 * - Total API calls and session time
 * - Usage breakdown by endpoint type
 * - Remaining units in billing cycle
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

// Browserless.io pricing structure
// Usage measured in "units" - 1 unit = 1 second of session time
const BROWSERLESS_PRICING = {
  plans: {
    free: {
      units: 6000,           // 100 minutes/month (6000 seconds)
      costUSD: 0,
      concurrentSessions: 2,
      features: ['Basic browser automation', 'No credit card required']
    },
    starter: {
      units: 360000,         // 6000 minutes/month (100 hours)
      costUSD: 29,
      concurrentSessions: 5,
      features: ['All free features', 'Priority support', 'Custom fonts']
    },
    business: {
      units: 1800000,        // 30000 minutes/month (500 hours)
      costUSD: 99,
      concurrentSessions: 10,
      features: ['All starter features', 'Dedicated resources', 'SLA']
    },
    enterprise: {
      units: 'Custom',
      costUSD: 'Custom',
      concurrentSessions: 'Custom',
      features: ['All business features', 'Custom deployment', 'White glove support']
    }
  },
  
  // Endpoint types and typical costs
  endpoints: {
    screenshot: {
      description: 'Take screenshots of webpages',
      estimatedSeconds: 5,        // Typical execution time
      path: '/screenshot'
    },
    content: {
      description: 'Get HTML/text content',
      estimatedSeconds: 3,
      path: '/content'
    },
    pdf: {
      description: 'Generate PDF from webpage',
      estimatedSeconds: 8,
      path: '/pdf'
    },
    scrape: {
      description: 'Scrape structured data',
      estimatedSeconds: 5,
      path: '/scrape'
    },
    function: {
      description: 'Execute custom JavaScript',
      estimatedSeconds: 10,
      path: '/function'
    },
    download: {
      description: 'Download files',
      estimatedSeconds: 15,
      path: '/download'
    },
    chrome: {
      description: 'Chrome DevTools Protocol',
      estimatedSeconds: 30,       // CDP sessions can be longer
      path: '/chrome'
    },
    chromium: {
      description: 'Chromium browser session',
      estimatedSeconds: 30,
      path: '/chromium'
    }
  },
  
  // Unit calculation (seconds)
  unitsPerSecond: 1
};

// Initialize output structures
const browserless_calls = {};
const endpointUsage = {};
const debugInfo = {
  nodeConfigs: [],
  nodesProcessed: [],
  detectionAttempts: []
};

// Helper function to extract Browserless data from HTTP node responses
function extractBrowserlessData(nodeData, nodeName = '', nodeConfig = null) {
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
      
      // Multiple ways to detect browserless.io usage:
      // 1. Check if response contains browserless HTML content indicators
      const hasBrowserlessContent = 
        json.data !== undefined || 
        json.article !== undefined ||
        json.body !== undefined;
      
      // 2. Check response headers for browserless indicators
      const headers = item.headers || json.headers || {};
      const hasBrowserlessHeaders = 
        headers['x-response-code'] !== undefined ||
        headers['x-response-url'] !== undefined ||
        Object.keys(headers).some(h => h.toLowerCase().includes('x-response'));
      
      // 3. Check if node name contains browserless indicators
      const nodeNameHasBrowserless = nodeName?.toLowerCase().includes('browserless') || 
                                      nodeName?.toLowerCase().includes('browser') ||
                                      nodeName?.toLowerCase().includes('article scrape') ||
                                      nodeName?.toLowerCase().includes('scrape');
      
      // 4. Check configured URL for browserless
      const configHasBrowserless = configUrl.includes('browserless.io') ||
                                   configUrl.includes('chrome.browserless.io');
      
      // Debug logging
      if (nodeName && nodeName.toLowerCase().includes('scrape')) {
        const detectionDebug = {
          nodeName: nodeName,
          itemIndex: itemIdx,
          configUrl: configUrl,
          hasBrowserlessContent: hasBrowserlessContent,
          hasBrowserlessHeaders: hasBrowserlessHeaders,
          nodeNameHasBrowserless: nodeNameHasBrowserless,
          configHasBrowserless: configHasBrowserless,
          headerKeys: Object.keys(headers),
          jsonKeys: Object.keys(json)
        };
        
        console.log(`      DEBUG item ${itemIdx}:`);
        console.log(`        configUrl: ${configUrl}`);
        console.log(`        hasBrowserlessContent: ${hasBrowserlessContent}`);
        console.log(`        hasBrowserlessHeaders: ${hasBrowserlessHeaders}`);
        console.log(`        nodeNameHasBrowserless: ${nodeNameHasBrowserless}`);
        console.log(`        configHasBrowserless: ${configHasBrowserless}`);
        
        debugInfo.detectionAttempts.push(detectionDebug);
      }
      
      const isBrowserless = 
        (configHasBrowserless) ||
        (hasBrowserlessHeaders && hasBrowserlessContent) ||
        (nodeNameHasBrowserless && hasBrowserlessContent && configHasBrowserless);
      
      if (isBrowserless) {
        // Use configured URL as the request URL
        const requestUrl = configUrl || 'unknown';
        
        // Determine endpoint type from URL
        let endpointType = 'unknown';
        let estimatedUnits = 5; // Default estimate
        
        for (const [type, config] of Object.entries(BROWSERLESS_PRICING.endpoints)) {
          if (requestUrl.includes(config.path)) {
            endpointType = type;
            estimatedUnits = config.estimatedSeconds;
            break;
          }
        }
        
        // Try to extract actual session time from headers or response
        let actualUnits = null;
        if (headers['x-session-time']) {
          actualUnits = parseInt(headers['x-session-time']);
        } else if (json.sessionTime) {
          actualUnits = parseInt(json.sessionTime);
        } else if (json.duration) {
          actualUnits = parseInt(json.duration);
        }
        
        // Use actual time if available, otherwise use estimate
        const unitsUsed = actualUnits !== null ? actualUnits : estimatedUnits;
        
        // Check if URL contains token parameter (URLSearchParams not available in n8n)
        const hasToken = requestUrl.includes('token=');
        
        // Get request body from node config if available
        const requestBody = nodeConfig?.jsonBody ? 
          (typeof nodeConfig.jsonBody === 'string' ? {} : nodeConfig.jsonBody) : 
          {};
        
        const options = {
          token: hasToken ? '[PRESENT]' : '[NOT FOUND]',
          waitFor: requestBody.waitFor || requestBody.gotoOptions?.waitUntil || null,
          timeout: requestBody.timeout || null,
          viewport: requestBody.viewport || null,
          userAgent: requestBody.userAgent || null,
          blockAds: requestBody.blockAds === true,
          stealth: requestBody.stealth === true
        };
        
        // Extract target URL from the request body (if in node config) or response
        // Browserless requests typically have { "url": "target" } in the body
        let targetUrl = 'unknown';
        
        // Try to parse from jsonBody if it exists
        if (nodeConfig?.jsonBody && typeof nodeConfig.jsonBody === 'string') {
          try {
            const bodyMatch = nodeConfig.jsonBody.match(/"url":\s*"([^"]+)"/);
            if (bodyMatch) {
              // This might be an n8n expression like {{ $json.url }}
              targetUrl = bodyMatch[1].includes('{{') ? 'dynamic' : bodyMatch[1];
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Calculate response size more accurately
        const dataField = json.data || json.article || json.body || json.html || '';
        const responseSize = typeof dataField === 'string' ? dataField.length : JSON.stringify(json).length;
        
        apiCalls.push({
          url: requestUrl,
          targetUrl: targetUrl,
          endpointType: endpointType,
          method: nodeConfig?.method || 'POST',
          statusCode: json.status || json.statusCode || 200,
          headers: headers,
          responseSize: responseSize,
          timestamp: new Date().toISOString(),
          unitsUsed: unitsUsed,
          isEstimated: actualUnits === null,
          options: options,
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
    method: nodeConfigMap[name]?.method || 'unknown',
    hasJsonBody: !!nodeConfigMap[name]?.jsonBody
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
      mainLength: Array.isArray(mainData) ? mainData.length : 'N/A',
      executionKeys: Object.keys(execution),
      dataKeys: execution.data ? Object.keys(execution.data) : [],
      mainType: mainData ? typeof mainData : 'undefined'
    };
    
    nodeDebug.executionStructure = nodeDebug.executionStructure || [];
    nodeDebug.executionStructure.push(execDebug);
    
    console.log(`  Execution ${idx}:`, JSON.stringify(execDebug, null, 2));
    
    // Look for Browserless calls in node data
    // Check main data
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
        
        const apiCalls = extractBrowserlessData(mainOutput, nodeName, nodeConfig);
        outputDebug.detectedCalls = apiCalls.length;
        
        console.log(`  → Found ${apiCalls.length} browserless calls`);
        
        if (apiCalls.length > 0) {
          const nodeKey = `${nodeName}_exec${idx}_output${outputIdx}`;
          browserless_calls[nodeKey] = {
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
let totalUnitsUsed = 0;
let estimatedCalls = 0;
let actualCalls = 0;
let callsByEndpoint = {};
let callsByTarget = {};

Object.values(browserless_calls).forEach(nodeData => {
  nodeData.api_calls.forEach(call => {
    totalAPICalls++;
    totalUnitsUsed += call.unitsUsed;
    
    if (call.isEstimated) {
      estimatedCalls++;
    } else {
      actualCalls++;
    }
    
    // Track by endpoint type
    if (!callsByEndpoint[call.endpointType]) {
      callsByEndpoint[call.endpointType] = {
        calls: 0,
        units: 0,
        avgUnitsPerCall: 0
      };
    }
    callsByEndpoint[call.endpointType].calls++;
    callsByEndpoint[call.endpointType].units += call.unitsUsed;
    
    // Track by target domain
    const target = categorizeTarget(call.targetUrl);
    if (!callsByTarget[target]) {
      callsByTarget[target] = {
        calls: 0,
        units: 0
      };
    }
    callsByTarget[target].calls++;
    callsByTarget[target].units += call.unitsUsed;
  });
});

// Calculate averages for endpoints
Object.keys(callsByEndpoint).forEach(endpoint => {
  const data = callsByEndpoint[endpoint];
  data.avgUnitsPerCall = (data.units / data.calls).toFixed(2);
});

// Determine current plan and limits
// Assume free tier unless we can detect otherwise
const currentPlan = 'free';
const planLimit = BROWSERLESS_PRICING.plans[currentPlan].units;
const remainingUnits = planLimit - totalUnitsUsed;
const percentUsed = (totalUnitsUsed / planLimit * 100).toFixed(2);

// Convert units to human-readable time
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Warnings
const warnings = [];
if (totalUnitsUsed >= planLimit) {
  warnings.push('⚠️ PLAN LIMIT EXCEEDED - Requests may be throttled or blocked');
} else if (totalUnitsUsed >= planLimit * 0.9) {
  warnings.push('⚠️ 90% of plan units used');
} else if (totalUnitsUsed >= planLimit * 0.75) {
  warnings.push('⚠️ 75% of plan units used');
}

if (estimatedCalls > 0) {
  warnings.push(`ℹ️ ${estimatedCalls} call(s) using estimated time (actual time not available)`);
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
    total_units_used: totalUnitsUsed,
    total_time_used: formatTime(totalUnitsUsed),
    units_remaining: remainingUnits,
    time_remaining: formatTime(remainingUnits),
    percent_used: percentUsed,
    plan_limit: planLimit,
    plan_limit_time: formatTime(planLimit),
    current_plan: currentPlan,
    average_units_per_call: totalAPICalls > 0 
      ? (totalUnitsUsed / totalAPICalls).toFixed(2) 
      : 0,
    estimated_vs_actual: {
      estimated_calls: estimatedCalls,
      actual_calls: actualCalls,
      note: estimatedCalls > 0 ? 'Some timings are estimates - actual may vary' : 'All timings from actual session data'
    }
  },
  
  endpoint_breakdown: callsByEndpoint,
  
  target_breakdown: callsByTarget,
  
  warnings: warnings,
  
  debug_info: {
    total_nodes_configured: debugInfo.nodeConfigs.length,
    total_nodes_processed: debugInfo.nodesProcessed.length,
    total_detection_attempts: debugInfo.detectionAttempts.length,
    node_configurations: debugInfo.nodeConfigs,
    nodes_processed: debugInfo.nodesProcessed,
    detection_attempts: debugInfo.detectionAttempts,
    hint: "Check node_configurations for what URLs were found, nodes_processed for what was analyzed, and detection_attempts for detailed checks on scrape nodes"
  },
  
  pricing_reference: {
    current_plan_details: BROWSERLESS_PRICING.plans[currentPlan],
    available_plans: BROWSERLESS_PRICING.plans,
    endpoint_estimates: Object.fromEntries(
      Object.entries(BROWSERLESS_PRICING.endpoints).map(([key, val]) => [
        key,
        {
          description: val.description,
          estimated_seconds: val.estimatedSeconds,
          estimated_time: formatTime(val.estimatedSeconds)
        }
      ])
    ),
    notes: [
      'Usage measured in units (1 unit = 1 second of session time)',
      'Free tier: 6,000 units/month (100 minutes)',
      'Units reset monthly on billing cycle',
      'Actual session time may vary based on page complexity',
      'Concurrent session limits apply per plan',
      'Dashboard: https://www.browserless.io/dashboard'
    ]
  },
  
  detailed_calls: browserless_calls
};

// Log summary to console
console.log('=== Browserless Usage Summary ===');
console.log(`Workflow: ${workflowName}`);
console.log(`Total API Calls: ${totalAPICalls}`);
console.log(`Total Units Used: ${totalUnitsUsed} units (${formatTime(totalUnitsUsed)})`);
console.log(`Limit: ${planLimit} units (${formatTime(planLimit)}) - ${percentUsed}% used`);
console.log(`Remaining: ${remainingUnits} units (${formatTime(remainingUnits)})`);
if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach(w => console.log(`  ${w}`));
}
console.log('===================================');

return [{ json: output }];
