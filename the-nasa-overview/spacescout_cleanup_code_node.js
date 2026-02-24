// Space Scout Code Node - Extracts article content from Space Scout HTML
// Expected input: item.json.article, item.json.data, or item.json.body containing full HTML response
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
          source: 'Space Scout',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1 with cm-entry-title class
    let titleMatch = html.match(/<h1[^>]*class="[^"]*cm-entry-title[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    let urlMatch = html.match(/<meta property="og:url" content="([^"]+)"\s*\/?>/);
    let url = urlMatch ? urlMatch[1] : (item.json.url || '');

    // Extract date from time element (display format)
    let dateMatch = html.match(/<time class="entry-date published" datetime="[^"]*">([^<]+)<\/time>/);
    let date = dateMatch ? dateMatch[1].trim() : '';

    // Extract thumbnail from og:image meta tag
    let thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"\s*\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1].split('?')[0] : '';

    // Extract the main article content from cm-entry-summary div
    // Content ends before closing article tag or related posts section
    let contentMatch = html.match(/<div class="cm-entry-summary">\s*([\s\S]*?)\s*<\/div>\s*<\/div>\s*<\/article>/);
    let contentHtml = contentMatch ? contentMatch[1] : '';

    // Remove unwanted elements from content
    // Remove WordPress lazy-loading script comments
    contentHtml = contentHtml.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove figure captions (they're often credits, not content)
    contentHtml = contentHtml.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/g, '');

    // Extract images from content (filter out tiny icons and data URIs)
    let imageMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g);
    let images = [];
    for (let match of imageMatches) {
      let imgSrc = match[1];
      // Remove resize and other query parameters from wp.com URLs
      imgSrc = imgSrc.split('?')[0];
      // Only include actual images (not data URIs, not lazy placeholders)
      // Space Scout uses i0.wp.com CDN for images
      if (imgSrc.startsWith('http') && 
          (imgSrc.includes('.jpg') || imgSrc.includes('.jpeg') || 
           imgSrc.includes('.png') || imgSrc.includes('.webp')) &&
          !imgSrc.includes('gravatar.com')) {
        // Don't add duplicates
        if (!images.includes(imgSrc)) {
          images.push(imgSrc);
        }
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
        source: 'Space Scout',
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
        source: 'Space Scout',
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
