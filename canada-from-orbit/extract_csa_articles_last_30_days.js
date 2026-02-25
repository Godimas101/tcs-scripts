// n8n Code Node – Extract CSA articles from the last 30 days only
const items = $input.all();
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
let recentArticles = [];

// There should only be one item (the full HTML page)
const html = items[0]?.json?.data || items[0]?.json?.body || '';

if (!html) {
  return [{ json: { status: "noData", reason: "No HTML received" }}];
}

// Extract all article links from <li class="blog"> entries
// CSA Structure: <li class="blog"><article><a href="URL"><figure><figcaption><time datetime="YYYY-MM-DD">...
const articleRegex = /<li\s+class="blog">([\s\S]*?)<\/li>/g;

let match;
while ((match = articleRegex.exec(html)) !== null) {
  const articleHtml = match[1];
  
  // Extract URL from <a href="...">
  const urlMatch = articleHtml.match(/<a\s+href="([^"]+)"/);
  const relativeUrl = urlMatch ? urlMatch[1] : null;
  
  if (!relativeUrl) continue; // Skip if no URL found
  
  // Build full URL (CSA uses relative paths)
  const fullUrl = relativeUrl.startsWith('http') 
    ? relativeUrl 
    : `https://www.asc-csa.gc.ca${relativeUrl}`;
  
  // Extract date from <time datetime="YYYY-MM-DD">
  const dateMatch = articleHtml.match(/<time\s+datetime="([^"]+)"/);
  const dateString = dateMatch ? dateMatch[1] : null;
  
  let pubDate = null;
  let displayDate = '';
  
  if (dateString) {
    pubDate = new Date(dateString);
    displayDate = pubDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Extract title from <h3 class="title">...</h3>
  const titleMatch = articleHtml.match(/<h3\s+class="title">([\s\S]*?)<\/h3>/);
  let title = titleMatch ? titleMatch[1] : 'Untitled';
  
  // Clean up title (remove HTML tags, decode entities, trim)
  title = title
    .replace(/<[^>]+>/g, ' ')  // Remove HTML tags
    .replace(/&nbsp;/g, ' ')    // Replace &nbsp; with space
    .replace(/&amp;/g, '&')     // Decode &amp;
    .replace(/&lt;/g, '<')      // Decode &lt;
    .replace(/&gt;/g, '>')      // Decode &gt;
    .replace(/&quot;/g, '"')    // Decode &quot;
    .replace(/\s+/g, ' ')       // Collapse multiple spaces
    .trim();
  
  // Extract category from <span data-type="...">
  const categoryMatch = articleHtml.match(/<span[^>]*data-type="([^"]+)"/);
  const category = categoryMatch ? categoryMatch[1] : 'uncategorized';
  
  // Extract keywords (optional)
  const keywordsMatch = articleHtml.match(/\[Keywords:\s*([^\]]+)\]/);
  const keywords = keywordsMatch ? keywordsMatch[1].trim() : '';
  
  // Only keep articles from the last 30 days (or all if no date found)
  if (!pubDate || pubDate >= thirtyDaysAgo) {
    recentArticles.push({
      title: title,
      url: fullUrl,
      published: displayDate || 'Unknown',
      category: category,
      keywords: keywords,
      source: 'Canadian Space Agency'
    });
  }
}

// Check if any recent articles were found
if (recentArticles.length === 0) {
  console.log('No recent CSA articles found from the last 30 days');
  return [{ json: { status: "noData", message: "No articles from the last 30 days" }}];
}

// Sort newest first
recentArticles.sort((a, b) => {
  if (a.published === 'Unknown') return 1;
  if (b.published === 'Unknown') return -1;
  return b.published.localeCompare(a.published);
});

console.log(`Found ${recentArticles.length} recent articles from CSA`);

// Output one item per article (perfect for the next "Loop Over Items" → HTTP Request)
return recentArticles.map(article => ({ json: article }));
