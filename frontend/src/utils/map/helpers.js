/**
 * Общие вспомогательные функции для работы с картами
 */

import defaultAvatar from '../../static/Avatar.png';

// ==================== Маршруты ====================

function getRouteCacheKey(start, end, mode = 'walking') {
  const normalize = (value) => Number.parseFloat(value).toFixed(5);
  return `${normalize(start.lat)}:${normalize(start.lng)}:${normalize(end.lat)}:${normalize(end.lng)}:${mode}`;
}

function getCachedRoute(cacheKey) {
  try {
    const raw = sessionStorage.getItem(`route:${cacheKey}`);
    if (!raw) return null;

    const data = JSON.parse(raw);
    const ttlMs = 24 * 60 * 60 * 1000;
    if (Date.now() - data.createdAt > ttlMs) {
      sessionStorage.removeItem(`route:${cacheKey}`);
      return null;
    }

    return data.route;
  } catch {
    return null;
  }
}

function setCachedRoute(cacheKey, route) {
  try {
    sessionStorage.setItem(
      `route:${cacheKey}`,
      JSON.stringify({ route, createdAt: Date.now() })
    );
  } catch {
    // Ignore quota errors.
  }
}

export async function buildRoute(start, end, mode = 'walking') {
  const cacheKey = getRouteCacheKey(start, end, mode);
  const cachedRoute = getCachedRoute(cacheKey);
  if (cachedRoute?.geometry?.length) {
    return cachedRoute;
  }

  try {
    const routeUrl = `https://router.project-osrm.org/route/v1/${mode}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`;
    const response = await fetch(routeUrl);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Маршрут не найден');
    }

    const geometry = data.routes[0].geometry;
    const coordinates = geometry.coordinates.map(([lng, lat]) => [Number(lng), Number(lat)]);

    if (coordinates.length === 0) {
      throw new Error('Пустая геометрия маршрута');
    }

    const result = {
      distance: data.routes[0].distance || 0,
      duration: data.routes[0].duration || 0,
      geometry: coordinates,
      start: [Number(start.lng), Number(start.lat)],
      end: [Number(end.lng), Number(end.lat)]
    };

    setCachedRoute(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error building route:', error);
    throw new Error('Не удалось построить пешеходный маршрут');
  }
}

// ==================== Геометрия ====================

export function getBounds(geometry) {
  const lons = geometry.map((p) => p[0]);
  const lats = geometry.map((p) => p[1]);

  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  };
}


export function toLngLatRoute(routeGeometry) {
  if (!Array.isArray(routeGeometry)) return [];
  return routeGeometry
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map((point) => [Number(point[0]), Number(point[1])]);
}

// ==================== Маркеры ====================

export function createAvatarElement(avatarUrl, login, isHighlighted = false, opacity = 1) {
  const element = document.createElement('div');
  element.className = 'VideoMarker';
  element.style.width = '50px';
  element.style.height = '50px';
  element.style.borderRadius = '50%';
  element.style.background = 'rgba(255, 255, 255, 0.4)';
  element.style.backdropFilter = 'blur(10px)';
  element.style.webkitBackdropFilter = 'blur(10px)';
  element.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.opacity = opacity.toString();
  element.style.transition = 'opacity 0.3s ease';

  element.innerHTML = `
    <img
      src="${avatarUrl || defaultAvatar}"
      alt="${login}"
      style="
        width:100%;
        height:100%;
        border-radius:50%;
        border:3px solid ${isHighlighted ? '#22c55e' : 'white'};
        object-fit:cover;
        cursor:pointer;
        display:block;
      "
      onerror="this.src='${defaultAvatar}'"
    />
  `;
  return element;
}

export function createPointMarkerElement(color = '#7c3aed', size = 20) {
  const element = document.createElement('div');
  element.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transform: translate(-50%, -50%);
  `;
  return element;
}

// ==================== Утилиты ====================

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function removeMapEntity(map, entity) {
  if (!entity) return;
  try {
    map.removeChild(entity);
  } catch {
    // Ignore remove errors when map lifecycle already changed.
  }
}
