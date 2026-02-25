// ============================================
// Check if file exists on GitHub and get SHA
// ============================================

const items = $input.all();

console.log(`🔍 Checking ${items.length} file(s) on GitHub...`);

return items.map((item, index) => {
  const data = item.json;
  
  // Build GitHub API URL to check if file exists
  const checkUrl = `https://api.github.com/repos/${data.github_owner}/${data.github_repo}/contents/${data.github_path}`;
  
  console.log(`   Checking file ${index + 1}/${items.length}: ${data.filename}`);
  
  return {
    binary: item.binary,
    json: {
      ...data,
      check_url: checkUrl,
      // Will be populated by next HTTP Request node
      needs_sha: false,
      file_exists: false
    }
  };
});
