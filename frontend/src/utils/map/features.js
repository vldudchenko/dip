export function videosToFeatures(videos) {
  return videos.map((video) => ({
    id: video.id,
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [Number(video.longitude), Number(video.latitude)]
    },
    properties: {
      video
    }
  }));
}
