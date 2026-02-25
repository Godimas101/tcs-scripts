// Stoked Space Article Cleanup Code Node
// Extracts and cleans article content from scraped Stoked Space pages
// Expects: scraped HTML with metadata from extraction node

// Process all items from the loop
const results = [];

for (const item of $input.all()) {
  // Get the HTML content from ScraperAPI response
  const htmlContent = item.json.body || item.json.data;
  
  // Get the article metadata from the item
  const articleMeta = item.json;
  
  // Extract the article content from post__content-container div
  const contentRegex = /<div[^>]*class="[^"]*post__content-container[^"]*"[^>]*>([\s\S]*?)<\/div>/;
  const match = htmlContent.match(contentRegex);
  
  let articleContent = '';
  let cleanContent = '';
  
  if (match && match[1]) {
    articleContent = match[1];
    
    // Clean up the HTML - remove tags but keep text
    cleanContent = articleContent
      .replace(/<br\s*\/?>/gi, '\n')           // Convert <br> to newlines
      .replace(/<\/p>/gi, '\n\n')              // Convert </p> to double newlines
      .replace(/<p[^>]*>/gi, '')               // Remove <p> tags
      .replace(/<\/h[1-6]>/gi, '\n\n')         // Convert heading closures to newlines
      .replace(/<h[1-6][^>]*>/gi, '')          // Remove heading tags
      .replace(/<strong>/gi, '')               // Remove <strong> tags
      .replace(/<\/strong>/gi, '')             // Remove </strong> tags
      .replace(/<em>/gi, '')                   // Remove <em> tags
      .replace(/<\/em>/gi, '')                 // Remove </em> tags
      .replace(/<a[^>]*>/gi, '')               // Remove <a> tags
      .replace(/<\/a>/gi, '')                  // Remove </a> tags
      .replace(/<[^>]+>/g, '')                 // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ')                 // Replace &nbsp; with space
      .replace(/&amp;/g, '&')                  // Replace &amp; with &
      .replace(/&#x27;/g, "'")                 // Replace &#x27; with '
      .replace(/&quot;/g, '"')                 // Replace &quot; with "
      .replace(/&lt;/g, '<')                   // Replace &lt; with <
      .replace(/&gt;/g, '>')                   // Replace &gt; with >
      .replace(/\n\s*\n\s*\n/g, '\n\n')        // Collapse multiple newlines
      .trim();                                  // Trim whitespace
  }
  
  // Add to results array
  results.push({
    json: {
      title: articleMeta.title,
      url: articleMeta.url,
      date: articleMeta.date,
      thumbnail: articleMeta.thumbnail,
      source: articleMeta.source || 'Stoked Space',
      content: cleanContent,
      raw_html_content: articleContent,
      word_count: cleanContent.split(/\s+/).length,
      character_count: cleanContent.length,
      has_content: cleanContent.length > 0
    }
  });
}

// Return all processed articles
return results;
