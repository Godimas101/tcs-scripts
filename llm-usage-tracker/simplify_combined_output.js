// Simplify Combined LLM + Twitter API Usage Tracker output for data table storage
// Takes complex tracker output and extracts only essential fields from both services

const trackerOutput = $input.first().json;

// USD to CAD conversion rate (update as needed)
const USD_TO_CAD = 1.43;

// Extract workflow name from tracker output
const workflowName = trackerOutput.workflow_name || 'Unknown Workflow';

// Extract execution details
const executionId = trackerOutput.execution_id || '';
const executionTime = trackerOutput.started_at || new Date().toISOString();
const executionStatus = trackerOutput.execution_status || 'unknown';

// ===== LLM USAGE =====
const llmUsage = trackerOutput.llm_usage || {};
const tokensByModel = llmUsage.tokens_by_model || {};
const totalLLMCalls = llmUsage.total_llm_calls || 0;
const modelsUsed = llmUsage.models_used || [];

// Calculate LLM totals
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalTokens = 0;

const modelStats = Object.keys(tokensByModel).map(modelName => {
  const modelData = tokensByModel[modelName];
  
  totalInputTokens += modelData.promptTokens || 0;
  totalOutputTokens += modelData.completionTokens || 0;
  totalTokens += modelData.actualTokens || 0;
  
  return {
    model: modelName,
    input_tokens: modelData.promptTokens || 0,
    output_tokens: modelData.completionTokens || 0,
    total_tokens: modelData.actualTokens || 0,
    call_count: modelData.count || 0
  };
});

// ===== TWITTER API USAGE =====
const twitterUsage = trackerOutput.twitter_usage || {};
const totalTwitterCalls = twitterUsage.total_api_calls || 0;
const totalItems = twitterUsage.total_items_returned || 0;
const endpointsUsed = twitterUsage.endpoints_used || 0;

// ===== COSTS =====
const costs = trackerOutput.costs || {};

// Twitter costs
const twitterCosts = costs.twitter || {};
const twitterCredits = twitterCosts.total_credits || 0;
const twitterCostUSD = parseFloat(twitterCosts.total_cost_usd || 0);
const twitterCostCAD = twitterCostUSD * USD_TO_CAD;

// Twitter cost breakdown by data type
const twitterCostByType = twitterCosts.cost_by_data_type || {};
const twitterDataTypes = Object.keys(twitterCostByType).map(dataType => {
  const typeData = twitterCostByType[dataType];
  return {
    data_type: dataType,
    items: typeData.items || 0,
    credits: typeData.credits || 0,
    cost_usd: parseFloat(typeData.costUSD || 0),
    cost_cad: parseFloat((parseFloat(typeData.costUSD || 0) * USD_TO_CAD).toFixed(6))
  };
});

// LLM costs (placeholder - add your actual LLM pricing logic)
const llmCosts = costs.llm || {};
const llmCostUSD = parseFloat(llmCosts.estimated_cost || 0);
const llmCostCAD = llmCostUSD * USD_TO_CAD;

// Combined costs
const combinedCosts = costs.combined || {};
const totalCostUSD = parseFloat(combinedCosts.total_estimated_cost || (twitterCostUSD + llmCostUSD));
const totalCostCAD = totalCostUSD * USD_TO_CAD;

// ===== SERVICE FLAGS =====
const hasLLMUsage = trackerOutput.summary?.has_llm_usage || totalLLMCalls > 0;
const hasTwitterUsage = trackerOutput.summary?.has_twitter_usage || totalTwitterCalls > 0;

// Build simplified output
const simplified = {
  // Execution info
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  execution_status: executionStatus,
  
  // Service flags
  has_llm_usage: hasLLMUsage,
  has_twitter_usage: hasTwitterUsage,
  
  // LLM usage summary
  llm: {
    total_calls: totalLLMCalls,
    models_count: modelsUsed.length,
    models_used: modelsUsed,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_tokens: totalTokens,
    cost_usd: parseFloat(llmCostUSD.toFixed(6)),
    cost_cad: parseFloat(llmCostCAD.toFixed(6)),
    model_breakdown: modelStats
  },
  
  // Twitter API usage summary
  twitter: {
    total_api_calls: totalTwitterCalls,
    total_items_returned: totalItems,
    endpoints_used: endpointsUsed,
    total_credits: twitterCredits,
    cost_usd: parseFloat(twitterCostUSD.toFixed(6)),
    cost_cad: parseFloat(twitterCostCAD.toFixed(6)),
    data_type_breakdown: twitterDataTypes
  },
  
  // Combined cost summary
  costs: {
    llm_cost_usd: parseFloat(llmCostUSD.toFixed(6)),
    llm_cost_cad: parseFloat(llmCostCAD.toFixed(6)),
    twitter_cost_usd: parseFloat(twitterCostUSD.toFixed(6)),
    twitter_cost_cad: parseFloat(twitterCostCAD.toFixed(6)),
    total_cost_usd: parseFloat(totalCostUSD.toFixed(6)),
    total_cost_cad: parseFloat(totalCostCAD.toFixed(6))
  },
  
  // Summary string for quick reference
  summary: buildSummaryString(workflowName, hasLLMUsage, hasTwitterUsage, totalLLMCalls, totalTokens, totalTwitterCalls, totalItems, totalCostCAD)
};

// Helper function to build summary string
function buildSummaryString(workflow, hasLLM, hasTwitter, llmCalls, tokens, twitterCalls, items, costCAD) {
  const parts = [workflow];
  
  if (hasLLM && hasTwitter) {
    parts.push(`LLM: ${llmCalls} call(s), ${tokens.toLocaleString()} tokens`);
    parts.push(`Twitter: ${twitterCalls} call(s), ${items} items`);
    parts.push(`Total: $${costCAD.toFixed(4)} CAD`);
  } else if (hasLLM) {
    parts.push(`LLM: ${llmCalls} call(s), ${tokens.toLocaleString()} tokens, $${costCAD.toFixed(4)} CAD`);
  } else if (hasTwitter) {
    parts.push(`Twitter: ${twitterCalls} call(s), ${items} items, $${costCAD.toFixed(4)} CAD`);
  } else {
    parts.push('No LLM or Twitter API usage detected');
  }
  
  return parts.join(' | ');
}

// Console output for debugging
console.log('📊 Simplified Combined Usage Summary:');
console.log(`   Workflow: ${workflowName}`);

if (hasLLMUsage) {
  console.log(`   🤖 LLM: ${totalLLMCalls} calls, ${totalTokens.toLocaleString()} tokens, $${llmCostCAD.toFixed(4)} CAD`);
  console.log(`      Models: ${modelsUsed.join(', ')}`);
}

if (hasTwitterUsage) {
  console.log(`   🐦 Twitter: ${totalTwitterCalls} API calls, ${totalItems} items, ${twitterCredits} credits, $${twitterCostCAD.toFixed(4)} CAD`);
  console.log(`      Data Types: ${twitterDataTypes.map(d => `${d.data_type} (${d.items})`).join(', ')}`);
}

if (!hasLLMUsage && !hasTwitterUsage) {
  console.log('   ℹ️  No API usage detected');
}

console.log(`   💰 Total Cost: $${totalCostUSD.toFixed(6)} USD / $${totalCostCAD.toFixed(4)} CAD`);

return [{ json: simplified }];
