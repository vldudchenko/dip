const MAP_STATE_KEY = "map_state";

export function saveMapState(location) {

  const state = {
    center: location.center,
    zoom: location.zoom
  };

  localStorage.setItem(MAP_STATE_KEY, JSON.stringify(state));
}

export function loadMapState(defaultCenter, defaultZoom) {

  const saved = localStorage.getItem(MAP_STATE_KEY);

  if (!saved) {
    return {
      center: defaultCenter,
      zoom: defaultZoom
    };
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {
      center: defaultCenter,
      zoom: defaultZoom
    };
  }
}