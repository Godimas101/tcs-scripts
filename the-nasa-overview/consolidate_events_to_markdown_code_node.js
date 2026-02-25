// Get events from the event aggregator API
const results = $node['Get Events'].json.results || [];

// Build consolidated markdown document
let markdown = "# Space Events This Week\n\n";
markdown += `*Generated on ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  timeZoneName: 'short'
})}*\n\n`;

// If no events found, return empty message
if (results.length === 0) {
  markdown += "No events scheduled this week.\n\n";
  markdown += "---\n\n*End of Space Events Digest*\n";
  
  return [{
    json: {
      markdown: markdown,
      event_count: 0,
      generated_date: new Date().toISOString()
    }
  }];
}

// Add event count summary
markdown += `**Total Events:** ${results.length}\n\n`;
markdown += "---\n\n";

// Process each event
results.forEach((item, index) => {
  const name = item.name || 'Untitled Event';
  const url = item.news_url || item.url || '#';
  const desc = item.description || 'No description available.';
  
  // Event title as heading with URL
  if (url && url !== '#') {
    markdown += `## ${index + 1}. [${name}](${url})\n\n`;
  } else {
    markdown += `## ${index + 1}. ${name}\n\n`;
  }
  
  // Event metadata (if available)
  const metaParts = [];
  if (item.type) {
    metaParts.push(`**Type:** ${item.type}`);
  }
  if (item.location) {
    metaParts.push(`**Location:** ${item.location}`);
  }
  if (item.date) {
    metaParts.push(`**Date:** ${item.date}`);
  }
  
  if (metaParts.length > 0) {
    markdown += metaParts.join(" | ") + "\n\n";
  }
  
  // Featured image (if available)
  if (item.feature_image) {
    markdown += `![Event Image](${item.feature_image})\n\n`;
  }
  
  // Event description
  markdown += desc + "\n\n";
  
  // Link to full event details
  if (url && url !== '#') {
    markdown += `[View Full Event Details →](${url})\n\n`;
  }
  
  // Separator between events
  markdown += "---\n\n";
});

// Add footer
markdown += "*End of Space Events Digest*\n";

// Return single item with consolidated markdown
return [{
  json: {
    markdown: markdown,
    event_count: results.length,
    generated_date: new Date().toISOString()
  }
}];
