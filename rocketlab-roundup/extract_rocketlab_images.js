/**
 * Extract Rocketlab Image URLs from article output
 * Prepares image data for download/upload workflow
 */

const input = $input.first().json;

// Extract images from articles array
const articleImages = [];
if (input.articles && Array.isArray(input.articles)) {
  input.articles.forEach((article, index) => {
    if (article.images && Array.isArray(article.images)) {
      article.images.forEach(imageUrl => {
        articleImages.push({
          url: imageUrl,
          article_title: article.title,
          article_url: article.url,
          article_index: index,
          source: 'article_array'
        });
      });
    }
  });
}

// Also extract from markdown (as a backup/validation)
const markdownImages = [];
const markdown = input.markdown_rocketlab_articles || '';
const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
let match;

while ((match = imageRegex.exec(markdown)) !== null) {
  const altText = match[1];
  const imageUrl = match[2];
  
  markdownImages.push({
    url: imageUrl,
    alt_text: altText,
    source: 'markdown'
  });
}

// Create unique list of images (use Set to deduplicate)
const uniqueImageUrls = new Set();
const imageList = [];

// Add from articles array first (has more context)
articleImages.forEach(img => {
  if (!uniqueImageUrls.has(img.url)) {
    uniqueImageUrls.add(img.url);
    imageList.push(img);
  }
});

// Add any from markdown that weren't in articles array
markdownImages.forEach(img => {
  if (!uniqueImageUrls.has(img.url)) {
    uniqueImageUrls.add(img.url);
    
    // Try to match with article title from alt text
    const matchingArticle = input.articles?.find(a => 
      img.alt_text.includes(a.title) || a.title.includes(img.alt_text)
    );
    
    imageList.push({
      url: img.url,
      article_title: matchingArticle?.title || img.alt_text,
      article_url: matchingArticle?.url || null,
      alt_text: img.alt_text,
      source: 'markdown_only'
    });
  }
});

// Generate filename from URL for each image
imageList.forEach(img => {
  const urlParts = img.url.split('/');
  img.original_filename = urlParts[urlParts.length - 1];
  
  // Generate a sanitized filename (remove special chars, limit length)
  const sanitized = img.original_filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 100);
  
  img.sanitized_filename = sanitized;
  
  // Create a unique identifier combining article index and filename
  const articleIndex = input.articles?.findIndex(a => a.title === img.article_title) ?? 0;
  img.unique_filename = `rocketlab_article_${articleIndex + 1}_${sanitized}`;
});

// Console output for debugging
console.log('🖼️  Rocketlab Image Extraction Summary:');
console.log(`   Total Images Found: ${imageList.length}`);
console.log(`   From Articles: ${articleImages.length}`);
console.log(`   From Markdown Only: ${markdownImages.length - articleImages.length}`);
console.log('');
console.log('   Image List:');
imageList.forEach((img, i) => {
  console.log(`   ${i + 1}. ${img.unique_filename}`);
  console.log(`      URL: ${img.url}`);
  console.log(`      Article: ${img.article_title}`);
});

// Return one item per image (for HTTP Request node to iterate)
return imageList.map(img => ({
  json: {
    ...img,
    // Add summary context to each item
    total_images: imageList.length,
    article_count: input.article_count,
    extraction_date: input.extraction_date
  }
}));
