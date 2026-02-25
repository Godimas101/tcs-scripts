// Relativity Space News Extraction Code Node
// Extracts articles from Relativity Space updates page matching Blue Origin format
// Output: {title, url, date, thumbnail, source: 'Relativity Space'}
// Note: Relativity uses Squarespace summary blocks without thumbnails

const htmlContent = $input.first().json.body || $input.first().json.data || '';

// Pattern to match Squarespace summary items with title, URL, and date
const articleRegex = /<a href="([^"]+)"[^>]*class="summary-title-link">([^<]+)<\/a>.*?<time[^>]+datetime="([^"]+)">([^<]+)<\/time>/gs;

const articles = [];
let match;

while ((match = articleRegex.exec(htmlContent)) !== null) {
  const url = 'https://www.relativityspace.com' + match[1];
  const title = match[2].trim();
  const datetime = match[3]; // ISO format: "2026-01-12"
  const dateString = match[4].trim(); // Display format: "Jan 12, 2026"
  
  // Parse date from ISO datetime attribute
  const articleDate = new Date(datetime);
  
  // Filter: only articles from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (articleDate >= thirtyDaysAgo) {
    articles.push({
      title: title,
      url: url,
      date: dateString,
      thumbnail: '', // Relativity updates page doesn't include thumbnails
      source: 'Relativity Space'
    });
  }
}

// Return each article as a separate item for n8n
if (articles.length === 0) {
  return [{
    json: {
      message: 'No recent articles found from Relativity Space in the last 30 days',
      source: 'Relativity Space'
    }
  }];
}

return articles.map(article => ({
  json: article
}));
