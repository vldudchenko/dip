import { STOP_TYPE_MAP } from './routeConstants';

/**
 * Нормализация данных пути маршрута
 * Приводит разные форматы (массив координат или объекты с transport) к единому виду [lon, lat]
 */
export const normalizeRoutePath = (pathData) => {
  if (!pathData || !Array.isArray(pathData)) return [];
  return pathData.map(p => {
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object' && p.coords) return p.coords;
    return null;
  }).filter(Boolean);
};

/**
 * Расчет общего расстояния маршрута в км
 */
export const calculateTotalDistance = (points) => {
  const normalized = normalizeRoutePath(points);
  if (normalized.length < 2) return 0;

  const R = 6371; // km
  let dist = 0;

  for (let i = 1; i < normalized.length; i++) {
    const [lon1, lat1] = normalized[i - 1];
    const [lon2, lat2] = normalized[i];

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    dist += R * c;
  }
  return dist;
};

/**
 * Расчет примерного времени маршрута (в минутах)
 */
export const calculateTotalDuration = (pathData) => {
  if (!pathData || !Array.isArray(pathData) || pathData.length < 2) return 0;
  
  let totalMinutes = 0;
  const speeds = {
    'walking': 5,
    'cycling': 15,
    'driving': 40,
    'bus': 30,
    'train': 60,
    'boat': 15
  };

  for (let i = 1; i < pathData.length; i++) {
    const p1 = Array.isArray(pathData[i - 1]) ? pathData[i - 1] : pathData[i - 1].coords;
    const p2 = Array.isArray(pathData[i]) ? pathData[i] : pathData[i].coords;
    if (!p1 || !p2) continue;

    const dist = calculateTotalDistance([p1, p2]);
    const transport = (pathData[i] && pathData[i].transport) || 'walking';
    const speed = speeds[transport] || 5;
    totalMinutes += (dist / speed) * 60;
  }
  return Math.round(totalMinutes);
};

/**
 * Форматирование длительности (мин -> д ч мин)
 */
export const formatDuration = (totalMinutes) => {
  if (totalMinutes < 60) return `${totalMinutes}м`;

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}д ${hours}ч`;
  }
  return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`.trim();
};

/**
 * Логика прилипания для слайдера времени (10м, 30м, 60м)
 */
export const getSnappedTime = (rawVal, max) => {
  if (rawVal <= 5) return 0;

  const currentStep = rawVal < 60 ? 10 : (rawVal < 1440 ? 30 : 60);
  if (max - rawVal < currentStep / 2) return max;

  let snapped;
  if (rawVal < 60) {
    snapped = Math.round(rawVal / 10) * 10;
  } else if (rawVal < 1440) {
    snapped = Math.round(rawVal / 30) * 30;
  } else {
    snapped = Math.round(rawVal / 60) * 60;
  }
  return Math.min(Math.max(snapped, 0), max);
};


