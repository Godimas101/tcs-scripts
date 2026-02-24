// Firefly Aerospace News Extraction Code Node
// Extracts articles from Firefly Aerospace news page matching Blue Origin format
// Output: {title, url, date, thumbnail, source: 'Firefly Aerospace'}

const htmlContent = $input.first().json.body || $input.first().json.data || '';

// Pattern to match <article> tags with image, title, date, and URL
const articleRegex = /<article[^>]*>.*?<img[^>]+src="([^"]+)".*?<time>([^<]+)<\/time>.*?<a href="([^"]+)"[^>]*>\s*<strong>(?:<strong>)?([^<]+)/gs;

const articles = [];
let match;

while ((match = articleRegex.exec(htmlContent)) !== null) {
  const thumbnail = match[1];
  const dateString = match[2].trim();
  const url = match[3];
  const title = match[4].trim();
  
  // Parse date (format: "January 13, 2026")
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
      source: 'Firefly Aerospace'
    });
  }
}

// Return each article as a separate item for n8n
if (articles.length === 0) {
  return [{
    json: {
      message: 'No recent articles found from Firefly Aerospace in the last 30 days',
      source: 'Firefly Aerospace'
    }
  }];
}

return articles.map(article => ({
  json: article
}));
