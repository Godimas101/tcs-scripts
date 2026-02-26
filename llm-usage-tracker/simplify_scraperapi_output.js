// Simplify ScraperAPI Usage Tracker output for data table storage
// Takes complex tracker output and extracts only essential fields

const trackerOutput = $input.first().json;

// Extract workflow name from tracker output
const workflowName = trackerOutput.workflow_name || 'Unknown Workflow';

// Extract execution details
const executionId = trackerOutput.execution_id || '';
const executionTime = trackerOutput.started_at || new Date().toISOString();
const executionStatus = trackerOutput.execution_status || 'unknown';

// Get usage summary
const usageSummary = trackerOutput.usage_summary || {};
const totalCalls = usageSummary.total_api_calls || 0;
const totalCredits = usageSummary.total_credits_used || 0;
const creditsRemaining = usageSummary.credits_remaining || 0;
const percentUsed = parseFloat(usageSummary.percent_used || 0);
const freeTierLimit = usageSummary.free_tier_limit || 1000;
const avgCreditsPerCall = parseFloat(usageSummary.average_credits_per_call || 0);

// Get feature breakdown
const featureBreakdown = trackerOutput.feature_breakdown || {};
const baseCalls = featureBreakdown.base_requests?.calls || 0;
const baseCredits = featureBreakdown.base_requests?.total_credits || 0;
const jsRenderCalls = featureBreakdown.js_render?.calls || 0;
const jsRenderCredits = featureBreakdown.js_render?.total_credits || 0;
const premiumCalls = featureBreakdown.premium_proxy?.calls || 0;
const premiumCredits = featureBreakdown.premium_proxy?.total_credits || 0;
const geoTargetCalls = featureBreakdown.geotargeting?.calls || 0;
const autoparseCalls = featureBreakdown.autoparse?.calls || 0;
const autoparseCredits = featureBreakdown.autoparse?.total_credits || 0;

// Get pricing reference for plan limits
const pricingRef = trackerOutput.pricing_reference || {};
const paidPlans = pricingRef.paid_plans || {};
const hobbyLimit = paidPlans.hobby?.credits || 100000;
const startupLimit = paidPlans.startup?.credits || 1000000;
const businessLimit = paidPlans.business?.credits || 3000000;

// Calculate percentages for different plans
const percentOfFreePlan = percentUsed;
const percentOfHobbyPlan = parseFloat(((totalCredits / hobbyLimit) * 100).toFixed(4));
const percentOfStartupPlan = parseFloat(((totalCredits / startupLimit) * 100).toFixed(5));
const percentOfBusinessPlan = parseFloat(((totalCredits / businessLimit) * 100).toFixed(5));

// Get target breakdown
const targetBreakdown = trackerOutput.target_breakdown || {};
const targetStats = Object.keys(targetBreakdown).map(target => {
  const targetData = targetBreakdown[target];
  return {
    target: target,
    call_count: targetData.calls || 0,
    total_credits: targetData.credits || 0,
    avg_credits_per_call: targetData.calls > 0 ? parseFloat((targetData.credits / targetData.calls).toFixed(2)) : 0
  };
}).sort((a, b) => b.total_credits - a.total_credits).slice(0, 5); // Top 5 targets only

// Get warnings
const warnings = trackerOutput.warnings || [];
const hasWarnings = warnings.length > 0;
const warningLevel = hasWarnings ? 'high' : (percentUsed >= 50 ? 'medium' : 'low');

// Calculate estimated monthly cost if current rate continues
const monthlyProjection = {
  credits_per_month: Math.round((totalCredits / 1) * 30), // Rough estimate if this is daily usage
  free_plan_sufficient: false,
  recommended_plan: 'Free'
};

if (monthlyProjection.credits_per_month <= freeTierLimit) {
  monthlyProjection.free_plan_sufficient = true;
  monthlyProjection.recommended_plan = 'Free (1K credits/month)';
} else if (monthlyProjection.credits_per_month <= hobbyLimit) {
  monthlyProjection.recommended_plan = 'Hobby (100K credits/month - $49)';
} else if (monthlyProjection.credits_per_month <= startupLimit) {
  monthlyProjection.recommended_plan = 'Startup (1M credits/month - $149)';
} else if (monthlyProjection.credits_per_month <= businessLimit) {
  monthlyProjection.recommended_plan = 'Business (3M credits/month - $299)';
} else {
  monthlyProjection.recommended_plan = 'Enterprise (custom pricing)';
}

