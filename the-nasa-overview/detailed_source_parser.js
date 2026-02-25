const articles = $input.first().json.results;

// Create a detailed map: news_site -> URL domain/pattern -> articles
const detailedMap = {};

articles.forEach(article => {
  const newsSite = article.news_site;
  
  // Extract domain and path pattern from URL
  let domain = '';
  let pathPattern = '';
  
  try {
    const url = new URL(article.url);
    domain = url.hostname;
    
    // Get the first 2-3 path segments to identify article type/section
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);
    pathPattern = pathParts.slice(0, 3).join('/');
    
  } catch (e) {
    domain = 'invalid-url';
    pathPattern = '';
  }
  
  // Create nested structure: news_site -> domain -> pattern
  if (!detailedMap[newsSite]) {
    detailedMap[newsSite] = {};
  }
  
  if (!detailedMap[newsSite][domain]) {
    detailedMap[newsSite][domain] = {};
  }
  
  if (!detailedMap[newsSite][domain][pathPattern]) {
    detailedMap[newsSite][domain][pathPattern] = {
      count: 0,
      examples: []
    };
  }
  
  detailedMap[newsSite][domain][pathPattern].count++;
  
  // Store up to 3 example URLs for each pattern
  if (detailedMap[newsSite][domain][pathPattern].examples.length < 3) {
    detailedMap[newsSite][domain][pathPattern].examples.push(article.url);
  }
});

// Convert to a flat array for easier viewing
const detailedSources = [];

Object.keys(detailedMap).sort().forEach(newsSite => {
  Object.keys(detailedMap[newsSite]).sort().forEach(domain => {
    Object.keys(detailedMap[newsSite][domain]).sort().forEach(pathPattern => {
      const data = detailedMap[newsSite][domain][pathPattern];
      detailedSources.push({
        news_site: newsSite,
        domain: domain,
        path_pattern: pathPattern,
        article_count: data.count,
        example_urls: data.examples
      });
    });
  });
});

return [{
  json: {
    detailed_breakdown: detailedSources,
    total_sources: detailedSources.length,
    total_news_sites: Object.keys(detailedMap).length
  }
}];
