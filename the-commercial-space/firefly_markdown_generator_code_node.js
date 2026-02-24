// Firefly Aerospace Markdown Generator Code Node
// Combines article metadata and content into markdown format
// Expects: Article Check Filter1 (metadata) and Article Cleanup1 (content) nodes

// Get metadata from Article Check Filter node
const metadataItems = $('Article Check Filter1').all();

// Check if we received a "no articles" message
if (metadataItems[0]?.json.message) {
  // Return simple markdown with the message
  return [{
    json: {
      markdown_firefly_articles: `# Firefly Aerospace News Articles\n\n*Generated on ${new Date().toLocaleString()}*\n\n${metadataItems[0].json.message}\n`,
      article_count: 0,
      generated_at: new Date().toISOString(),
      articles: []
    }
  }];
}

// Get content from Article Cleanup node
const contentItems = $('Article Cleanup1').all();

// Build markdown content for all articles
let markdown = '# Firefly Aerospace News Articles\n\n';
markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
markdown += `**Total Articles:** ${metadataItems.length}\n\n`;
markdown += '---\n\n';

// Process each article by combining metadata and content
for (let i = 0; i < metadataItems.length; i++) {
  const metadata = metadataItems[i].json;
  const content = contentItems[i]?.json || {};
  
  // Article header with title
  markdown += `## ${i + 1}. ${metadata.title}\n\n`;
  
  // Metadata
  markdown += `**Date:** ${metadata.date}\n\n`;
  markdown += `**URL:** [${metadata.url}](${metadata.url})\n\n`;
  
  // Featured image (if available)
  if (metadata.thumbnail) {
    markdown += `**Featured Image:**\n\n`;
    markdown += `![${metadata.title}](${metadata.thumbnail})\n\n`;
  }
  
  // Article content
  if (content.content) {
    markdown += `### Article Content\n\n`;
    markdown += `${content.content}\n\n`;
    markdown += `*Word Count: ${content.word_count || 0} words*\n\n`;
  } else {
    markdown += `*No content available*\n\n`;
  }
  
  // Separator between articles
  markdown += '---\n\n';
}

// Return single item with all articles in markdown
return [{
  json: {
    markdown_firefly_articles: markdown,
    article_count: metadataItems.length,
    generated_at: new Date().toISOString(),
    articles: metadataItems.map((item, i) => ({
      title: item.json.title,
      url: item.json.url,
      date: item.json.date,
      thumbnail: item.json.thumbnail,
      word_count: contentItems[i]?.json.word_count || 0
    }))
  }
}];