// Feature usage summary (most commonly used feature)
let primaryFeature = 'base';
if (autoparseCalls > 0) primaryFeature = 'autoparse';
else if (premiumCalls > 0) primaryFeature = 'premium_proxy';
else if (jsRenderCalls > 0) primaryFeature = 'js_render';

// Build simplified output
const simplified = {
  // Execution info
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  execution_status: executionStatus,
  
  // API usage summary
  total_api_calls: totalCalls,
  total_credits_used: totalCredits,
  avg_credits_per_call: avgCreditsPerCall,
  
  // Current plan status
  current_plan: 'free',
  plan_limit: freeTierLimit,
  credits_remaining: creditsRemaining,
  percent_used: percentUsed,
  warning_level: warningLevel,
  has_warnings: hasWarnings,
  
  // Feature usage
  primary_feature: primaryFeature,
  base_calls: baseCalls,
  js_render_calls: jsRenderCalls,
  premium_proxy_calls: premiumCalls,
  autoparse_calls: autoparseCalls,
  geotargeting_calls: geoTargetCalls,
  
  // Feature credits breakdown
  base_credits: baseCredits,
  js_render_credits: jsRenderCredits,
  premium_credits: premiumCredits,
  autoparse_credits: autoparseCredits,
  
  // Plan usage percentages (for comparison)
  percent_of_free_plan: percentOfFreePlan,
  percent_of_hobby_plan: percentOfHobbyPlan,
  percent_of_startup_plan: percentOfStartupPlan,
  percent_of_business_plan: percentOfBusinessPlan,
  
  // Target breakdown (only top 5 for brevity)
  top_targets: targetStats,
  
  // Monthly projection (very rough estimate)
  monthly_projection: monthlyProjection,
  
  // Warnings
  warnings: warnings,
  
  // Summary string for quick reference
  summary: totalCalls > 0 
    ? `${workflowName}: ${totalCalls} ScraperAPI call(s), ${totalCredits} credits used (${percentUsed.toFixed(1)}% of free tier), primary: ${primaryFeature}`
    : `${workflowName}: No ScraperAPI calls detected`
};

// Console output for debugging
if (totalCalls > 0) {
  console.log('🔍 Simplified ScraperAPI Usage Summary:');
  console.log(`   Workflow: ${workflowName}`);
  console.log(`   API Calls: ${totalCalls}`);
  console.log(`   Credits Used: ${totalCredits}/${freeTierLimit} (${percentUsed.toFixed(1)}% of free tier)`);
  console.log(`   Credits Remaining: ${creditsRemaining}`);
  console.log(`   Primary Feature: ${primaryFeature} (avg ${avgCreditsPerCall} credits/call)`);
  
  // Feature breakdown
  const featureSummary = [];
  if (baseCalls > 0) featureSummary.push(`base: ${baseCalls} calls (${baseCredits} credits)`);
  if (jsRenderCalls > 0) featureSummary.push(`js_render: ${jsRenderCalls} calls (${jsRenderCredits} credits)`);
  if (premiumCalls > 0) featureSummary.push(`premium: ${premiumCalls} calls (${premiumCredits} credits)`);
  if (autoparseCalls > 0) featureSummary.push(`autoparse: ${autoparseCalls} calls (${autoparseCredits} credits)`);
  if (geoTargetCalls > 0) featureSummary.push(`geo: ${geoTargetCalls} calls`);
  
  if (featureSummary.length > 0) {
    console.log(`   Features: ${featureSummary.join(', ')}`);
  }
  
  // Top targets
  if (targetStats.length > 0) {
    console.log(`   Top Targets: ${targetStats.slice(0, 3).map(t => `${t.target} (${t.call_count} calls, ${t.total_credits} credits)`).join(', ')}`);
  }
  
  // Plan recommendations
  console.log(`   Free Plan Usage: ${percentOfFreePlan.toFixed(2)}%`);
  console.log(`   Hobby Plan Usage: ${percentOfHobbyPlan.toFixed(4)}%`);
  
  if (monthlyProjection.credits_per_month > freeTierLimit) {
    console.log(`   ⚠️  Projected monthly: ${monthlyProjection.credits_per_month.toLocaleString()} credits`);
    console.log(`   📊 Recommended: ${monthlyProjection.recommended_plan}`);
  }
  
  // Warnings
  if (hasWarnings) {
    console.log(`   ⚠️  WARNINGS: ${warnings.join(', ')}`);
  }
} else {
  console.log('ℹ️  No ScraperAPI calls detected in this execution');
}

return [{ json: simplified }];
