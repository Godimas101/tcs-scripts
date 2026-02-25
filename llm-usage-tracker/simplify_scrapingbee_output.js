/**
 * n8n JavaScript Code - Simplify ScrapingBee Usage Tracker Output
 * 
 * Takes the detailed output from track_scrapingbee_usage.js and flattens it
 * into a simple structure suitable for Google Sheets or data tables.
 */

// Get the ScrapingBee tracker output
const trackerOutput = $input.first().json;

// Extract key fields for the summary row
const workflowName = trackerOutput.workflow_name || 'Unknown';
const executionId = trackerOutput.execution_id || '';
const executionStatus = trackerOutput.execution_status || 'unknown';
const executionDate = trackerOutput.started_at || new Date().toISOString();

// Usage summary
const totalCalls = trackerOutput.usage_summary?.total_api_calls || 0;
const totalCredits = trackerOutput.usage_summary?.total_credits_used || 0;
const creditsRemaining = trackerOutput.usage_summary?.credits_remaining || 0;
const percentUsed = trackerOutput.usage_summary?.percent_used || 0;
const planLimit = trackerOutput.usage_summary?.plan_limit || 0;
const avgCreditsPerCall = trackerOutput.usage_summary?.average_credits_per_call || 0;
const currentPlan = trackerOutput.usage_summary?.current_plan || 'unknown';

// Configuration breakdown
const configBreakdown = trackerOutput.configuration_breakdown || {};
const basicCalls = configBreakdown.basic?.calls || 0;
const basicCredits = configBreakdown.basic?.credits || 0;
const jsRenderingCalls = configBreakdown.with_js?.calls || 0;
const jsRenderingCredits = configBreakdown.with_js?.credits || 0;
const premiumCalls = configBreakdown.premium?.calls || 0;
const premiumCredits = configBreakdown.premium?.credits || 0;
const premiumJsCalls = configBreakdown.premium_with_js?.calls || 0;
const premiumJsCredits = configBreakdown.premium_with_js?.credits || 0;

// Target breakdown (top 3 targets)
const targetBreakdown = trackerOutput.target_breakdown || {};
const topTargets = Object.entries(targetBreakdown)
  .sort((a, b) => b[1].credits - a[1].credits)
  .slice(0, 3)
  .map(([domain, data]) => ({
    domain: domain,
    calls: data.calls,
    credits: data.credits
  }));

// Format top targets as readable strings
const target1 = topTargets[0] ? `${topTargets[0].domain} (${topTargets[0].calls} calls, ${topTargets[0].credits} credits)` : '';
const target2 = topTargets[1] ? `${topTargets[1].domain} (${topTargets[1].calls} calls, ${topTargets[1].credits} credits)` : '';
const target3 = topTargets[2] ? `${topTargets[2].domain} (${topTargets[2].calls} calls, ${topTargets[2].credits} credits)` : '';

// Warnings
const warnings = (trackerOutput.warnings || []).join('; ');
const hasWarnings = warnings.length > 0;

// Cost estimation based on plan
const planCostUSD = trackerOutput.pricing_reference?.current_plan_details?.costUSD || 0;
const costPerCredit = totalCredits > 0 && planCostUSD > 0 
  ? (planCostUSD / planLimit).toFixed(6) 
  : 0;
const estimatedCostUSD = totalCredits > 0 && costPerCredit > 0 
  ? (totalCredits * costPerCredit).toFixed(4) 
  : 0;

// Build simplified output
const simplifiedOutput = {
  // Execution metadata
  workflow_name: workflowName,
  execution_id: executionId,
  execution_status: executionStatus,
  execution_date: executionDate,
  
  // Summary metrics
  total_api_calls: totalCalls,
  total_credits_used: totalCredits,
  credits_remaining: creditsRemaining,
  percent_used: parseFloat(percentUsed),
  plan_limit: planLimit,
  current_plan: currentPlan,
  avg_credits_per_call: parseFloat(avgCreditsPerCall),
  
  // Configuration breakdown
  basic_calls: basicCalls,
  basic_credits: basicCredits,
  js_rendering_calls: jsRenderingCalls,
  js_rendering_credits: jsRenderingCredits,
  premium_proxy_calls: premiumCalls,
  premium_proxy_credits: premiumCredits,
  premium_js_calls: premiumJsCalls,
  premium_js_credits: premiumJsCredits,
  
  // Top targets
  top_target_1: target1,
  top_target_2: target2,
  top_target_3: target3,
  
  // Warnings and status
  has_warnings: hasWarnings,
  warnings: warnings,
  
  // Cost estimation
  plan_cost_usd: planCostUSD,
  cost_per_credit: parseFloat(costPerCredit),
  estimated_cost_usd: parseFloat(estimatedCostUSD),
  
  // Timestamp for tracking
  processed_at: new Date().toISOString(),
  
  // Summary string for quick reference
  summary: totalCalls > 0
    ? `${workflowName}: ${totalCalls} ScrapingBee call(s), ${totalCredits} credits, ${percentUsed}% used`
    : `${workflowName}: No ScrapingBee API calls detected`
};

// Log the simplified output
console.log('=== Simplified ScrapingBee Usage Data ===');
console.log(`Workflow: ${workflowName}`);
console.log(`Total Calls: ${totalCalls} | Credits: ${totalCredits}/${planLimit}`);
console.log(`Breakdown:`);
console.log(`  Basic: ${basicCalls} calls (${basicCredits} credits)`);
console.log(`  JS Rendering: ${jsRenderingCalls} calls (${jsRenderingCredits} credits)`);
console.log(`  Premium Proxy: ${premiumCalls} calls (${premiumCredits} credits)`);
console.log(`  Premium + JS: ${premiumJsCalls} calls (${premiumJsCredits} credits)`);
if (hasWarnings) {
  console.log(`⚠️ Warnings: ${warnings}`);
}
console.log('==========================================');

return [{ json: simplifiedOutput }];
