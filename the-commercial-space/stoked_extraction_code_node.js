// Stoked Space News Extraction Code Node
// Extracts articles from Stoked Space news page matching Blue Origin format
// Output: {title, url, date, thumbnail, source: 'Stoked Space'}

const htmlContent = $input.first().json.body || $input.first().json.data || '';

// Pattern to match <article> tags with image, title, date, and URL
const articleRegex = /<article[^>]*>.*?<img[^>]+src="([^"]+)".*?<div class="post__date-container">\s*([^<]+?)\s*<\/div>.*?<h2[^>]*class="post__content-header-title"[^>]*>.*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>/gs;

const articles = [];
let match;

while ((match = articleRegex.exec(htmlContent)) !== null) {
  const thumbnail = match[1];
  const dateString = match[2].trim();
  const url = match[3];
  const title = match[4].trim();
  
  // Parse date (format: "October 8, 2025")
  const articleDate = new Date(dateString);
  
  // Filter: only articles from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (articleDate >= thirtyDaysAgo) {
    articles.push({
      title: title,
      url: url,
      date: dateString,
      thumbnail: thumbnail,
      source: 'Stoked Space'
    });
  }
  // Note: As of Feb 2026, Stoked's most recent article is from Oct 8, 2025 (118 days old)
  // If no results, the 30-day filter may be excluding all available articles
}

// Return each article as a separate item for n8n
if (articles.length === 0) {
  return [{
    json: {
      message: 'No recent articles found from Stoked Space in the last 30 days',
      source: 'Stoked Space'
    }
  }];
}

return articles.map(article => ({
  json: article
}));
