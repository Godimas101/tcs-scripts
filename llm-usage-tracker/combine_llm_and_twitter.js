/**
 * Combine LLM, Twitter API, Browserless, ScrapingBee, and ScraperAPI usage data from merged outputs
 * Creates unified summary with combined costs and usage metrics
 */

const items = $input.all();

// Extract data from inputs
const llmData = items[0]?.json || {};
const twitterData = items[1]?.json || {};
const browserlessData = items[2]?.json || {};
const scrapingbeeData = items[3]?.json || {};
const scraperapiData = items[4]?.json || {};

// Common workflow info
const workflowName = llmData.workflow_name || twitterData.workflow_name || browserlessData.workflow_name || scrapingbeeData.workflow_name || scraperapiData.workflow_name || 'Unknown Workflow';
const executionId = llmData.execution_id || twitterData.execution_id || browserlessData.execution_id || scrapingbeeData.execution_id || scraperapiData.execution_id || '';
const executionTime = llmData.execution_time || twitterData.execution_time || browserlessData.execution_time || scrapingbeeData.execution_date || scraperapiData.execution_time || new Date().toISOString();
const executionStatus = twitterData.execution_status || browserlessData.execution_status || scrapingbeeData.execution_status || scraperapiData.execution_status || 'unknown';

// LLM costs
const llmCostUSD = parseFloat(llmData.total_cost_usd || 0);
const llmCostCAD = parseFloat(llmData.total_cost_cad || 0);

// Twitter costs
const twitterCostUSD = parseFloat(twitterData.total_cost_usd || 0);
const twitterCostCAD = parseFloat(twitterData.total_cost_cad || 0);

// ScrapingBee costs (estimated from usage if on paid plan)
const scrapingbeeCostUSD = parseFloat(scrapingbeeData.estimated_cost_usd || 0);
const scrapingbeeCostCAD = scrapingbeeCostUSD * 1.35; // USD to CAD conversion

// ScraperAPI costs (estimated from usage if on paid plan)
const scraperapiCostUSD = parseFloat(scraperapiData.estimated_cost_usd || 0);
const scraperapiCostCAD = scraperapiCostUSD * 1.35; // USD to CAD conversion

// Combined totals (Note: Browserless, ScrapingBee, and ScraperAPI are usage-based)
const totalCostUSD = llmCostUSD + twitterCostUSD + scrapingbeeCostUSD + scraperapiCostUSD;
const totalCostCAD = llmCostCAD + twitterCostCAD + scrapingbeeCostCAD + scraperapiCostCAD;

// Service flags
const hasLLMUsage = (llmData.total_tokens || 0) > 0;
const hasTwitterUsage = (twitterData.total_api_calls || 0) > 0;
const hasBrowserlessUsage = (browserlessData.total_api_calls || 0) > 0;
const hasScrapingBeeUsage = (scrapingbeeData.total_api_calls || 0) > 0;
const hasScraperAPIUsage = (scraperapiData.total_api_calls || 0) > 0;

