// SpaceX Updates to Markdown Conversion Node
// Converts cleaned SpaceX article data into consolidated markdown document
// Input: Array of cleaned article objects from spacex_cleanup_code_node
// Output: Single markdown document with all valid articles

// Get all input items from previous cleanup node
const items = $input.all();

// Filter out items with errors (No articles from the past 7 days)
const validArticles = items.filter(item => {
  const data = item.json;
  return !data.error && data.has_content && data.title && data.content;
});

// If no valid articles found, return empty markdown
if (validArticles.length === 0) {
  return [{
    json: {
      markdown: "# SpaceX Updates\n\nNo SpaceX updates from the past 7 days.",
      article_count: 0,
      sources: ['SpaceX'],
      total_words: 0,
      generated_date: new Date().toISOString()
    }
  }];
}

// Build markdown document
let markdown = "# SpaceX Updates\n\n";
markdown += `*Generated on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}*\n\n`;
markdown += `**Total Articles:** ${validArticles.length}\n\n`;
markdown += "---\n\n";

// Process each valid article
validArticles.forEach((item, index) => {
  const article = item.json;
  
  // Article title as heading with URL
  if (article.url) {
    markdown += `## ${index + 1}. [${article.title}](${article.url})\n\n`;
  } else {
    markdown += `## ${index + 1}. ${article.title}\n\n`;
  }
  
  // Source and date metadata
  const metaParts = [];
  if (article.source) {
    metaParts.push(`**Source:** ${article.source}`);
  }
  if (article.date) {
    metaParts.push(`**Date:** ${article.date}`);
  }
  if (article.word_count) {
    metaParts.push(`**Length:** ${article.word_count.toLocaleString()} words`);
  }
  
  if (metaParts.length > 0) {
    markdown += metaParts.join(" | ") + "\n\n";
  }
  
  // Featured/thumbnail image (SpaceX doesn't have thumbnails, but keep for consistency)
  if (article.thumbnail) {
    markdown += `![Featured Image](${article.thumbnail})\n\n`;
  }
  
  // Article content
  if (article.content) {
    markdown += article.content + "\n\n";
  }
  
  // Additional images (excluding thumbnail)
  if (article.images && article.images.length > 0) {
    const additionalImages = article.images.filter(img => img !== article.thumbnail);
    
    if (additionalImages.length > 0) {
      markdown += "### Additional Images\n\n";
      additionalImages.forEach((imageUrl, imgIndex) => {
        markdown += `![Image ${imgIndex + 1}](${imageUrl})\n\n`;
      });
    }
  }
  
  // Separator between articles
  markdown += "---\n\n";
});

// Add footer
markdown += "*End of SpaceX Updates*\n";

// Return single item with consolidated markdown
return [{
  json: {
    markdown: markdown,
    article_count: validArticles.length,
    sources: [...new Set(validArticles.map(item => item.json.source))],
    total_words: validArticles.reduce((sum, item) => sum + (item.json.word_count || 0), 0),
    generated_date: new Date().toISOString()
  }
}];
