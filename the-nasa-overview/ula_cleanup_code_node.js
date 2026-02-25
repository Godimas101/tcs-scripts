// United Launch Alliance (ULA) Blog Cleanup Code Node
// Extracts and cleans article content from ULA Blog HTML scrapes
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
          source: 'United Launch Alliance',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from span inside H2
    const titleRegex = /<span id="hs_cos_wrapper_name"[^>]*>(.*?)<\/span>/s;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract URL from og:url or canonical meta tag
    const urlMatch = html.match(/<meta property="og:url" content="([^"]+)"/) ||
                     html.match(/<link rel="canonical" href="([^"]+)"/);
    const url = urlMatch ? urlMatch[1] : item.json.url || '';

    // Extract date from post-item-date paragraph
    const dateRegex = /<p class="post-item-date">\s*([^<]+)\s*<\/p>/;
    const dateMatch = html.match(dateRegex);
    const date = dateMatch ? dateMatch[1].trim() : '';

    // Extract thumbnail from og:image meta tag
    const thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract main content from post_body span
    const contentStartRegex = /<span id="hs_cos_wrapper_post_body"[^>]*>/;
    const contentStartMatch = html.match(contentStartRegex);
    
    let contentHtml = '';
    if (contentStartMatch) {
      const startIndex = contentStartMatch.index + contentStartMatch[0].length;
      const afterStart = html.substring(startIndex);
      
      // Content ends at closing </span>
      const endIndex = afterStart.search(/<\/span>/);
      contentHtml = endIndex > 0 ? afterStart.substring(0, endIndex) : afterStart;
    }

    // Remove unwanted elements before text extraction
    let cleaned = contentHtml
      // Remove the Vulcan logo image at the start
      .replace(/<p><img[^>]*src="[^"]*Vulcan_ART_nowords\.png[^"]*"[^>]*><\/p>/gi, '')
      // Remove promotional links at the end (Learn more, See our)
      .replace(/<p><br><a[^>]*>Learn more about[^<]*<\/a>[\s\S]*?<\/p>/gi, '')
      .replace(/<a[^>]*>See our [^<]*<\/a>/gi, '')
      // Remove scripts
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove styles
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Extract all images from content (excluding logo)
    const images = [];
    const imageRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imageRegex.exec(contentHtml)) !== null) {
      let imgSrc = imgMatch[1];
      // Strip query parameters
      imgSrc = imgSrc.split('?')[0];
      // Exclude the Vulcan logo and social icons
      if (!imgSrc.includes('Vulcan_ART_nowords') && 
          !imgSrc.includes('facebook.png') && 
          !imgSrc.includes('twitter.png') && 
          !imgSrc.includes('linkedin.png') &&
          !images.includes(imgSrc)) {
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
      .replace(/<\/h[1-6]>/gi, '\n\n')                  // Headings to double newlines
      .replace(/<[^>]+>/g, ' ')                         // Strip all HTML tags
      .replace(/&nbsp;/g, ' ')                          // Non-breaking space
      .replace(/&amp;/g, '&')                           // Ampersand
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|"|"/g, '"') // Smart quotes
      .replace(/&#8217;|&#8216;|&lsquo;|&rsquo;|'/g, "'") // Smart apostrophes
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
        source: 'United Launch Alliance',
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
        source: 'United Launch Alliance',
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
