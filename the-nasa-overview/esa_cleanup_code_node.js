// ESA Article Cleanup Code Node
// Extracts and cleans article content from ESA HTML scrapes
// Input: item.json.data or item.json.body contains HTML string
// Output: {title, url, date, thumbnail, images[], source, content, raw_html_content, word_count, character_count, has_content}

const items = $input.all();
const results = [];

for (const item of items) {
  try {
    // Get HTML content from various possible field names
    let htmlContent = item.json.article || item.json.data || item.json.body || item.json.html || '';
    
    if (!htmlContent) {
      results.push({
        json: {
          error: 'No HTML content found',
          title: '',
          url: item.json.url || '',
          date: '',
          thumbnail: '',
          images: [],
          source: 'ESA',
          content: '',
          raw_html_content: '',
          word_count: 0,
          character_count: 0,
          has_content: false
        }
      });
      continue;
    }

    // Extract title from h1.heading.heading--main
    const titleMatch = htmlContent.match(/<h1[^>]*class="[^"]*heading heading--main[^"]*"[^>]*>([\s\S]*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim().replace(/<[^>]+>/g, '').trim() : '';

    // Construct URL from breadcrumb path and title
    // ESA URLs follow pattern: https://www.esa.int/category/subcategory/Title_with_underscores
    let url = item.json.url || '';
    if (!url) {
      // Extract the last (most specific) breadcrumb path
      const breadcrumbSection = htmlContent.match(/<div class="breadcrumbs article__block article__item">([\s\S]*?)<\/div>/);
      if (breadcrumbSection) {
        const breadcrumbLinks = breadcrumbSection[1].match(/href="([^"]+)"/g);
        if (breadcrumbLinks && breadcrumbLinks.length > 0) {
          // Get the last breadcrumb path
          const lastLink = breadcrumbLinks[breadcrumbLinks.length - 1];
          const lastPath = lastLink.match(/href="([^"]+)"/)[1];
          const urlTitle = title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
          url = `https://www.esa.int${lastPath}/${urlTitle}`;
        }
      }
    }

    // Extract date from meta span (format: DD/MM/YYYY)
    const dateMatch = htmlContent.match(/<div class="meta article__item">[\s\S]*?<span>(\d{2}\/\d{2}\/\d{4})<\/span>/);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract featured image from og:image meta tag
    const thumbnailMatch = htmlContent.match(/<meta property="og:image" content="([^"]+)">/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    // Extract abstract (includes update text if present)
    const abstractMatch = htmlContent.match(/<div class="abstract article__block article__item">([\s\S]*?)<\/div>/);
    const abstractHtml = abstractMatch ? abstractMatch[1] : '';

    // Extract the main article area (from article tag to share section)
    const articleMatch = htmlContent.match(/<article class="article[^"]*">([\s\S]*?)(?:<div class="share button-group|<\/article>)/);
    const articleArea = articleMatch ? articleMatch[1] : htmlContent;

    // Extract all article__block divs content more reliably
    const articleBlocks = [];
    const blockStarts = [];
    
    // Find all starting positions of article__block divs
    let searchStart = 0;
    while (true) {
      const blockStart = articleArea.indexOf('<div class="article__block"', searchStart);
      if (blockStart === -1) break;
      blockStarts.push(blockStart);
      searchStart = blockStart + 1;
    }
    
    // For each block start, find its content up to the next block or end
    for (let i = 0; i < blockStarts.length; i++) {
      const start = blockStarts[i];
      const end = i < blockStarts.length - 1 ? blockStarts[i + 1] : articleArea.length;
      const blockContent = articleArea.substring(start, end);
      // Only add if it's not the abstract (we already have that)
      if (!blockContent.includes('class="abstract article__block')) {
        articleBlocks.push(blockContent);
      }
    }

    // Combine abstract and article blocks
    let allArticleContent = abstractHtml + '\n' + articleBlocks.join('\n');

    // Remove unwanted elements before text extraction
    let cleaned = allArticleContent;
    
    // Remove style blocks
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove script blocks
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove video elements
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*article__video[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove share buttons and social media links
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*share[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    cleaned = cleaned.replace(/<div[^>]*class="[^"]*a2a_kit[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Remove figure elements (images will be extracted separately)
    cleaned = cleaned.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
    
    // Remove iframes
    cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');

    // Extract images from article content (before removing them)
    // Focus on images within article__image figures to avoid navigation/sidebar images
    const images = [];
    
    // First try to get images from article__image figures
    const articleImageRegex = /<figure class="article__image[^"]*">[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/figure>/g;
    let articleImgMatch;
    while ((articleImgMatch = articleImageRegex.exec(allArticleContent)) !== null) {
      const imgSrc = articleImgMatch[1];
      const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `https://www.esa.int${imgSrc}`;
      if (!images.includes(fullImgSrc)) {
        images.push(fullImgSrc);
      }
    }
    
    // If no article__image figures found, fall back to all images in article blocks
    if (images.length === 0) {
      const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(allArticleContent)) !== null) {
        const imgSrc = imgMatch[1];
        // Skip small images (likely icons) and non-article images
        if (imgSrc.includes('_article.') || imgSrc.includes('/esa_multimedia/images/')) {
          const fullImgSrc = imgSrc.startsWith('http') ? imgSrc : `https://www.esa.int${imgSrc}`;
          if (!images.includes(fullImgSrc)) {
            images.push(fullImgSrc);
          }
        }
      }
    }

    // Strip all HTML tags
    let textContent = cleaned.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    textContent = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Collapse multiple spaces and newlines
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Calculate metrics
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = textContent.length;
    const hasContent = textContent.length > 0;

    results.push({
      json: {
        title,
        url,
        date,
        thumbnail,
        images,
        source: 'ESA',
        content: textContent,
        raw_html_content: allArticleContent,
        word_count: wordCount,
        character_count: characterCount,
        has_content: hasContent
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
        source: 'ESA',
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
