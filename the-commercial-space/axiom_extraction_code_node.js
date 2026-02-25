// Axiom Space News Extraction Code Node
// Extracts articles from Axiom Space newsroom matching Blue Origin format
// Output: {title, url, date, thumbnail, source: 'Axiom Space'}

const htmlContent = $input.first().json.body || $input.first().json.data || '';

// Pattern to match Webflow w-dyn-item articles with image, title, and date
const articleRegex = /<div role="listitem" class="w-dyn-item">.*?<a href="(\/(release|news)\/[^"]+)".*?<img[^>]+src="([^"]+)".*?<a[^>]*>([^<]+)<\/a>.*?<div[^>]*class="press-release-date">([^<]+)<\/div>/gs;

const articles = [];
let match;

while ((match = articleRegex.exec(htmlContent)) !== null) {
  const url = 'https://www.axiomspace.com' + match[1];
  const thumbnail = match[3];
  const title = match[4].trim();
  const dateString = match[5].trim();
  
  // Parse date (format: "January 30, 2026" or "November 20, 2025")
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
      source: 'Axiom Space'
    });
  }
}

// Return each article as a separate item for n8n
if (articles.length === 0) {
  return [{
    json: {
      message: 'No recent articles found from Axiom Space in the last 30 days',
      source: 'Axiom Space'
    }
  }];
}

return articles.map(article => ({
  json: article
}));
