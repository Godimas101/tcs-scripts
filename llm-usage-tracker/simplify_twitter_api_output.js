// Simplify Twitter API Usage Tracker output for data table storage
// Takes complex tracker output and extracts only essential fields

const trackerOutput = $input.first().json;

// USD to CAD conversion rate (update as needed)
const USD_TO_CAD = 1.43;

// Extract workflow name from tracker output
const workflowName = trackerOutput.workflow_name || 'Unknown Workflow';

// Extract execution details
const executionId = trackerOutput.execution_id || '';
const executionTime = trackerOutput.started_at || new Date().toISOString();
const executionStatus = trackerOutput.execution_status || 'unknown';

// Get usage summary
const usageSummary = trackerOutput.usage_summary || {};
const totalCalls = usageSummary.total_api_calls || 0;
const totalItems = usageSummary.total_items_returned || 0;
const totalResponseSize = usageSummary.total_response_size_bytes || 0;
const endpointsUsed = usageSummary.endpoints_used || 0;

// Get cost analysis
const costAnalysis = trackerOutput.cost_analysis || {};
const totalCredits = costAnalysis.total_credits || 0;
const totalCostUSD = parseFloat(costAnalysis.total_cost_usd || 0);
const totalCostCAD = totalCostUSD * USD_TO_CAD;
const avgCostPerCall = parseFloat(costAnalysis.average_cost_per_call || 0);
const avgCostPerItem = parseFloat(costAnalysis.average_cost_per_item || 0);

// Get cost breakdown by data type
const costByDataType = costAnalysis.cost_by_data_type || {};
const dataTypeStats = Object.keys(costByDataType).map(dataType => {
  const typeData = costByDataType[dataType];
  return {
    data_type: dataType,
    items: typeData.items || 0,
    credits: typeData.credits || 0,
    cost_usd: parseFloat(typeData.costUSD || 0),
    cost_cad: parseFloat((parseFloat(typeData.costUSD || 0) * USD_TO_CAD).toFixed(6)),
    avg_credits_per_item: parseFloat(typeData.avgCreditsPerItem || 0)
  };
});

// Get endpoint breakdown
const endpointBreakdown = usageSummary.endpoint_breakdown || {};
const endpointStats = Object.keys(endpointBreakdown).map(endpoint => {
  const endpointData = endpointBreakdown[endpoint];
  return {
    endpoint: endpoint,
    call_count: endpointData.count || 0,
    total_items: endpointData.totalItems || 0,
    total_credits: endpointData.totalCredits || 0,
    methods: endpointData.methods || {},
    data_types: endpointData.dataTypes || {}
  };
}).sort((a, b) => b.total_credits - a.total_credits); // Sort by credits (highest first)

// Build simplified output
const simplified = {
  // Execution info
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  execution_status: executionStatus,
  
  // API usage summary
  total_api_calls: totalCalls,
  total_items_returned: totalItems,
  total_response_size_bytes: totalResponseSize,
  endpoints_used: endpointsUsed,
  
  // Credits & Cost summary
  total_credits: totalCredits,
  total_cost_usd: parseFloat(totalCostUSD.toFixed(6)),
  total_cost_cad: parseFloat(totalCostCAD.toFixed(6)),
  avg_cost_per_call_usd: parseFloat(avgCostPerCall.toFixed(6)),
  avg_cost_per_item_usd: parseFloat(avgCostPerItem.toFixed(6)),
  
  // Data type breakdown (tweets, profiles, followers, etc.)
  data_types: dataTypeStats,
  
  // Endpoint breakdown (optional - only top 5 for brevity)
  top_endpoints: endpointStats.slice(0, 5),
  
  // Summary string for quick reference
  summary: totalCalls > 0 
    ? `${workflowName}: ${totalCalls} API call(s), ${totalItems} item(s) returned, ${totalCredits} credits, $${totalCostCAD.toFixed(4)} CAD`
    : `${workflowName}: No Twitter API calls detected`
};

// Console output for debugging
if (totalCalls > 0) {
  console.log('🐦 Simplified Twitter API Usage Summary:');
  console.log(`   Workflow: ${workflowName}`);
  console.log(`   API Calls: ${totalCalls}`);
  console.log(`   Items Returned: ${totalItems.toLocaleString()}`);
  console.log(`   Credits Used: ${totalCredits.toLocaleString()}`);
  console.log(`   Total Cost: $${totalCostUSD.toFixed(6)} USD / $${totalCostCAD.toFixed(4)} CAD`);
  console.log(`   Data Types: ${dataTypeStats.map(d => `${d.data_type} (${d.items})`).join(', ')}`);
} else {
  console.log('ℹ️  No Twitter API calls detected in this execution');
}

return [{ json: simplified }];
