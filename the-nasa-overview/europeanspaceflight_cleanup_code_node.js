// European Spaceflight Article Cleanup Code Node
// Extracts and cleans article content from European Spaceflight HTML scrapes
// Input: item.json.data or item.json.body contains HTML string
// Output: {title, url, date, thumbnail, images[], source, content, raw_html_content, word_count, character_count, has_content}

const items = $input.all();
const results = [];

for (const item of items) {
  try {
    // Get HTML content from various possible field names
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
          source: 'European Spaceflight',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from h1.entry-title
    const titleMatch = htmlContent.match(/<h1 class="entry-title">([\s\S]*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    const urlMatch = htmlContent.match(/<meta property="og:url" content="([^"]+)" ?\/?>/);
    const url = urlMatch ? urlMatch[1] : item.json.url || '';

    // Extract date from time.entry-date
    const dateMatch = htmlContent.match(/<time class="entry-date[^"]*" datetime="[^"]*" ?>([^<]+)<\/time>/);
    const date = dateMatch ? dateMatch[1].trim() : '';

    // Extract featured image from og:image meta tag
    const thumbnailMatch = htmlContent.match(/<meta property="og:image" content="([^"]+)" ?\/?>/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract main article content from td-post-content div
    // Find the start of td-post-content
    const contentStartMatch = htmlContent.match(/<div class="td-post-content tagdiv-type">/);
    if (!contentStartMatch) {
      // Try without the closing tag constraint - get everything after td-post-content starts
      const simpleMatch = htmlContent.match(/<div class="td-post-content[^>]*">([\s\S]*)/);
      allArticleContent = simpleMatch ? simpleMatch[1] : '';
    } else {
      const startIndex = contentStartMatch.index + contentStartMatch[0].length;
      // Find the closing of this div by looking for the article tag or footer
      const afterContent = htmlContent.substring(startIndex);
      const endMatch = afterContent.search(/<\/div>\s*<\/article>|<footer/);
      allArticleContent = endMatch > 0 ? afterContent.substring(0, endMatch) : afterContent;
    }

    // Remove unwanted elements before text extraction
    let cleaned = allArticleContent;
    
    // Remove style blocks
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove script blocks
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove donation sections
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*wdpgk_donation[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove share buttons and social media links
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*td-social[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove related posts sections
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*td_block_related[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove navigation sections
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*td-post-next-prev[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove comments sections
    cleaned = cleaned.replace(/<div[^>]*id="comments"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove figure elements (images will be extracted separately)
    cleaned = cleaned.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
    
    // Remove iframes
    cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

    // Extract images from article content (before cleaning)
    const images = [];
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(allArticleContent)) !== null) {
      const imgSrc = imgMatch[1];
      // Skip lazy-load placeholders and small images
      if (!imgSrc.includes('data:image/svg') && 
          !imgSrc.includes('base64') &&
          (imgSrc.includes('.webp') || imgSrc.includes('.jpg') || imgSrc.includes('.png'))) {
        if (!images.includes(imgSrc)) {
          images.push(imgSrc);
        }
      }
    }

    // Strip all HTML tags
    let textContent = cleaned.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    textContent = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—');
    
    // Collapse multiple spaces and newlines
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Calculate metrics
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = textContent.length;
    const hasContent = textContent.length > 0;

    results.push({
      json: {
        title,
        url,
        date,
        thumbnail,
        images,
        source: 'European Spaceflight',
        content: textContent,
        raw_html_content: allArticleContent,
        word_count: wordCount,
        character_count: characterCount,
        has_content: hasContent
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
        source: 'European Spaceflight',
        content: '',
        raw_html_content: '',
        word_count: 0,
        character_count: 0,
        has_content: false
      }
    });
  }
}

return results;
