// === INPUT: Articles from RSS feed ===
// === OUTPUT: Single markdown string with all SpaceQ articles ===

// Grab articles safely (handles all n8n input types)
let allArticles = [];
if (Array.isArray($input.all())) {
  allArticles = $input.all().map(item => item.json);
} else if (Array.isArray($json)) {
  allArticles = $json;
} else if ($json && typeof $json === 'object') {
  allArticles = [$json];
}

// Flatten in case it's nested under "results"
if (allArticles[0]?.results) {
  allArticles = allArticles[0].results;
}

// 30 days ago
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

// Filter articles from last 30 days
const filtered = allArticles
  .filter(article => {
    const dateStr = article.isoDate || article.pubDate;
    if (!dateStr) return false;
    const articleDate = new Date(dateStr);
    return !isNaN(articleDate) && articleDate.getTime() >= thirtyDaysAgo;
  })
  .sort((a, b) => new Date(b.pubDate || b.isoDate) - new Date(a.pubDate || a.isoDate)); // newest first

// If no articles found
if (filtered.length === 0) {
  return [{ json: { markdown_spaceq: '### SpaceQ Articles (Last 30 Days)\n\nNo articles found from the last 30 days.\n' } }];
}

// Build single markdown string with all articles
let markdown = '### SpaceQ Articles (Last 30 Days)\n\n';

filtered.forEach((article, index) => {
  const title = article.title || 'Untitled';
  const link = article.link || '#';
  const pubDate = article.pubDate || article.isoDate || 'Unknown';
  const contentSnippet = article.contentSnippet || article.content || 'No preview available.';

  markdown += `#### ${index + 1}. [${title}](${link})\n\n`;
  markdown += `**Date:** ${pubDate}\n\n`;
  markdown += `${contentSnippet}\n\n`;
  markdown += `**Source:** [Read Full Article](${link})\n\n---\n\n`;
});

// Return single item with all articles combined
return [{ json: { markdown_spaceq: markdown } }];
