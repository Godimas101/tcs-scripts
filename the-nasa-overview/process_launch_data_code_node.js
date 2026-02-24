const results = $node['Get Upcoming Launches'].json.results || [];

const filtered = results.map(item => {
  const launchDate = item.net ? new Date(item.net) : null;

  // Get video URL from API, or set to 'noVideo' if not available
  let vidUrl = item.vid_urls?.[0]?.url || 'noVideo';

  // === SIMPLE IMAGE FALLBACK ===
  let rocketImage = item.rocket?.configuration?.image?.image_url;
  if (!rocketImage || rocketImage.trim() === '') {
    rocketImage = 'https://thecanadian.space/wp-content/uploads/2025/11/imageNotAvailable.webp';
  }

  return {
    net: item.net,
    launch_date: launchDate ? launchDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) : 'Unknown',
    launch_time: launchDate ? launchDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ' UTC' : 'Unknown',
    launch_service_provider_name: item.launch_service_provider?.name || 'Unknown',
    launch_service_provider_type: item.launch_service_provider?.type?.name || 'Unknown',
    rocket_name: item.rocket?.configuration?.name || 'Unknown',
    rocket_image_url: rocketImage,
    mission_name: item.mission?.name || item.name || 'Unknown',
    mission_description: item.mission?.description || 'No description available',
    vid_url: vidUrl
  };
});

return [{ json: { results: filtered } }];
