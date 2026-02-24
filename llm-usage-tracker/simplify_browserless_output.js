// Simplify Browserless Usage Tracker output for data table storage
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
const totalUnits = usageSummary.total_units_used || 0;
const totalTimeUsed = usageSummary.total_time_used || '0s';
const unitsRemaining = usageSummary.units_remaining || 0;
const percentUsed = parseFloat(usageSummary.percent_used || 0);
const planLimit = usageSummary.plan_limit || 6000;
const currentPlan = usageSummary.current_plan || 'free';
const avgUnitsPerCall = parseFloat(usageSummary.average_units_per_call || 0);

// Get pricing reference for plan limits
const pricingRef = trackerOutput.pricing_reference || {};
const availablePlans = pricingRef.available_plans || {};
const freePlanLimit = availablePlans.free?.units || 6000;
const mediumPlanLimit = availablePlans.medium?.units || 600000;
const largePlanLimit = availablePlans.large?.units || 3600000;

// Calculate percentages for different plans
const percentOfFreePlan = parseFloat(((totalUnits / freePlanLimit) * 100).toFixed(2));
const percentOfMediumPlan = parseFloat(((totalUnits / mediumPlanLimit) * 100).toFixed(4));
const percentOfLargePlan = parseFloat(((totalUnits / largePlanLimit) * 100).toFixed(4));

// Get endpoint breakdown
const endpointBreakdown = trackerOutput.endpoint_breakdown || {};
const endpointStats = Object.keys(endpointBreakdown).map(endpoint => {
  const endpointData = endpointBreakdown[endpoint];
  return {
    endpoint: endpoint,
    call_count: endpointData.calls || 0,
    total_units: endpointData.units || 0,
    avg_units_per_call: parseFloat(endpointData.avgUnitsPerCall || 0)
  };
}).sort((a, b) => b.total_units - a.total_units); // Sort by units (highest first)

// Get target breakdown
const targetBreakdown = trackerOutput.target_breakdown || {};
const targetStats = Object.keys(targetBreakdown).map(target => {
  const targetData = targetBreakdown[target];
  return {
    target: target,
    call_count: targetData.calls || 0,
    total_units: targetData.units || 0,
    avg_units_per_call: targetData.calls > 0 ? parseFloat((targetData.units / targetData.calls).toFixed(2)) : 0
  };
}).sort((a, b) => b.total_units - a.total_units); // Sort by units (highest first)

// Calculate estimated monthly cost if current rate continues
const monthlyProjection = {
  units_per_month: Math.round((totalUnits / 1) * 30), // Rough estimate if this is daily usage
  free_plan_sufficient: false,
  recommended_plan: 'Free'
};

if (monthlyProjection.units_per_month <= freePlanLimit) {
  monthlyProjection.free_plan_sufficient = true;
  monthlyProjection.recommended_plan = 'Free (6K units/month)';
} else if (monthlyProjection.units_per_month <= mediumPlanLimit) {
  monthlyProjection.recommended_plan = 'Medium (600K units/month)';
} else if (monthlyProjection.units_per_month <= largePlanLimit) {
  monthlyProjection.recommended_plan = 'Large (3.6M units/month)';
} else {
  monthlyProjection.recommended_plan = 'Enterprise (custom)';
}

// Build simplified output
const simplified = {
  // Execution info
  workflow_name: workflowName,
  execution_id: executionId,
  execution_time: executionTime,
  execution_status: executionStatus,
  
  // API usage summary
  total_api_calls: totalCalls,
  total_units_used: totalUnits,
  total_time_used: totalTimeUsed,
  avg_units_per_call: avgUnitsPerCall,
  
  // Current plan status
  current_plan: currentPlan,
  plan_limit: planLimit,
  units_remaining: unitsRemaining,
  percent_used: percentUsed,
  
  // Plan usage percentages (for comparison)
  percent_of_free_plan: percentOfFreePlan,
  percent_of_medium_plan: percentOfMediumPlan,
  percent_of_large_plan: percentOfLargePlan,
  
  // Endpoint breakdown (only top 3 for brevity)
  top_endpoints: endpointStats.slice(0, 3),
  
  // Target breakdown (only top 5 for brevity)
  top_targets: targetStats.slice(0, 5),
  
  // Monthly projection (very rough estimate)
  monthly_projection: monthlyProjection,
  
  // Summary string for quick reference
  summary: totalCalls > 0 
    ? `${workflowName}: ${totalCalls} Browserless call(s), ${totalUnits} units (${totalTimeUsed}), ${percentOfFreePlan.toFixed(2)}% of free plan`
    : `${workflowName}: No Browserless API calls detected`
};

// Console output for debugging
if (totalCalls > 0) {
  console.log('🌐 Simplified Browserless Usage Summary:');
  console.log(`   Workflow: ${workflowName}`);
  console.log(`   API Calls: ${totalCalls}`);
  console.log(`   Units Used: ${totalUnits} (${totalTimeUsed})`);
  console.log(`   Plan: ${currentPlan} - ${percentUsed}% used (${unitsRemaining} units remaining)`);
  console.log(`   Free Plan Usage: ${percentOfFreePlan.toFixed(2)}%`);
  console.log(`   Medium Plan Usage: ${percentOfMediumPlan.toFixed(4)}%`);
  
  if (endpointStats.length > 0) {
    console.log(`   Endpoints: ${endpointStats.map(e => `${e.endpoint} (${e.call_count} calls, ${e.total_units} units)`).join(', ')}`);
  }
  
  if (targetStats.length > 0) {
    console.log(`   Top Targets: ${targetStats.slice(0, 3).map(t => `${t.target} (${t.call_count} calls)`).join(', ')}`);
  }
  
  if (monthlyProjection.units_per_month > freePlanLimit) {
    console.log(`   ⚠️  Projected monthly: ${monthlyProjection.units_per_month.toLocaleString()} units - Recommend: ${monthlyProjection.recommended_plan}`);
  }
} else {
  console.log('ℹ️  No Browserless API calls detected in this execution');
}

return [{ json: simplified }];
