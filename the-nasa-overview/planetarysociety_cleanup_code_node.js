// The Planetary Society Cleanup Code Node
// Extracts and cleans article content from The Planetary Society HTML scrapes
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
          source: 'The Planetary Society',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1
    const titleRegex = /<h1[^>]*class="[^"]*mb-2[^"]*"[^>]*>(.*?)<\/h1>/s;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // Extract URL from og:url or canonical meta tag (handle different attribute orders)
    const urlMatch = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)/) || 
                     html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:url"/) ||
                     html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/);
    const url = urlMatch ? urlMatch[1] : item.json.url || '';

    // Extract date - it appears after the author name on a new line
    const dateRegex = /<br>([A-Za-z]+ \d{1,2}, \d{4})<\/p>/;
    const dateMatch = html.match(dateRegex);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract thumbnail from og:image meta tag (handle different attribute orders)
    const thumbnailMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)/) ||
                          html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract main content from article tag
    const articleStartRegex = /<article>/;
    const articleStartMatch = html.match(articleStartRegex);
    
    let contentHtml = '';
    if (articleStartMatch) {
      const startIndex = articleStartMatch.index + articleStartMatch[0].length;
      const afterStart = html.substring(startIndex);
      
      // Content ends at </article>
      const endIndex = afterStart.search(/<\/article>/);
      contentHtml = endIndex > 0 ? afterStart.substring(0, endIndex) : afterStart;
    }

    // Remove unwanted elements before text extraction
    let cleaned = contentHtml
      // Remove the entire header section (includes author bio, date, H1)
      .replace(/<header>[\s\S]*?<\/header>/gi, '')
      // Remove figcaptions (image credits)
      .replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi, '')
      // Remove blockquotes (promotional content)
      .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')
      // Remove author profile pictures
      .replace(/<picture[^>]*class="[^"]*rounded-full[^"]*"[^>]*>[\s\S]*?<\/picture>/gi, '')
      // Remove "Read our full guide!" promotional section (last h2 + paragraph)
      .replace(/<h2>Read our full guide!<\/h2>[\s\S]*?<\/p>/gi, '')
      // Remove scripts
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Remove styles
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove footer content (related articles)
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

    // Extract all images from figure elements (excluding author headshots)
    const images = [];
    // Extract from data-srcset or src attributes in img tags
    const imgRegex = /<img[^>]*(?:data-srcset|src)="([^"]+)"[^>]*>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(contentHtml)) !== null) {
      let imgSrc = imgMatch[1];
      
      // If it's a srcset, take the last (largest) image URL
      if (imgSrc.includes(' ')) {
        const srcsetParts = imgSrc.split(',');
        imgSrc = srcsetParts[srcsetParts.length - 1].trim().split(' ')[0];
      }
      
      // Remove the resize path component (e.g., _1200x799_crop_center-center_82_line/)
      imgSrc = imgSrc.replace(/\/_\d+x\d+_crop_[^/]+\//, '/');
      
      // Remove numeric folder IDs (e.g., /778023/ or /826323/)
      imgSrc = imgSrc.replace(/\/\d+\//, '/');
      
      // Strip query parameters
      imgSrc = imgSrc.split('?')[0];
      
      // Exclude author headshots and small profile images
      if (!imgSrc.includes('headshot') && !imgSrc.includes('/_200x200_') && !images.includes(imgSrc)) {
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
      .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"') // Smart quotes
      .replace(/&#8217;|&#8216;|&lsquo;|&rsquo;/g, "'") // Smart apostrophes
      .replace(/&#8211;|&ndash;/g, '–')                 // En dash
      .replace(/&#8212;|&mdash;/g, '—')                 // Em dash
      .replace(/&lt;/g, '<')                            // Less than
      .replace(/&gt;/g, '>')                            // Greater than
      .replace(/&quot;/g, '"')                          // Quote
      .replace(/&#039;/g, "'")                          // Apostrophe
      .replace(/\s+/g, ' ')                             // Collapse whitespace
      .trim();

    results.push({
      json: {
        title: title,
        url: url,
        date: date,
        thumbnail: thumbnail,
        images: images,
        source: 'The Planetary Society',
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
        source: 'The Planetary Society',
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
