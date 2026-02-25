// Simplify LLM Usage Tracker output for data table storage
// Takes complex tracker output and extracts only essential fields

const trackerOutput = $input.first().json;

// USD to CAD conversion rate (update as needed)
const USD_TO_CAD = 1.43;

// Extract workflow name from tracker output (passed through from Find Nodes)
const workflowName = trackerOutput.workflow_name || 'Unknown Workflow';

// Extract execution details (passed through from Find Nodes)
const executionId = trackerOutput.execution_id || '';
const executionTime = trackerOutput.started_at || new Date().toISOString();

// Get tokensByModel data - this is the key structure from the tracker
const tokensByModel = trackerOutput.tokensByModel || {};

// Get total cost from tracker
const cost = trackerOutput.cost || { total_cost: 0, input_cost: 0, output_cost: 0 };
const totalCostUSD = cost.total_cost || 0;
const totalCostCAD = totalCostUSD * USD_TO_CAD;

// Calculate total tokens from tokensByModel
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalTokens = 0;

// Build model stats array
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
    cost_usd: parseFloat((modelData.total_cost || 0).toFixed(4)),
    cost_cad: parseFloat(((modelData.total_cost || 0) * USD_TO_CAD).toFixed(4)),
    call_count: modelData.count || 0
  };
});

// Build simplified output
const simplified = {
  // Execution info
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  
  // Token usage summary
  total_input_tokens: totalInputTokens,
  total_output_tokens: totalOutputTokens,
  total_tokens: totalTokens,
  
  // Cost summary
  total_cost_usd: parseFloat(totalCostUSD.toFixed(4)),
  total_cost_cad: parseFloat(totalCostCAD.toFixed(4)),
  
  // Model breakdown (array of models used)
  models_used: modelStats,
  
  // Summary string for quick reference
  summary: `${workflowName} used ${modelStats.length} model(s), ${totalTokens.toLocaleString()} tokens, $${totalCostCAD.toFixed(2)} CAD`
};

console.log('📊 Simplified Usage Summary:');
console.log(`   Workflow: ${workflowName}`);
console.log(`   Models: ${modelStats.map(m => m.model).join(', ')}`);
console.log(`   Total Tokens: ${totalTokens.toLocaleString()}`);
console.log(`   Total Cost: $${totalCostUSD.toFixed(4)} USD / $${totalCostCAD.toFixed(2)} CAD`);

return [{ json: simplified }];
