// Ars Technica Article Cleanup Code Node
// Extracts and cleans article content from scraped Ars Technica pages
// Expects: scraped HTML with metadata from extraction node

// Process all items from the loop
let items = $input.all();
let results = [];

for (let item of items) {
  try {
    // Get the HTML content from various possible field names
    let htmlContent = item.json.article || item.json.data || item.json.body || item.json.html || '';
    
    if (!htmlContent) {
      results.push({
        json: {
          error: 'No HTML content found',
          title: '',
          url: item.json.url || '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'Ars Technica',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }
  
  // Extract title from <h1> tag with specific Ars Technica classes
  const titleRegex = /<h1[^>]*class="[^"]*font-serif[^"]*"[^>]*>([\s\S]*?)<\/h1>/;
  const titleMatch = htmlContent.match(titleRegex);
  let title = '';
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
  }
  
  // Extract URL from og:url meta tag
  const urlRegex = /<meta property="og:url" content="([^"]+)">/;
  const urlMatch = htmlContent.match(urlRegex);
  let articleUrl = urlMatch ? urlMatch[1] : (item.json.url || '');
  
  // Extract publish date from JSON-LD schema
  const dateRegex = /"datePublished":"([^"]+)"/;
  const dateMatch = htmlContent.match(dateRegex);
  let publishDate = dateMatch ? dateMatch[1] : '';
  
  // Extract featured image from og:image meta tag
  const imageRegex = /<meta property="og:image" content="([^"]+)">/;
  const imageMatch = htmlContent.match(imageRegex);
  let featuredImage = imageMatch ? imageMatch[1] : '';
  
  // Extract ALL post-content divs (article is split across multiple sections)
  const contentPattern = /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  const contentMatches = htmlContent.match(contentPattern);
  let allArticleContent = '';
  if (contentMatches) {
    allArticleContent = contentMatches.join('\n\n');
  }
  
  let cleanContent = '';
  let articleImages = [];
  
  if (allArticleContent) {
    // Clean up the HTML - remove unwanted elements first
    let cleaned = allArticleContent
      // Remove style blocks
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove script blocks
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove ad divs
      .replace(/<div[^>]*class="[^"]*teads[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*cns-ads[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove interlude/video player containers
      .replace(/<div[^>]*class="[^"]*ars-interlude[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '')
      .replace(/<div[^>]*class="[^"]*cne-interlude[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove author bio sections (must be before general div cleanup)
      .replace(/<div[^>]*class="[^"]*author-mini-bio[^"]*"[^>]*>[\s\S]*$/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      // Remove figure tags with captions
      .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
      // Remove iframes
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
    
    // Extract all images from cleaned content (after author bio removal)
    const imagePattern = /<img[^>]+src="([^"]+)"[^>]*>/g;
    const articleImages = [];
    let imgMatch;
    while ((imgMatch = imagePattern.exec(cleaned)) !== null) {
      if (imgMatch[1] && !imgMatch[1].includes('data:image')) {
        articleImages.push(imgMatch[1]);
      }
    }
    
    // Now clean up text formatting
    cleanContent = cleaned
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
      .replace(/\n\s*\n\s*\n+/g, '\n\n')       // Collapse multiple newlines
      .trim();                                  // Trim whitespace
  }
  
  // Add to results array
  results.push({
    json: {
      title: title,
      url: articleUrl,
      date: publishDate,
      thumbnail: featuredImage,
      images: articleImages,
      source: 'Ars Technica',
      content: cleanContent,
      raw_html_content: allArticleContent,
      word_count: cleanContent.split(/\s+/).length,
      character_count: cleanContent.length,
      has_content: cleanContent.length > 0
    }
  });

  } catch (error) {
    results.push({
      json: {
        error: error.message,
        title: '',
        url: item.json.url || '',
        date: '',
        thumbnail: '',
        images: [],
        source: 'Ars Technica',
        content: '',
        raw_html_content: '',
        word_count: 0,
        character_count: 0,
        has_content: false
      }
    });
  }
}

// Return all processed articles
return results;
