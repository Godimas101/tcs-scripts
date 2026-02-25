// ============================================
// Replace Rocketlab Image URLs with GitHub URLs
// ============================================

// Get GitHub upload results (current node input)
const uploadResults = $input.all();

// Get prep data (before GitHub upload - has original URLs)
const prepNode = $('Prep Git Upload');
const prepItems = prepNode.all();

// Get original article data from RL Article Markdown Conversion
const sourceNode = $('RL Article Markdown Conversion');
const originalArticleData = sourceNode.first().json;

console.log(`🔄 Replacing ${uploadResults.length} image URL(s) in article markdown...`);

// Build URL mapping: old Rocketlab URL -> new GitHub URL
const urlMap = {};

uploadResults.forEach((item, index) => {
  const prepData = prepItems[index]?.json;
  
  if (prepData && prepData.original_url) {
    const oldUrl = prepData.original_url;
    const newUrl = item.json.content.download_url;
    urlMap[oldUrl] = newUrl;
    
    console.log(`   ${index + 1}. Mapping:`);
    console.log(`      OLD: ${oldUrl}`);
    console.log(`      NEW: ${newUrl}`);
  }
});

// Replace URLs in markdown
let updatedMarkdown = originalArticleData.markdown_rocketlab_articles || '';

Object.keys(urlMap).forEach(oldUrl => {
  const newUrl = urlMap[oldUrl];
  // Escape special regex characters in the URL
  const escapedOldUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Replace in markdown image syntax: ![alt](url)
  updatedMarkdown = updatedMarkdown.replace(new RegExp(escapedOldUrl, 'g'), newUrl);
});

// Replace URLs in articles array
const updatedArticles = (originalArticleData.articles || []).map(article => {
  if (article.images && Array.isArray(article.images)) {
    return {
      ...article,
      images: article.images.map(imgUrl => urlMap[imgUrl] || imgUrl)
    };
  }
  return article;
});

// Build output
const output = {
  markdown_rocketlab_articles: updatedMarkdown,
  articles: updatedArticles,
  article_count: originalArticleData.article_count,
  extraction_date: originalArticleData.extraction_date,
  
  // Add replacement metadata
  images_replaced: Object.keys(urlMap).length,
  url_mapping: urlMap,
  
  summary: `Updated ${Object.keys(urlMap).length} image URL(s) from Rocketlab to GitHub`
};

console.log(`✅ Replacement complete:`);
console.log(`   Images replaced: ${Object.keys(urlMap).length}`);
console.log(`   Articles updated: ${updatedArticles.length}`);

return [{ json: output }];
