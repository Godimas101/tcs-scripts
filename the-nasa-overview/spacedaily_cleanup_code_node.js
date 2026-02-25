// Space Daily Code Node - Extracts article content from Space Daily HTML
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
          source: 'Space Daily',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from H1 tag
    let titleMatch = html.match(/<h1>([\s\S]*?)<br\s*\/?><\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract URL from og:url meta tag
    let urlMatch = html.match(/<meta property="og:url" content="([^"]+)"\s*\/?>/);
    let url = urlMatch ? urlMatch[1] : (item.json.url || '');

    // Extract date from the byline (format: "Location (Source) Month Day, Year")
    let dateMatch = html.match(/<span class="BHS">[^<]*\(AFP\)\s+([A-Za-z]+\s+\d+,\s+\d{4})/);
    let date = dateMatch ? dateMatch[1] : '';

    // Extract thumbnail from og:image meta tag
    let thumbnailMatch = html.match(/<meta property="og:image" content="([^"]+)"\s*\/?>/);
    let thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract the main article content
    // Content starts after the byline and ends before "<!--RELATED LINKS-->"
    let contentMatch = html.match(/<!--body-2-incontainer\.php-->\n\s*([\s\S]*?)\s*<!--RELATED LINKS-->/);
    let contentHtml = contentMatch ? contentMatch[1] : '';

    // Remove unwanted elements from content
    // Remove iframe ads
    contentHtml = contentHtml.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/g, '');
    contentHtml = contentHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
    
    // Remove center tags around ads
    contentHtml = contentHtml.replace(/<center>\s*<\/center>/g, '');
    
    // Remove line breaks and paragraph tags - they use <p> instead of </p>
    contentHtml = contentHtml.replace(/<p>\s*\\r\\n/g, '\n');
    contentHtml = contentHtml.replace(/\\r\\n/g, '\n');

    // Extract images from content (filter out tiny icons, banners, and data URIs)
    let imageMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"[^>]*>/g);
    let images = [];
    for (let match of imageMatches) {
      let imgSrc = match[1];
      // Only include actual images (not data URIs, not sponsors/banners, not tiny spacer images)
      if (imgSrc.startsWith('http') && 
          (imgSrc.includes('.jpg') || imgSrc.includes('.jpeg') || 
           imgSrc.includes('.png') || imgSrc.includes('.webp')) &&
          !imgSrc.includes('/sponsors/') &&
          !imgSrc.includes('black.jpg') &&
          !imgSrc.includes('white.jpg')) {
        // Don't add duplicates
        if (!images.includes(imgSrc)) {
          images.push(imgSrc);
        }
      }
    }

    // Clean HTML tags and decode entities
    let cleanContent = contentHtml
      .replace(/<[^>]+>/g, ' ')                          // Remove all HTML tags
      .replace(/\\r\\n/g, '\n')                          // Convert escaped line breaks
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
        source: 'Space Daily',
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
        source: 'Space Daily',
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
