// Axiom Content Combiner Code Node
// Combines markdown from Axiom API Content and Official Content nodes

// Get content from both source nodes
const apiContent = $('Axiom API Content').first().json.markdown_axiom_api_content || '';
const officialContent = $('Official Content3').first().json.markdown_axiom_official_content || '';

// Combine the markdown content
const combinedMarkdown = `${apiContent}\n\n${officialContent}`;

// Return single item with combined content
return [{
  json: {
    all_axiom_content: combinedMarkdown,
    generated_at: new Date().toISOString(),
    api_content_length: apiContent.length,
    official_content_length: officialContent.length,
    total_length: combinedMarkdown.length
  }
}];
