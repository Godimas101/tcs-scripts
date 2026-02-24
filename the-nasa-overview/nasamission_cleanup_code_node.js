// NASA Mission Article Code Node - Extracts article content from NASA Mission Article HTML
// Expected input: item.json.article, item.json.data, or item.json.body containing full HTML response  
// Expected output: Clean article with title, URL, date, thumbnail, content, images array

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
          source: 'NASA Mission',
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
    let titleMatch = html.match(/<h1[^>]*class="[^"]*display-48[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url or canonical meta tag
    let urlMatch = html.match(/<meta property="og:url" content="([^"]+)"\s*\/?>/);
    if (!urlMatch) {
      urlMatch = html.match(/<link rel="canonical" href="([^"]+)"\s*\/?>/);
    }
    let url = urlMatch ? urlMatch[1] : (item.json.url || '');

    // Extract date from heading-12 span
    let dateMatch = html.match(/<span class="heading-12[^"]*"[^>]*>([^<]+)<\/span>/);
    let date = dateMatch ? dateMatch[1].trim() : '';

    // Extract thumbnail from og:image meta tag
    let thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"\s*\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract the main article content from entry-content div
    // Content ends before edit-post-link div
    let contentMatch = html.match(/<div class="entry-content">\s*([\s\S]*?)\s*<div class="edit-post-link">/);
    let contentHtml = contentMatch ? contentMatch[1] : '';

    // Remove unwanted elements from content
    // Remove figcaptions (image credits)
    contentHtml = contentHtml.replace(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/g, '');
    
    // Remove the featured image figure wrapper
    contentHtml = contentHtml.replace(/<div id="" class="hds-media[^>]*>[\s\S]*?<\/figure>/g, '');
    
    // Remove related content cards at the end
    contentHtml = contentHtml.replace(/<div class="hds-related-content-module[^>]*>[\s\S]*?<\/div>/g, '');

    // Extract images from content
    let imageMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g);
    let images = [];
    for (let match of imageMatches) {
      let imgSrc = match[1];
      // Remove query parameters from image URLs
      imgSrc = imgSrc.split('?')[0];
      // Only include actual content images
      if (imgSrc.startsWith('http') && 
          (imgSrc.includes('.jpg') || imgSrc.includes('.jpeg') || 
           imgSrc.includes('.png') || imgSrc.includes('.webp'))) {
        // Don't add duplicates
        if (!images.includes(imgSrc)) {
          images.push(imgSrc);
        }
      }
    }

    // If no images in content, use thumbnail
    if (images.length === 0 && thumbnail) {
      images.push(thumbnail.split('?')[0]);
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
      .replace(/&#8216;/g, "'")                          // Left single quote
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
        thumbnail: thumbnail ? thumbnail.split('?')[0] : '',
        images: images,
        source: 'NASA Mission',
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
        source: 'NASA Mission',
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