// Build combined output (flattened for Data Table compatibility)
const combined = {
  // Workflow metadata
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  execution_status: executionStatus,
  
  // Service flags
  has_llm_usage: hasLLMUsage,
  has_twitter_usage: hasTwitterUsage,
  has_browserless_usage: hasBrowserlessUsage,
  has_scrapingbee_usage: hasScrapingBeeUsage,
  has_scraperapi_usage: hasScraperAPIUsage,
  
  // LLM usage (flattened)
  llm_total_tokens: llmData.total_tokens || 0,
  llm_input_tokens: llmData.total_input_tokens || 0,
  llm_output_tokens: llmData.total_output_tokens || 0,
  llm_models_count: (llmData.models_used || []).length,
  llm_models_used: JSON.stringify(llmData.models_used || []),
  llm_cost_usd: parseFloat(llmCostUSD.toFixed(6)),
  llm_cost_cad: parseFloat(llmCostCAD.toFixed(6)),
  llm_summary: llmData.summary || 'No LLM usage',
  
  // Twitter API usage (flattened)
  twitter_total_api_calls: twitterData.total_api_calls || 0,
  twitter_total_items_returned: twitterData.total_items_returned || 0,
  twitter_total_credits: twitterData.total_credits || 0,
  twitter_endpoints_used: twitterData.endpoints_used || 0,
  twitter_data_types: JSON.stringify(twitterData.data_types || []),
  twitter_top_endpoints: JSON.stringify(twitterData.top_endpoints || []),
  twitter_cost_usd: parseFloat(twitterCostUSD.toFixed(6)),
  twitter_cost_cad: parseFloat(twitterCostCAD.toFixed(6)),
  twitter_summary: twitterData.summary || 'No Twitter API usage',
  
  // Browserless usage (flattened)
  browserless_total_api_calls: browserlessData.total_api_calls || 0,
  browserless_total_units_used: browserlessData.total_units_used || 0,
  browserless_total_time_used: browserlessData.total_time_used || '0s',
  browserless_current_plan: browserlessData.current_plan || 'free',
  browserless_percent_used: parseFloat(browserlessData.percent_used || 0),
  browserless_percent_of_free_plan: parseFloat(browserlessData.percent_of_free_plan || 0),
  browserless_units_remaining: browserlessData.units_remaining || 0,
  browserless_top_endpoints: JSON.stringify(browserlessData.top_endpoints || []),
  browserless_top_targets: JSON.stringify(browserlessData.top_targets || []),
  browserless_summary: browserlessData.summary || 'No Browserless usage',
  
  // ScrapingBee usage (flattened)
  scrapingbee_total_api_calls: scrapingbeeData.total_api_calls || 0,
  scrapingbee_total_credits_used: scrapingbeeData.total_credits_used || 0,
  scrapingbee_credits_remaining: scrapingbeeData.credits_remaining || 0,
  scrapingbee_current_plan: scrapingbeeData.current_plan || 'free',
  scrapingbee_percent_used: parseFloat(scrapingbeeData.percent_used || 0),
  scrapingbee_has_warnings: scrapingbeeData.has_warnings || false,
  scrapingbee_basic_calls: scrapingbeeData.basic_calls || 0,
  scrapingbee_js_calls: scrapingbeeData.js_rendering_calls || 0,
  scrapingbee_premium_calls: scrapingbeeData.premium_proxy_calls || 0,
  scrapingbee_premium_js_calls: scrapingbeeData.premium_js_calls || 0,
  scrapingbee_top_targets: JSON.stringify([scrapingbeeData.top_target_1, scrapingbeeData.top_target_2, scrapingbeeData.top_target_3].filter(t => t) || []),
  scrapingbee_cost_usd: parseFloat(scrapingbeeCostUSD.toFixed(6)),
  scrapingbee_cost_cad: parseFloat(scrapingbeeCostCAD.toFixed(6)),
  scrapingbee_summary: scrapingbeeData.summary || 'No ScrapingBee usage',
  
  // ScraperAPI usage (flattened)
  scraperapi_total_api_calls: scraperapiData.total_api_calls || 0,
  scraperapi_total_credits_used: scraperapiData.total_credits_used || 0,
  scraperapi_credits_remaining: scraperapiData.credits_remaining || 0,
  scraperapi_current_plan: scraperapiData.current_plan || 'free',
  scraperapi_percent_used: parseFloat(scraperapiData.percent_used || 0),
  scraperapi_has_warnings: scraperapiData.has_warnings || false,
  scraperapi_warning_level: scraperapiData.warning_level || 'low',
  scraperapi_primary_feature: scraperapiData.primary_feature || 'base',
  scraperapi_base_calls: scraperapiData.base_calls || 0,
  scraperapi_js_render_calls: scraperapiData.js_render_calls || 0,
  scraperapi_premium_proxy_calls: scraperapiData.premium_proxy_calls || 0,
  scraperapi_autoparse_calls: scraperapiData.autoparse_calls || 0,
  scraperapi_geotargeting_calls: scraperapiData.geotargeting_calls || 0,
  scraperapi_base_credits: scraperapiData.base_credits || 0,
  scraperapi_js_render_credits: scraperapiData.js_render_credits || 0,
  scraperapi_premium_credits: scraperapiData.premium_credits || 0,
  scraperapi_autoparse_credits: scraperapiData.autoparse_credits || 0,
  scraperapi_top_targets: JSON.stringify(scraperapiData.top_targets || []),
  scraperapi_cost_usd: parseFloat(scraperapiCostUSD.toFixed(6)),
  scraperapi_cost_cad: parseFloat(scraperapiCostCAD.toFixed(6)),
  scraperapi_summary: scraperapiData.summary || 'No ScraperAPI usage',
  
  // Combined costs (flattened)
  total_cost_usd: parseFloat(totalCostUSD.toFixed(6)),
  total_cost_cad: parseFloat(totalCostCAD.toFixed(6)),
  
  // Human-readable summary
  summary: buildSummary(workflowName, hasLLMUsage, hasTwitterUsage, hasBrowserlessUsage, hasScrapingBeeUsage, hasScraperAPIUsage, llmData, twitterData, browserlessData, scrapingbeeData, scraperapiData, totalCostCAD)
};

