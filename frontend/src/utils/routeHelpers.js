import { STOP_TYPE_MAP } from './routeConstants';

/**
 * Расчет общего расстояния маршрута в км
 */
export const calculateTotalDistance = (points) => {
  if (!points || points.length < 2) return 0;

  const R = 6371; // km
  let dist = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = Array.isArray(points[i - 1]) ? points[i - 1] : points[i - 1].coords;
    const curr = Array.isArray(points[i]) ? points[i] : points[i].coords;
    if (!prev || !curr) continue;

    const [lon1, lat1] = prev;
    const [lon2, lat2] = curr;

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
 * Форматирование дистанции (м или км)
 */
export const formatDistance = (distKm) => {
  let meters = distKm * 1000;
  meters = Math.round(meters / 50) * 50;

  if (meters < 1000) {
    return `${meters}м`;
  }
  return `${(meters / 1000).toFixed(1)}км`;
};

/**
 * Форматирование адреса
 */
export const formatAddress = (addr) => {
  return addr || '';
};

/**
 * Генерация описания маршрута по сегментам
 */
export const generateRouteDescription = (points, addresses = {}) => {
  if (!points || points.length === 0) return [];

  const transportActionMap = {
    'walking': 'пешком',
    'bus': 'на автобусе',
    'train': 'на электричке',
    'boat': 'на пароме/лодке'
  };

  let segments = [];
  let currentTransports = []; // Будем хранить объекты { type, distance }

  segments.push({
    isStart: true,
    title: 'Старт',
    address: formatAddress(addresses[0]) || '',
    transition: null
  });

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    const prevPt = points[i - 1];
    const dist = calculateTotalDistance([prevPt, pt]);
    const t = pt.transport || 'walking';

    let last = currentTransports[currentTransports.length - 1];
    if (last && last.type === t) {
      last.distance += dist;
    } else {
      currentTransports.push({ type: t, distance: dist });
    }

    const isFinish = pt.stop_type === 'finish' || i === points.length - 1;
    const isStop = pt.stop_type && pt.stop_type !== 'none' && !isFinish;

    if (isStop || isFinish) {
      let transitionText = currentTransports
        .map(tr => `${transportActionMap[tr.type] || tr.type} ~ ${formatDistance(tr.distance)}`)
        .join(', после ');

      let stopName = '';
      if (isFinish) {
        stopName = 'Финиш';
      } else {
        const rawLabel = STOP_TYPE_MAP[pt.stop_type]?.label || 'Остановка';
        // Убираем эмодзи (простой способ для данных меток)
        stopName = rawLabel.replace(/^[\s\S]*?\s/, '').trim();
        if (!stopName) stopName = rawLabel; // Fallback если пробела нет
      }

      segments.push({
        isStart: false,
        title: stopName,
        address: formatAddress(addresses[i]) || '',
        transition: transitionText
      });

      currentTransports = [];
    }
  }

  return segments;
};
