/**
 * Вспомогательные функции для работы с Leaflet картой.
 * Leaflet использует { lat, lng } порядок, а в проекте координаты хранятся как [lng, lat].
 * Эти утилиты обеспечивают корректное преобразование.
 */

/**
 * Конвертирует проектные координаты [lng, lat] в Leaflet LatLng { lat, lng }
 */
export function toLeafletLatLng(coords) {
  if (!coords) return null;
  const [lng, lat] = Array.isArray(coords) ? coords : [coords.lng, coords.lat];
  return [lat, lng]; // Leaflet принимает [lat, lng]
}

/**
 * Конвертирует массив координат проекта [[lng, lat], ...] в формат Leaflet [[lat, lng], ...]
 */
export function toLeafletPolyline(coords) {
  if (!Array.isArray(coords)) return [];
  return coords.map(toLeafletLatLng).filter(Boolean);
}

/**
 * Конвертирует Leaflet LatLng в проектный формат [lng, lat]
 */
export function fromLeafletLatLng(latLng) {
  if (!latLng) return null;
  return [latLng.lng, latLng.lat];
}

/**
 * Вычисляет bounds для массива координат проекта [[lng, lat], ...]
 */
export function getBoundsFromCoords(coordsArray) {
  if (!coordsArray || coordsArray.length === 0) return null;
  const valid = coordsArray.map(p => Array.isArray(p) ? p : p?.coords).filter(Boolean);
  if (valid.length === 0) return null;

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  valid.forEach(([lng, lat]) => {
    if (lng < minLon) minLon = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLon) maxLon = lng;
    if (lat > maxLat) maxLat = lat;
  });

  // Leaflet bounds: [[minLat, minLon], [maxLat, maxLon]]
  return [[minLat, minLon], [maxLat, maxLon]];
}

/**
 * Ключ для сохранения состояния карты Leaflet в localStorage
 */
const OSM_MAP_STATE_KEY = 'osm_map_state';

export function saveOsmMapState(center, zoom) {
  try {
    localStorage.setItem(OSM_MAP_STATE_KEY, JSON.stringify({ center, zoom }));
  } catch {}
}

export function loadOsmMapState(defaultCenter, defaultZoom) {
  try {
    const raw = localStorage.getItem(OSM_MAP_STATE_KEY);
    if (!raw) return { center: defaultCenter, zoom: defaultZoom };
    const { center, zoom } = JSON.parse(raw);
    return { center: center || defaultCenter, zoom: zoom || defaultZoom };
  } catch {
    return { center: defaultCenter, zoom: defaultZoom };
  }
}

/**
 * Обратное геокодирование через Nominatim (OpenStreetMap)
 * Бесплатное решение без API ключа.
 * @param {number} lng - Долгота
 * @param {number} lat - Широта
 * @returns {Promise<string|null>} - Адрес или null
 */
export async function reverseGeocode(lng, lat) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'ru-RU,ru;q=0.9'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    
    // Формируем более подробный адрес (город/село + улица + номер дома, если есть)
    const addr = data.address;
    if (addr) {
      const parts = [];
      
      // Населенный пункт
      const settlement = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb;
      if (settlement) parts.push(settlement);
      
      // Улица
      if (addr.road) parts.push(addr.road);
      
      // Номер дома
      if (addr.house_number) parts.push(addr.house_number);
      
      if (parts.length > 0) return parts.join(', ');
      
      // Если ничего из вышеперечисленного нет, берем название объекта
      if (data.name) return data.name;
    }

    return data.display_name || null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}
