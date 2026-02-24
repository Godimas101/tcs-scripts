// Generate dynamic HTML cards based on available launches
const launches = $input.first().json.results || [];

let html = `<div style="display: flex; flex-direction: column; align-items: center; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="text-align: center;">Upcoming Launches</h1>
  <br>
`;

if (launches.length === 0) {
  html += `  <div style="text-align: center; padding: 40px; color: #666;">
    <p style="font-size: 18px;">No upcoming launches scheduled at this time.</p>
  </div>
`;
} else {
  // Generate a card for each launch
  launches.forEach((launch, index) => {
    // Determine video link or "no video" message
    const videoLink = launch.vid_url === 'noVideo' 
      ? '<span style="font-weight: bold; color: #666;">📽️ No Livestream scheduled yet</span>'
      : `<a href="${launch.vid_url}" target="_blank" style="text-decoration: none; font-weight: bold;">🚀 Watch Livestream</a>`;
    
    html += `
  <!-- CARD ${index + 1} -->
  <div style="border: 3px solid; padding: 15px; margin-bottom: 15px; max-width: 450px; width: 100%; box-sizing: border-box; border-radius: 8px;">
    <h3 style="text-align: center; margin: 0 0 10px;">${launch.mission_name}</h3>
    <img src="${launch.rocket_image_url}" alt="${launch.rocket_name}" style="max-width: 100%; height: auto; border-radius: 6px; margin-bottom: 10px;">
    <p style="text-align: left; margin: 0; font-size: 14px; line-height: 1.5;">
      <strong>Launch Provider:</strong> ${launch.launch_service_provider_name} - ${launch.launch_service_provider_type}<br>
      <strong>Launch Date:</strong> ${launch.launch_date}<br>
      <strong>Launch Time:</strong> ${launch.launch_time}<br>
      <strong>Vehicle:</strong> ${launch.rocket_name}<br>
      <strong>Brief:</strong> ${launch.mission_description}<br><br>
      ${videoLink}
    </p>
  </div>
`;
  });
}

html += `</div>`;

console.log(`Generated HTML for ${launches.length} launch card(s)`);

return [{
  json: {
    html_cards: html,
    card_count: launches.length
  }
}];
