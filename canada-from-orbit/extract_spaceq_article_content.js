// SpaceQ Article Cleanup Code Node
// Extracts and cleans article content from SpaceQ HTML scrapes
// Input: item.json with HTML in article, data, body, or html field
// Output: {title, url, date, thumbnail, images[], source, content, raw_html_content, word_count, character_count, has_content}

let items = $input.all();
let results = [];

for (let item of items) {
  try {
    // Get HTML content from various possible field names
    let html = item.json.article || item.json.data || item.json.body || item.json.html || '';
    
    if (!html) {
      results.push({
        json: {
          error: 'No HTML content found',
          title: '',
          url: item.json.url || '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'SpaceQ',
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
    const titleRegex = /<h1 class="entry-title[^"]*">\s*([^<]+)\s*<\/h1>/;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    const urlMatch = html.match(/<meta property="og:url" content="([^"]+)"\s*\/?>/);
    const url = urlMatch ? urlMatch[1] : item.json.url || '';

    // Extract date from time.entry-date
    const dateRegex = /<time class="entry-date[^"]*" datetime="([^"]+)"[^>]*>([^<]+)<\/time>/;
    const dateMatch = html.match(dateRegex);
    const date = dateMatch ? dateMatch[2].trim() : '';

    // Extract thumbnail from og:image meta tag
    const thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"\s*\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract main content from div.entry-content
    const contentStartRegex = /<div class="entry-content">/;
    const contentStartMatch = html.match(contentStartRegex);
    
    let contentHtml = '';
    if (contentStartMatch) {
      const startIndex = contentStartMatch.index + contentStartMatch[0].length;
      const afterStart = html.substring(startIndex);
      
      // Content ends at closing </div><!-- .entry-content -->
      const endIndex = afterStart.search(/<\/div><!-- \.entry-content -->/);
      contentHtml = endIndex > 0 ? afterStart.substring(0, endIndex) : afterStart;
    }

    if (!contentHtml) {
      results.push({
        json: {
          error: 'Article content not found',
          title: title,
          url: url,
          date: date,
          thumbnail: thumbnail,
          images: [],
          source: 'SpaceQ',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Remove unwanted elements before text extraction
    let cleaned = contentHtml
      // Remove style blocks
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove script blocks
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove related posts section (jp-relatedposts)
      .replace(/<div[^>]*id=['"]jp-relatedposts['"][^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove figure elements (images will be extracted separately)
      .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
      // Remove iframes
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

    // Extract all images from content
    const images = [];
    const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imageRegex.exec(contentHtml)) !== null) {
      let imgSrc = imgMatch[1];
      // Skip lazy-load placeholders and small images
      if (!imgSrc.includes('data:image/svg') && 
          !imgSrc.includes('base64') &&
          !imgSrc.includes('gravatar') &&
          (imgSrc.includes('.jpg') || imgSrc.includes('.png') || imgSrc.includes('.webp'))) {
        // Strip query parameters
        imgSrc = imgSrc.split('?')[0];
        if (!images.includes(imgSrc)) {
          images.push(imgSrc);
        }
      }
    }

    // If no content images found, use thumbnail as fallback
    if (images.length === 0 && thumbnail) {
      images.push(thumbnail.split('?')[0]);
    }

    // Strip query parameters from thumbnail
    if (thumbnail) {
      thumbnail = thumbnail.split('?')[0];
    }

    // Now clean up remaining HTML tags and decode entities
    let cleanContent = cleaned
      .replace(/<br\s*\/?>/gi, '\n')                   // Line breaks to newlines
      .replace(/<\/p>/gi, '\n\n')                       // Paragraphs to double newlines
      .replace(/<\/h[1-6]>/gi, '\n\n')                  // Headings to double newlines
      .replace(/<[^>]+>/g, ' ')                         // Strip all HTML tags
      .replace(/&nbsp;/g, ' ')                          // Non-breaking space
      .replace(/&amp;/g, '&')                           // Ampersand
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|"|"/g, '"') // Smart quotes
      .replace(/&#8217;|&#8216;|&lsquo;|&rsquo;|'|&#x27;/g, "'") // Smart apostrophes
      .replace(/&#8211;|&ndash;/g, '–')                 // En dash
      .replace(/&#8212;|&mdash;/g, '—')                 // Em dash
      .replace(/&lt;/g, '<')                            // Less than
      .replace(/&gt;/g, '>')                            // Greater than
      .replace(/&quot;/g, '"')                          // Quote
      .replace(/\s+/g, ' ')                             // Collapse whitespace
      .trim();

    results.push({
      json: {
        title: title,
        url: url,
        date: date,
        thumbnail: thumbnail,
        images: images,
        source: 'SpaceQ',
        content: cleanContent,
        raw_html_content: contentHtml,
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
        source: 'SpaceQ',
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
