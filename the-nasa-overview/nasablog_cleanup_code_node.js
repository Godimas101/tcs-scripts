// NASA Blog Cleanup Code Node
// Extracts and cleans article content from NASA Blog HTML scrapes
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
          source: 'NASA Blog',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1 with margin classes
    const titleRegex = /<h1[^>]*class="[^"]*margin-bottom-[^"]*"[^>]*>(.*?)<\/h1>/s;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract URL from og:url or canonical meta tag
    const urlRegex = /<meta property="og:url" content="([^"]+)"|<link rel="canonical" href="([^"]+)"/;
    const urlMatch = html.match(urlRegex);
    const url = urlMatch ? (urlMatch[1] || urlMatch[2]) : item.json.url || '';

    // Extract date from time element in post-date div
    const dateRegex = /<div class="post-date"[^>]*>[\s\S]*?<time[^>]*datetime="([^"]+)">/;
    const dateMatch = html.match(dateRegex);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract thumbnail from og:image meta tag
    const thumbnailRegex = /<meta property="og:image" content="([^"]+)"/;
    const thumbnailMatch = html.match(thumbnailRegex);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract main content from single-blog-content div until mobile-credits
    const contentStartRegex = /<div[^>]*class="[^"]*single-blog-content[^"]*"[^>]*itemprop="articleBody"[^>]*>/;
    const contentStartMatch = html.match(contentStartRegex);
    
    let contentHtml = '';
    if (contentStartMatch) {
      const startIndex = contentStartMatch.index + contentStartMatch[0].length;
      const afterStart = html.substring(startIndex);
      
      // Content ends at mobile-credits div
      const endIndex = afterStart.search(/<div class="mobile-credits/);
      contentHtml = endIndex > 0 ? afterStart.substring(0, endIndex) : afterStart;
    }

    // Remove the H1 title from content (it's already extracted)
    contentHtml = contentHtml.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, '');
    
    // Remove unwanted elements before text extraction
    let cleaned = contentHtml
      // Remove figcaptions (image credits)
      .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '')
      // Remove featured image wrapper
      .replace(/<div[^>]*class="[^"]*hds-media[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      // Remove text/image credit lines
      .replace(/<p[^>]*class="[^"]*wp-element-caption[^"]*"[^>]*>[\s\S]*?<\/p>/gi, '')
      .replace(/Image credit:.*?(?=<|$)/gi, '')
      .replace(/Photo credit:.*?(?=<|$)/gi, '')
      // Remove scripts
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove styles
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Extract all images from content (before cleaning HTML)
    const images = [];
    const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imageRegex.exec(contentHtml)) !== null) {
      let imgSrc = imgMatch[1];
      // Strip query parameters
      imgSrc = imgSrc.split('?')[0];
      if (!images.includes(imgSrc) && !imgSrc.includes('gravatar')) {
        images.push(imgSrc);
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
      .replace(/<[^>]+>/g, ' ')                         // Strip all HTML tags
      .replace(/&nbsp;/g, ' ')                          // Non-breaking space
      .replace(/&amp;/g, '&')                           // Ampersand
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"') // Smart quotes
      .replace(/&#8217;|&#8216;|&lsquo;|&rsquo;/g, "'") // Smart apostrophes
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
        source: 'NASA Blog',
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
        source: 'NASA Blog',
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
