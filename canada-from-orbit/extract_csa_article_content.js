// CSA Article Content Extractor
// Extracts full article content from Canadian Space Agency article pages
// Output format compatible with Space Scout pattern

// ===== HELPER FUNCTIONS =====

/**
 * Extract URL from HTML if not provided in item
 */
function extractUrlFromHtml(html) {
  // Try canonical link
  let match = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (match) return match[1];
  
  // Try og:url meta tag
  match = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/i);
  if (match) return match[1];
  
  return '';
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

/**
 * Extract meta tag content
 */
function getMetaTag(html, property) {
  const patterns = [
    new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]+)"`, 'i'),
    new RegExp(`<meta\\s+content="([^"]+)"\\s+property="${property}"`, 'i'),
    new RegExp(`<meta\\s+name="${property}"\\s+content="([^"]+)"`, 'i'),
    new RegExp(`<meta\\s+content="([^"]+)"\\s+name="${property}"`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return '';
}

/**
 * Extract title from multiple possible sources
 */
function extractTitle(html) {
  // Try H1 with property="name"
  let match = html.match(/<h1[^>]*property="name"[^>]*id="wb-cont"[^>]*>([^<]+)<\/h1>/i);
  if (match) {
    return decodeHtmlEntities(match[1].trim());
  }
  
  // Try regular H1
  match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (match) {
    return decodeHtmlEntities(match[1].trim());
  }
  
  // Try og:title meta tag
  const ogTitle = getMetaTag(html, 'og:title');
  if (ogTitle) {
    return decodeHtmlEntities(ogTitle);
  }
  
  // Try dcterms.title meta tag
  const dcTitle = getMetaTag(html, 'dcterms.title');
  if (dcTitle) {
    return decodeHtmlEntities(dcTitle);
  }
  
  // Try page title tag
  match = html.match(/<title>([^<]+)<\/title>/i);
  if (match) {
    let title = match[1].trim();
    // Remove " | Canadian Space Agency" suffix if present
    title = title.replace(/\s*\|\s*Canadian Space Agency\s*$/i, '');
    return decodeHtmlEntities(title);
  }
  
  return 'Untitled Article';
}

/**
 * Extract publication date
 */
function extractDate(html) {
  // Try dcterms.modified
  let date = getMetaTag(html, 'dcterms.modified');
  if (date) return date;
  
  // Try dcterms.issued
  date = getMetaTag(html, 'dcterms.issued');
  if (date) return date;
  
  // Try time datetime attribute
  const match = html.match(/<time[^>]*datetime="([^"]+)"/i);
  if (match) return match[1];
  
  return '';
}

/**
 * Extract thumbnail image
 */
function extractThumbnail(html) {
  // Try og:image
  let thumbnail = getMetaTag(html, 'og:image');
  if (thumbnail) {
    // Ensure absolute URL
    if (thumbnail.startsWith('/')) {
      thumbnail = 'https://www.asc-csa.gc.ca' + thumbnail;
    }
    return thumbnail;
  }
  
  // Try first large image in content
  const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*full-width[^"]*"/i);
  if (imgMatch) {
    let src = imgMatch[1];
    if (src.startsWith('/')) {
      src = 'https://www.asc-csa.gc.ca' + src;
    }
    return src;
  }
  
  return '';
}

/**
 * Extract main content
 */
function extractContent(html) {
  // Try to find main content area between <main> tags and before footer/scripts
  let contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (!contentMatch) {
    // Fallback: try to find content between wb-cont H1 and page details
    contentMatch = html.match(/<h1[^>]*id="wb-cont"[^>]*>[\s\S]*?<\/h1>([\s\S]*?)<div class="pagedetails">/i);
  }
  
  if (!contentMatch) {
    return '';
  }
  
  let content = contentMatch[1];
  
  // Remove the H1 title if it's at the start
  content = content.replace(/^[\s\S]*?<\/h1>\s*/i, '');
  
  // Remove scripts and styles
  content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove navigation, footer, and metadata sections
  content = content.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
  content = content.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
  content = content.replace(/<div class="pagedetails">[\s\S]*?<\/div>/gi, '');
  
  return content;
}

/**
 * Extract images from content
 */
function extractImages(html) {
  const images = [];
  const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1];
    
    // Skip data URIs, gravatars, and tiny icons
    if (src.startsWith('data:') || src.includes('gravatar') || src.includes('icon')) {
      continue;
    }
    
    // Only include actual image files
    if (!src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      continue;
    }
    
    // Make absolute URL
    if (src.startsWith('/')) {
      src = 'https://www.asc-csa.gc.ca' + src;
    }
    
    // Avoid duplicates
    if (!images.includes(src)) {
      images.push(src);
    }
  }
  
  return images;
}

/**
 * Clean HTML content to plain text
 */
function cleanHtmlToText(html) {
  let text = html;
  
  // Remove scripts and styles
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Replace block elements with line breaks
  text = text.replace(/<\/(div|p|br|h[1-6]|li|tr)>/gi, '\n');
  
  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = decodeHtmlEntities(text);
  
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/\n\s+/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

/**
 * Process a single article
 */
function processArticle(html, url) {
  // Extract all components
  const title = extractTitle(html);
  const date = extractDate(html);
  const thumbnail = extractThumbnail(html);
  const rawContent = extractContent(html);
  const images = extractImages(rawContent);
  const cleanContent = cleanHtmlToText(rawContent);
  
  // Calculate metrics
  const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = cleanContent.length;
  const hasContent = cleanContent.length > 0;
  
  return {
    title: title,
    url: url,
    date: date,
    thumbnail: thumbnail,
    source: 'Canadian Space Agency',
    images: images,
    content: cleanContent,
    word_count: wordCount,
    character_count: characterCount,
    has_content: hasContent
  };
}

// ===== MAIN EXECUTION =====

const results = items.map(item => {
  try {
    // Get HTML content from various possible properties
    const html = item.json.article || 
                 item.json.data || 
                 item.json.body || 
                 '';
    
    // Get URL with fallbacks
    let url = item.json.url || 
              item.json.requestUrl || 
              item.json.uri || 
              '';
    
    // If still no URL, try extracting from HTML
    if (!url) {
      url = extractUrlFromHtml(html);
    }
    
    // Process this article
    const articleData = processArticle(html, url);
    
    return { json: articleData };
    
  } catch (error) {
    // Individual error handling for this article
    return {
      json: {
        error: error.message,
        url: item.json?.url || 'unknown',
        has_content: false,
        title: 'Error extracting content'
      }
    };
  }
});

return results;
