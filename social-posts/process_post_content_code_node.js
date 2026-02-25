// Extract data from webhook payload
const webhookData = $input.first().json.body;

console.log('Processing post:', webhookData.post_title);

// Simple HTML to Markdown converter
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let markdown = html;
  
  // Headers
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Bold and Italic
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');
  
  // Lists
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Paragraphs and line breaks
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Clean up entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#8217;/g, "'");
  markdown = markdown.replace(/&#8220;/g, '"');
  markdown = markdown.replace(/&#8221;/g, '"');
  markdown = markdown.replace(/&#8211;/g, '-');
  markdown = markdown.replace(/&#8812;/g, '—');
  
  // Clean up whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  markdown = markdown.replace(/  +/g, ' '); // Multiple spaces to single
  markdown = markdown.trim();
  
  return markdown;
}

// Extract first image from HTML content
let featuredImage = null;
if (webhookData.post_content_html) {
  // Find ALL images, not just the first one
  const allImgMatches = webhookData.post_content_html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi);
  
  for (const imgMatch of allImgMatches) {
    let imgUrl = imgMatch[1];
    
    // Found an image!
    featuredImage = imgUrl;
    
    // Clean the URL immediately
    // Remove WordPress CDN proxy (i0.wp.com, i1.wp.com, etc.)
    if (/i\d+\.wp\.com/.test(featuredImage)) {
      const originalMatch = featuredImage.match(/i\d+\.wp\.com\/(.+)/);
      if (originalMatch) {
        featuredImage = 'https://' + originalMatch[1];
      }
    }
    
    // Handle Blue Origin Next.js image URLs - extract actual CloudFront URL
    if (featuredImage.includes('blueorigin.com/_next/image?url=')) {
      const urlParamMatch = featuredImage.match(/[?&]url=([^&]+)/);
      if (urlParamMatch) {
        // Decode the URL-encoded CloudFront URL
        featuredImage = decodeURIComponent(urlParamMatch[1]);
        console.log('   → Extracted CloudFront URL from Next.js proxy');
      }
    }
    
    // Remove query parameters (but only after extracting from Blue Origin URLs)
    featuredImage = featuredImage.split('?')[0];
    
    console.log('📸 Extracted first image as featured image');
    console.log('   Original: ' + imgUrl);
    console.log('   Cleaned: ' + featuredImage);
    break; // Stop after finding first acceptable image
  }
  
  if (!featuredImage) {
    // Fallback to webhook featured image if no images in content
    featuredImage = webhookData.featured_image_url || null;
    if (featuredImage) {
      console.log('⚠️ No images found in content, using webhook featured_image');
    }
  }
}

// Convert HTML content to Markdown
let contentMarkdown = htmlToMarkdown(webhookData.post_content_html || '');

// Split content to separate "Citations", "Upcoming Launches" sections
let citations = null;
let upcomingLaunches = null;
let mainContent = contentMarkdown;

// First, extract Citations section (usually comes first)
const citationsSectionMatch = mainContent.match(/(^|\n)\s*(#{1,6})\s*Citations.*/i);

if (citationsSectionMatch) {
  const splitIndex = citationsSectionMatch.index;
  
  // Everything from "Citations" onward (might include launches too)
  const citationsAndAfter = mainContent.substring(splitIndex).trim();
  
  // Everything before "Citations" = main content
  mainContent = mainContent.substring(0, splitIndex).trim();
  
  // Check if there's an "Upcoming Launches" section after Citations
  const launchAfterCitationsMatch = citationsAndAfter.match(/(^|\n)\s*(#{1,6})\s*Upcoming Launches.*/i);
  
  if (launchAfterCitationsMatch) {
    // Split citations and launches
    const launchSplitIndex = launchAfterCitationsMatch.index;
    citations = citationsAndAfter.substring(0, launchSplitIndex).trim();
    upcomingLaunches = citationsAndAfter.substring(launchSplitIndex).trim();
    
    console.log('✂️ Separated Citations and Upcoming Launches sections');
    console.log('   Citations: ' + citations.length + ' chars');
    console.log('   Launches: ' + upcomingLaunches.length + ' chars');
  } else {
    // Just citations, no launches after
    citations = citationsAndAfter;
    console.log('✂️ Separated Citations section');
    console.log('   Citations: ' + citations.length + ' chars');
  }
} else {
  // No citations found, check for standalone Upcoming Launches
  const launchSectionMatch = mainContent.match(/(^|\n)\s*(#{1,6})\s*Upcoming Launches.*/i);
  
  if (launchSectionMatch) {
    const splitIndex = launchSectionMatch.index;
    upcomingLaunches = mainContent.substring(splitIndex).trim();
    mainContent = mainContent.substring(0, splitIndex).trim();
    
    console.log('✂️ Separated Upcoming Launches section');
    console.log('   Launches: ' + upcomingLaunches.length + ' chars');
  }
}

console.log('ℹ️ Final content breakdown:');
console.log('   Main content: ' + mainContent.length + ' chars');
console.log('   Has citations: ' + (citations !== null ? 'Yes' : 'No'));
console.log('   Has launches: ' + (upcomingLaunches !== null ? 'Yes' : 'No'));

// Build debug info
const debugInfo = {
  found_citations: citations !== null,
  found_launches: upcomingLaunches !== null,
  original_length: contentMarkdown.length,
  main_content_length: mainContent.length,
  citations_length: citations ? citations.length : 0,
  launches_length: upcomingLaunches ? upcomingLaunches.length : 0,
  content_preview: contentMarkdown.substring(contentMarkdown.length - 300, contentMarkdown.length),
  extraction_successful: true,
  featured_image_source: featuredImage ? 'first_content_image' : 'none'
};

// Extract and structure all data
const structuredData = {
  // Individual elements as requested
  title: webhookData.post_title || 'Untitled',
  url: webhookData.post_url || '',
  featured_image: featuredImage,
  
  // Content (without citations and launches)
  content_markdown: mainContent,
  
  // Separated sections
  citations: citations,
  upcoming_launches: upcomingLaunches,
  has_citations: citations !== null,
  has_launches: upcomingLaunches !== null,
  
  // Additional useful data
  excerpt: webhookData.post_excerpt || '',
  author: webhookData.post_author || 'Unknown',
  category: webhookData.post_category || 'Uncategorized',
  publish_date: webhookData.post_date || '',
  post_id: webhookData.post_id || 0,
  
  // Content stats
  content_length_chars: mainContent.length,
  content_length_words: mainContent.split(/\s+/).filter(w => w.length > 0).length,
  
  // Debug information
  debug: debugInfo
};

console.log('✅ Structured data ready:');
console.log('   - Title: ' + structuredData.title);
console.log('   - URL: ' + structuredData.url);
console.log('   - Featured Image: ' + (structuredData.featured_image ? 'Yes' : 'No'));
console.log('   - Category: ' + structuredData.category);
console.log('   - Main content: ' + structuredData.content_length_words + ' words (' + structuredData.content_length_chars + ' chars)');
console.log('   - Has citations: ' + (structuredData.has_citations ? 'Yes' : 'No'));
console.log('   - Has launches: ' + (structuredData.has_launches ? 'Yes' : 'No'));
console.log('📊 Debug info available in output.debug field');

return [{
  json: structuredData
}];
