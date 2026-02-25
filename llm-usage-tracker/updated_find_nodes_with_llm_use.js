/**
 * n8n JavaScript Code - Extract LLM usage + workflow metadata
 * Extracts node execution data and LLM run data from agentic framework
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

// Navigate to runData - adjust path if needed
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

// Initialize output structures
const all_nodes_summary = [];
const llm_run_data = {};

// Process each node
Object.keys(runData).forEach(nodeName => {
  const nodeExecutions = runData[nodeName];
  
  // Process each execution in the node's array
  nodeExecutions.forEach((execution, idx) => {
    // Store node execution summary
    all_nodes_summary.push({
      nodeName: nodeName,
      arrayIndex: idx,
      startTime: execution.startTime,
      executionTime: execution.executionTime,
      executionIndex: execution.executionIndex,
      executionStatus: execution.executionStatus
    });
    
    // Helper function to find ai_languageModel at level 0 and 1
    function findAILanguageModel(obj, depth = 0) {
      const found = [];
      
      if (!obj || depth > 1) return found;
      
      // Check current level
      if (obj.ai_languageModel) {
        found.push({ path: 'level_' + depth, data: obj.ai_languageModel });
      }
      
      // Check next level if at depth 0
      if (depth === 0) {
        Object.keys(obj).forEach(key => {
          if (key !== 'ai_languageModel' && typeof obj[key] === 'object' && obj[key]) {
            if (obj[key].ai_languageModel) {
              found.push({ path: key, data: obj[key].ai_languageModel });
            }
          }
        });
      }
      
      return found;
    }
    
    // Look for ai_languageModel in data
    if (execution.data) {
      const aiModels = findAILanguageModel(execution.data);
      
      aiModels.forEach(model => {
        // ai_languageModel is list of lists
        model.data.forEach((outerList, i) => {
          if (Array.isArray(outerList)) {
            outerList.forEach((item, ii) => {
              if (item?.json) {
                const key = `llm_${nodeName}_${idx}_${i}_${ii}`;
                // Store the entire json object
                llm_run_data[key] = item.json;
              }
            });
          }
        });
      });
    }
    
    // Look for ai_languageModel in inputOverride
    if (execution.inputOverride) {
      const aiModels = findAILanguageModel(execution.inputOverride);
      
      aiModels.forEach(model => {
        // ai_languageModel is list of lists
        model.data.forEach((outerList, i) => {
          if (Array.isArray(outerList)) {
            outerList.forEach((item, ii) => {
              if (item?.json) {
                const key = `llm_${nodeName}_${idx}_${i}_${ii}_inputOverride`;
                
                // Check if we already have this from data
                const dataKey = `llm_${nodeName}_${idx}_${i}_${ii}`;
                if (llm_run_data[dataKey]) {
                  // Merge options from inputOverride with data
                  llm_run_data[dataKey] = {
                    ...llm_run_data[dataKey],
                    ...item.json
                  };
                } else {
                  // Add as new entry
                  llm_run_data[key] = item.json;
                }
              }
            });
          }
        });
      });
    }
  });
});

// Calculate tokensByModel
const tokensByModel = {};

Object.values(llm_run_data).forEach(item => {
  // item is the complete json object from ai_languageModel
  // Get model from options.model or directly from item
  const model = item.options?.model || item.model || 'unknown';
  
  if (!tokensByModel[model]) {
    tokensByModel[model] = {
      count: 0,
      estimatedTokens: 0,
      actualTokens: 0,
      completionTokens: 0,
      promptTokens: 0
    };
  }
  
  tokensByModel[model].count++;
  tokensByModel[model].estimatedTokens += item.estimatedTokens || 0;
  
  // Read tokenUsage correctly from json.tokenUsage dictionary
  // Structure: json.tokenUsage.totalTokens, json.tokenUsage.completionTokens, json.tokenUsage.promptTokens
  if (item.tokenUsage && typeof item.tokenUsage === 'object') {
    tokensByModel[model].actualTokens += item.tokenUsage.totalTokens || 0;
    tokensByModel[model].completionTokens += item.tokenUsage.completionTokens || 0;
    tokensByModel[model].promptTokens += item.tokenUsage.promptTokens || 0;
  }
});

// Return the extracted data WITH workflow metadata
return [{
  json: {
    // Workflow metadata
    workflow_name: workflowName,
    workflow_id: workflowId,
    execution_id: executionId,
    execution_status: executionStatus,
    started_at: startedAt,
    stopped_at: stoppedAt,
    
    // LLM usage data
    all_nodes_summary: all_nodes_summary,
    llm_run_data: llm_run_data,
    tokensByModel: tokensByModel
  }
}];
