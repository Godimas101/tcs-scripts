// SpaceX Article Cleanup Code Node
// Extracts and cleans article content from SpaceX updates page HTML
// Input: item.json.article or item.json.data or item.json.body or item.json.html contains HTML string
// Output: {title, url, date, thumbnail, images[], source, content, raw_html_content, word_count, character_count, has_content}
// Note: Only returns articles from the past 7 days

const items = $input.all();
const results = [];

// Date filter: 7 days ago
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

for (const item of items) {
  try {
    // Get HTML content from various possible field names
    let htmlContent = item.json.article || item.json.data || item.json.body || item.json.html || '';
    
    if (!htmlContent) {
      results.push({
        json: {
          error: 'No HTML content found',
          title: '',
          url: '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'SpaceX',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Split articles by <hr> tags
    const articleSections = htmlContent.split(/<hr[^>]*>/);
    
    let recentArticles = 0;
    
    for (const section of articleSections) {
      // Skip empty sections
      if (!section.trim() || !section.includes('class="update"')) {
        continue;
      }

      // Extract article ID from <div class="update" id="...">
      const idMatch = section.match(/<div[^>]*class="update"[^>]*id="([^"]+)"/);
      const articleId = idMatch ? idMatch[1] : '';
      
      // Extract date from <div class="date">
      const dateMatch = section.match(/<div[^>]*class="date"[^>]*>([^<]+)<\/div>/);
      const dateString = dateMatch ? dateMatch[1].trim() : '';
      
      // Parse date (format: "February 2, 2026")
      if (!dateString) {
        continue; // Skip articles without dates
      }
      
      const articleDate = new Date(dateString);
      
      // Skip articles older than 7 days
      if (articleDate < sevenDaysAgo) {
        continue;
      }
      
      // Extract title from <div class="title no-link-formatting"><a>
      const titleMatch = section.match(/<div[^>]*class="title no-link-formatting"[^>]*><a[^>]*>([^<]+)<\/a><\/div>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Construct URL from article ID
      const url = articleId ? `https://www.spacex.com/updates#${articleId}` : '';
      
      // SpaceX articles don't have separate thumbnails
      const thumbnail = '';
      
      // Extract all images from content
      const images = [];
      const allImgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
      let imgMatchResult;
      while ((imgMatchResult = allImgRegex.exec(section)) !== null) {
        const imgSrc = imgMatchResult[1];
        if (imgSrc.startsWith('http') && 
            (imgSrc.includes('.jpg') || imgSrc.includes('.png') || imgSrc.includes('.webp'))) {
          if (!images.includes(imgSrc)) {
            images.push(imgSrc);
          }
        }
      }
      
      // Extract content from <p class="company-update innerhtml-from-cms">
      const contentBlocks = [];
      const contentRegex = /<p[^>]*class="company-update innerhtml-from-cms"[^>]*>([\s\S]*?)<\/p>/g;
      let contentMatch;
      while ((contentMatch = contentRegex.exec(section)) !== null) {
        contentBlocks.push(contentMatch[1]);
      }
      
      let rawContent = contentBlocks.join('\n\n');
      
      // Clean HTML tags and decode entities
      let cleanContent = rawContent
        .replace(/<br\s*\/?>/g, '\n')                      // Convert BR to newlines
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
      
      // Calculate metrics
      const wordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;
      const characterCount = cleanContent.length;
      const hasContent = cleanContent.length > 0;
      
      // Only add articles with content
      if (hasContent && title) {
        results.push({
          json: {
            title,
            url,
            date: dateString,
            thumbnail,
            images,
            source: 'SpaceX',
            content: cleanContent,
            raw_html_content: rawContent,
            word_count: wordCount,
            character_count: characterCount,
            has_content: hasContent
          }
        });
        recentArticles++;
      }
    }
    
    // If no recent articles found, return a "no articles" message
    if (recentArticles === 0) {
      results.push({
        json: {
          error: 'No articles from the past 7 days',
          title: '',
          url: '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'SpaceX',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
    }

  } catch (error) {
    results.push({
      json: {
        error: error.message,
        title: '',
        url: '',
        date: '',
        thumbnail: '',
        images: [],
        source: 'SpaceX',
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
