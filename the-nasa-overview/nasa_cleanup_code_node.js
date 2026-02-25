// NASA Code Node - Extracts article content from NASA Earth Observatory HTML
// Expected input: item.json.data or item.json.body containing full HTML response
// Expected output: Clean article with title, URL, date, featured image, content, images array

let items = $input.all();
let results = [];

for (let item of items) {
  try {
    // Get the HTML from various possible field names
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
          source: 'NASA Earth Observatory',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1 with display-48 class
    let titleMatch = html.match(/<h1[^>]*class="[^"]*display-48[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    let urlMatch = html.match(/<meta property="og:url" content="([^"]+)" ?\/?>/);
    let url = urlMatch ? urlMatch[1] : (item.json.url || '');

    // Extract date from article:published_time (ISO format)
    let dateMatch = html.match(/<meta property="article:published_time" content="([^"]+)" ?\/?>/);
    let date = '';
    if (dateMatch) {
      // Parse ISO date: "2026-02-07T00:01:00-05:00" -> "Feb 07, 2026"
      let dateObj = new Date(dateMatch[1]);
      let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      date = months[dateObj.getMonth()] + ' ' + 
             String(dateObj.getDate()).padStart(2, '0') + ', ' + 
             dateObj.getFullYear();
    }

    // Extract thumbnail from og:image meta tag
    let thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)" ?\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract the main article content from entry-content div
    let contentMatch = html.match(/<div class="entry-content">([\s\S]*?)<\/div><div id=""/);
    let contentHtml = contentMatch ? contentMatch[1] : '';

    // Remove unwanted elements from content
    // Remove "Downloads" section (hds-featured-file-list)
    contentHtml = contentHtml.replace(/<div[^>]*class="[^"]*hds-featured-file-list[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
    
    // Remove "References" section (if any - appears to be inline in content)
    // Keep it for now as it seems to be part of the article
    
    // Remove hds-content-lists (related articles at bottom)
    contentHtml = contentHtml.replace(/<div[^>]*class="[^"]*hds-content-lists-inner[^"]*"[^>]*>[\s\S]*?$/g, '');

    // Extract images from content (filter out tiny icons and data URIs)
    let imageMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g);
    let images = [];
    for (let match of imageMatches) {
      let imgSrc = match[1];
      // Only include actual images (not data URIs, not lazy placeholders)
      if (imgSrc.startsWith('http') && 
          (imgSrc.includes('.jpg') || imgSrc.includes('.jpeg') || 
           imgSrc.includes('.png') || imgSrc.includes('.webp'))) {
        images.push(imgSrc);
      }
    }

    // Clean HTML tags and decode entities
    let cleanContent = contentHtml
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remove styles
      .replace(/<[^>]+>/g, ' ')                          // Remove all HTML tags
      .replace(/\s+/g, ' ')                              // Normalize whitespace
      .replace(/&#8220;/g, '"')                          // Left curly quote
      .replace(/&#8221;/g, '"')                          // Right curly quote
      .replace(/&#8217;/g, "'")                          // Apostrophe
      .replace(/&#8211;/g, '–')                          // En dash
      .replace(/&#8212;/g, '—')                          // Em dash
      .replace(/&nbsp;/g, ' ')                           // Non-breaking space
      .replace(/&amp;/g, '&')                            // Ampersand
      .replace(/&lt;/g, '<')                             // Less than
      .replace(/&gt;/g, '>')                             // Greater than
      .replace(/&quot;/g, '"')                           // Quote
      .trim();

    results.push({
      json: {
        title: title,
        url: url,
        date: date,
        thumbnail: thumbnail,
        images: images,
        source: 'NASA Earth Observatory',
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
        source: 'NASA Earth Observatory',
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
