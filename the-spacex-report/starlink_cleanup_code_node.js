// Starlink Article Cleanup Code Node
// Extracts and cleans article content from Starlink updates page HTML
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
          source: 'Starlink',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Split articles by <shui-image-block> tags
    const articleRegex = /<shui-image-block[^>]*>([\s\S]*?)(?=<shui-image-block|<\/app-root>|$)/g;
    let articleMatch;
    let recentArticles = 0;
    
    while ((articleMatch = articleRegex.exec(htmlContent)) !== null) {
      const section = articleMatch[1];
      
      // Skip sections without actual article content
      if (!section.includes('text-headline') || !section.includes('text-description')) {
        continue;
      }

      // Extract title from <h2 class="text-headline mat-display-2">
      const titleMatch = section.match(/<h2[^>]*class="text-headline[^"]*"[^>]*>([^<]+)<\/h2>/);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      if (!title) {
        continue; // Skip if no title found
      }
      
      // Extract content from <p class="text-description mat-body-1">
      const contentMatch = section.match(/<p[^>]*class="text-description[^"]*"[^>]*style="white-space: pre-line;">([\s\S]*?)<\/p>/);
      const rawContent = contentMatch ? contentMatch[1] : '';
      
      // Extract date from <b> tag (format: "January 29, 2026" or "JUL 14, 2025")
      const dateMatch = rawContent.match(/<b>([^<]+)<\/b>/);
      const dateString = dateMatch ? dateMatch[1].trim() : '';
      
      // Parse date
      if (!dateString) {
        continue; // Skip articles without dates
      }
      
      const articleDate = new Date(dateString);
      
      // Skip articles older than 7 days
      if (articleDate < sevenDaysAgo) {
        continue;
      }
      
      // URL: Starlink doesn't have individual article URLs, link to updates page
      const url = 'https://www.starlink.com/updates';
      
      // Starlink articles don't have separate thumbnails
      const thumbnail = '';
      
      // Extract all images from section - prefer webp from srcset over jpg from img src
      const images = [];
      
      // First, extract from <source srcset=""> tags (higher quality webp images)
      const sourceRegex = /<source[^>]*srcset="([^"]+)"[^>]*>/g;
      let sourceMatch;
      while ((sourceMatch = sourceRegex.exec(section)) !== null) {
        const imgSrc = sourceMatch[1];
        // Prefer webp images and non-mobile-specific ones
        if (imgSrc.startsWith('http') && imgSrc.includes('.webp')) {
          // Prefer desktop versions (_d.webp) over mobile (_m.webp)
          if (!images.includes(imgSrc)) {
            images.push(imgSrc);
          }
        }
      }
      
      // If no webp found, fall back to img src tags
      if (images.length === 0) {
        const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(section)) !== null) {
          const imgSrc = imgMatch[1];
          if (imgSrc.startsWith('http') && 
              (imgSrc.includes('.jpg') || imgSrc.includes('.png') || imgSrc.includes('.webp'))) {
            if (!images.includes(imgSrc)) {
              images.push(imgSrc);
            }
          }
        }
      }
      
      // Clean HTML tags and decode entities from content
      // Remove the date <b> tag first
      let cleanContent = rawContent
        .replace(/<b>[^<]*<\/b>\s*<br>\s*<br>?/, '') // Remove date and following line breaks
        .replace(/<br\s*\/?>/g, '\n')                // Convert BR to newlines
        .replace(/<[^>]+>/g, ' ')                    // Remove all HTML tags
        .replace(/\s+/g, ' ')                        // Normalize whitespace
        .replace(/&#8220;/g, '"')                    // Left curly quote
        .replace(/&#8221;/g, '"')                    // Right curly quote
        .replace(/&#8217;/g, "'")                    // Apostrophe
        .replace(/&#8211;/g, '–')                    // En dash
        .replace(/&#8212;/g, '—')                    // Em dash
        .replace(/&#8216;/g, "'")                    // Left single quote
        .replace(/&nbsp;/g, ' ')                     // Non-breaking space
        .replace(/&amp;/g, '&')                      // Ampersand
        .replace(/&lt;/g, '<')                       // Less than
        .replace(/&gt;/g, '>')                       // Greater than
        .replace(/&quot;/g, '"')                     // Quote
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
            source: 'Starlink',
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
          source: 'Starlink',
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
        source: 'Starlink',
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
