// NASA Spaceflight Code Node - Extracts article content from NASASpaceFlight.com HTML
// Expected input: item.json.article, item.json.data, or item.json.body containing full HTML response
// Expected output: Clean article with title, URL, date, featured image, content, images array

let items = $input.all();
let results = [];

for (let item of items) {
  try {
    // Debug: Check what fields are available
    let availableFields = Object.keys(item.json || item);
    
    // Get the HTML from various possible field names
    let html = item.json.article || item.json.data || item.json.body || item.json.html || 
               item.data || item.body || item.article || item.html || '';
    
    if (!html) {
      results.push({
        json: {
          error: 'No HTML content found',
          debug_available_fields: availableFields,
          debug_item_structure: JSON.stringify(item).substring(0, 500),
          title: '',
          url: item.json.url || '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'NASASpaceFlight.com',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1 with class post-title
    let titleMatch = html.match(/<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    let urlMatch = html.match(/<meta property="og:url" content="([^"]+)" ?\/?>/);
    let url = urlMatch ? urlMatch[1] : (item.json.url || '');

    // Extract date from article:published_time (ISO format)
    let dateMatch = html.match(/<meta property="article:published_time" content="([^"]+)" ?\/?>/);
    let date = '';
    if (dateMatch) {
      // Parse ISO date: "2026-02-07T19:57:50+00:00" -> "February 7, 2026"
      let dateObj = new Date(dateMatch[1]);
      let months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
      date = months[dateObj.getMonth()] + ' ' + 
             dateObj.getDate() + ', ' + 
             dateObj.getFullYear();
    }

    // Extract thumbnail from og:image meta tag
    let thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)" ?\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract the main article content from inner-post-entry entry-content div
    // Content ends before related posts (item-related) or comments (post-comments)
    let contentMatch = html.match(/<div class="inner-post-entry entry-content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*(?:<div class="(?:item-related|post-comments)|<\/article>)/);
    let contentHtml = contentMatch ? contentMatch[1] : '';

    // Remove unwanted elements from content
    // Remove the penci-post-countview-number-check indicator
    contentHtml = contentHtml.replace(/<i class="penci-post-countview-number-check"[^>]*>[\s\S]*?<\/i>/g, '');
    
    // Remove the "more" anchor span
    contentHtml = contentHtml.replace(/<span id="more-[^"]*"><\/span>/g, '');
    
    // Remove embedded YouTube videos and other iframes
    contentHtml = contentHtml.replace(/<div[^>]*class="[^"]*fluid-width-video-wrapper[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
    contentHtml = contentHtml.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/g, '');
    
    // Remove featured image credit lines at the end (starts with "Featured Image:")
    contentHtml = contentHtml.replace(/<p><em>Featured Image:[^<]*<\/em><\/p>/gi, '');
    
    // Remove inline ad content if any
    contentHtml = contentHtml.replace(/<div[^>]*class="[^"]*penci-ads[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');

    // Extract images from content (filter out tiny icons and data URIs)
    let imageMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g);
    let images = [];
    for (let match of imageMatches) {
      let imgSrc = match[1];
      // Only include actual images (not data URIs, not lazy placeholders, not shop banners)
      if (imgSrc.startsWith('http') && 
          (imgSrc.includes('.jpg') || imgSrc.includes('.jpeg') || 
           imgSrc.includes('.png') || imgSrc.includes('.webp')) &&
          !imgSrc.includes('ShopBanner')) {
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
      .replace(/&hellip;/g, '…')                         // Ellipsis
      .trim();

    results.push({
      json: {
        title: title,
        url: url,
        date: date,
        thumbnail: thumbnail,
        images: images,
        source: 'NASASpaceFlight.com',
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
        source: 'NASASpaceFlight.com',
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
