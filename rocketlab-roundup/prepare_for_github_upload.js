// ============================================
// Prep Rocketlab Image for GitHub Upload
// ============================================

// ------------------------------------------
// 1. GET ALL IMAGE DATA FROM HTTP REQUEST
// ------------------------------------------
const items = $input.all();

console.log(`📦 Processing ${items.length} image(s) for GitHub upload`);

// ------------------------------------------
// 2. PROCESS EACH IMAGE
// ------------------------------------------
return items.map((inputItem, index) => {
  const imageData = inputItem.json;
  
  // HTTP Request node stores binary in the field specified in "Put Output in Field"
  // From screenshot, it's "image"
  const binaryData = inputItem.binary?.image || inputItem.binary?.data;
  
  if (!binaryData) {
    throw new Error(`No binary data found for item ${index + 1}. Available binary keys: ` + Object.keys(inputItem.binary || {}).join(', '));
  }
  
  // ------------------------------------------
  // 3. USE FILENAME FROM EXTRACTION NODE
  // ------------------------------------------
  // We already have a perfect filename from the extraction node
  const baseFilename = imageData.unique_filename || imageData.sanitized_filename || 'rocketlab-image';
  
  // Get extension from original URL or binary data
  let extension = 'jpg'; // default
  if (imageData.original_filename) {
    const extMatch = imageData.original_filename.match(/\.([^.]+)$/);
    if (extMatch) {
      extension = extMatch[1].toLowerCase();
    }
  } else if (binaryData.mimeType) {
    // Derive from mime type if needed
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    extension = mimeMap[binaryData.mimeType] || 'jpg';
  }
  
  // If baseFilename already has extension, don't add another
  const hasExtension = /\.[a-z]{3,4}$/i.test(baseFilename);
  const filename = hasExtension ? baseFilename : `${baseFilename}.${extension}`;
  
  // ------------------------------------------
  // 4. GENERATE GITHUB PATH
  // ------------------------------------------
  const now = new Date();
  
  // Configuration
  const category = 'monthly-deep-dives';
  const subcategory = 'rocket-lab-roundup';
  
  // Format: YYYY-MM
  const yearMonth = now.toISOString().slice(0, 7);
  
  // Add timestamp to make filename unique (avoids SHA requirement)
  const timestamp = now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15); // YYYYMMDD-HHMMSS
  
  // Split filename into base and extension
  const filenameParts = filename.match(/^(.+?)(\.[^.]+)?$/);
  const baseName = filenameParts[1];
  const ext = filenameParts[2] || '';
  
  // Create timestamped filename
  const timestampedFilename = `${baseName}_${timestamp}${ext}`;
  
  // Build GitHub path
  const path = `${category}/${subcategory}/${yearMonth}/${timestampedFilename}`;
  
  // GitHub configuration
  const owner = 'Godimas101'; 
  const repo = 'tcs-images';
  const branch = 'main';
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  
  const commitMessage = `Add Rocket Lab image: ${imageData.article_title?.substring(0, 50) || filename}`;
  
  // ------------------------------------------
  // 5. LOG INFO (HELPFUL FOR DEBUGGING)
  // ------------------------------------------
  console.log(`✅ Image ${index + 1}/${items.length} prepared for GitHub:`);
  console.log(`   Filename: ${timestampedFilename}`);
  console.log(`   Article: ${imageData.article_title || 'Unknown'}`);
  console.log(`   GitHub path: ${path}`);
  console.log(`   Raw URL: ${rawUrl}`);
  
  // ------------------------------------------
  // 6. RETURN ITEM FOR GITHUB UPLOAD
  // ------------------------------------------
  return {
    binary: {
      image: {  // Use same property name as HTTP Request output
        ...binaryData,
        fileName: timestampedFilename  // Updated filename for GitHub
      }
    },
    json: {
      // Image data
      filename: timestampedFilename,
      original_url: imageData.url,
      
      // GitHub data
      github_path: path,
      github_raw_url: rawUrl,
      github_owner: owner,
      github_repo: repo,
      github_branch: branch,
      commit_message: commitMessage,
      
      // Article context (passed through)
      article_title: imageData.article_title,
      article_url: imageData.article_url,
      article_index: imageData.article_index,
      
      // Status
      ready: true
    }
  };
});