// Helper function to build comprehensive summary
function buildSummary(workflow, hasLLM, hasTwitter, hasBrowserless, hasScrapingBee, hasScraperAPI, llm, twitter, browserless, scrapingbee, scraperapi, totalCAD) {
  const parts = [workflow];
  const services = [];
  
  if (hasLLM) {
    services.push(`LLM: ${(llm.total_tokens || 0).toLocaleString()} tokens`);
  }
  
  if (hasTwitter) {
    services.push(`Twitter: ${twitter.total_api_calls || 0} call(s), ${twitter.total_items_returned || 0} item(s)`);
  }
  
  if (hasBrowserless) {
    services.push(`Browserless: ${browserless.total_api_calls || 0} call(s), ${browserless.total_units_used || 0} units`);
  }
  
  if (hasScrapingBee) {
    services.push(`ScrapingBee: ${scrapingbee.total_api_calls || 0} call(s), ${scrapingbee.total_credits_used || 0} credits`);
  }
  
  if (hasScraperAPI) {
    services.push(`ScraperAPI: ${scraperapi.total_api_calls || 0} call(s), ${scraperapi.total_credits_used || 0} credits`);
  }
  
  if (services.length > 0) {
    parts.push(services.join(' | '));
    
    // Add cost summary (only for services with costs)
    if (hasLLM || hasTwitter || hasScrapingBee || hasScraperAPI) {
      parts.push(`Cost: $${totalCAD.toFixed(4)} CAD`);
    }
    
    return parts.join(' | ');
  } else {
    parts.push('No API usage detected');
    return parts.join(' | ');
  }
}

// Console output for debugging
console.log('📊 Combined Usage Summary:');
console.log(`   Workflow: ${workflowName}`);
console.log(`   Execution: ${executionId}`);
if (hasLLMUsage) {
  console.log(`   LLM: ${combined.llm_total_tokens.toLocaleString()} tokens, $${llmCostCAD.toFixed(4)} CAD`);
}
if (hasTwitterUsage) {
  console.log(`   Twitter: ${combined.twitter_total_api_calls} calls, ${combined.twitter_total_items_returned} items, $${twitterCostCAD.toFixed(4)} CAD`);
}
if (hasBrowserlessUsage) {
  console.log(`   Browserless: ${combined.browserless_total_api_calls} calls, ${combined.browserless_total_units_used} units (${combined.browserless_total_time_used}), ${combined.browserless_percent_used}% used`);
}
if (hasScrapingBeeUsage) {
  console.log(`   ScrapingBee: ${combined.scrapingbee_total_api_calls} calls, ${combined.scrapingbee_total_credits_used} credits, ${combined.scrapingbee_percent_used}% used, $${scrapingbeeCostCAD.toFixed(4)} CAD`);
}
if (hasScraperAPIUsage) {
  console.log(`   ScraperAPI: ${combined.scraperapi_total_api_calls} calls, ${combined.scraperapi_total_credits_used} credits, ${combined.scraperapi_percent_used}% used, $${scraperapiCostCAD.toFixed(4)} CAD`);
}
if (hasLLMUsage || hasTwitterUsage || hasScrapingBeeUsage || hasScraperAPIUsage) {
  console.log(`   💰 TOTAL COST: $${totalCostUSD.toFixed(6)} USD / $${totalCostCAD.toFixed(4)} CAD`);
}

return [{ json: combined }];
