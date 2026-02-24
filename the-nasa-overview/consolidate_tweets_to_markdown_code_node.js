// Get all input items from Twitter/X feed processors
const items = $input.all();

// Build consolidated markdown document
let markdown = "# NASA Social Media Digest\n\n";
markdown += `*Generated on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short'
})}*\n\n`;

// Extract all tweet sections and count total tweets
let totalTweets = 0;
const sources = [];

items.forEach(item => {
  const data = item.json;
  
  // Find the markdown field (could be markdown_nasa_tweets, markdown_nasajpl_tweets, etc.)
  const markdownField = Object.keys(data).find(key => key.startsWith('markdown_') && key.endsWith('_tweets'));
  
  if (markdownField && data[markdownField]) {
    // Extract source name from field name (e.g., markdown_nasa_tweets -> NASA)
    const sourceName = markdownField
      .replace('markdown_', '')
      .replace('_tweets', '')
      .toUpperCase()
      .replace('NASAJPL', 'NASA JPL')
      .replace('NASAMARS', 'NASA Mars')
      .replace('NASAARTEMIS', 'NASA Artemis');
    
    sources.push(sourceName);
    
    // Add tweet count if available
    if (data.tweet_count !== undefined) {
      totalTweets += data.tweet_count;
    }
    
    // Append the markdown content
    markdown += data[markdownField] + "\n";
  }
});

// If no tweets found, return empty message
if (totalTweets === 0) {
  markdown += "No tweets available from any sources at this time.\n\n";
} else {
  // Add summary at the top (insert after the title and date)
  const summaryText = `**Total Tweets:** ${totalTweets} | **Sources:** ${sources.join(', ')}\n\n---\n\n`;
  
  // Find the position after the date line to insert summary
  const dateLineEnd = markdown.indexOf('*\n\n') + 4;
  markdown = markdown.slice(0, dateLineEnd) + summaryText + markdown.slice(dateLineEnd);
}

// Add footer
markdown += "---\n\n*End of NASA Social Media Digest*\n";

// Return single item with consolidated markdown
return [{
  json: {
    markdown: markdown,
    total_tweet_count: totalTweets,
    sources: sources,
    generated_date: new Date().toISOString()
  }
}];
