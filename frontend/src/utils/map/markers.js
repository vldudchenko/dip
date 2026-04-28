import { createAvatarElement } from './helpers';

// Иконки для типов транспорта
const TRANSPORT_ICONS = {
  walking: '🚶',
  bus:     '🚌',
  train:   '🚂',
  driving: '🚗',
  bicycle: '🚲',
  boat:    '🚢',
};

// Цвета для типов транспорта
const TRANSPORT_COLORS = {
  walking: '#059669',
  bus:     '#2563eb',
  train:   '#7c3aed',
  driving: '#d97706',
  bicycle: '#0891b2',
  boat:    '#0d9488',
};

/**
 * Создаёт маркер для видео с аватаркой пользователя
 */
export function createVideoMarkerElement(video, onClick, isHighlighted = false) {
  const avatarUrl = video.users?.avatar;
  const login = video.users?.login;
  
  const element = createAvatarElement(avatarUrl, login, isHighlighted);
  element.onclick = onClick;
  return element;
}

/**
 * Создаёт YMapMarker с готовым элементом
 */
export function createMarker({ coordinates, element }) {
  return new window.ymaps3.YMapMarker({ coordinates }, element);
}

/**
 * Рендерит маркер для feature (используется при массовом отображении)
 */
export function renderMarker(feature, navigate, editModeRef, currentUser, highlightedVideoId) {
  const video = feature.properties.video;
  const isHighlighted = highlightedVideoId && video.id === highlightedVideoId;

  const element = createVideoMarkerElement(
    video,
    () => {
      if (editModeRef?.current) return;
      navigate(`/video/${video.users?.login || 'user'}/${video.id}`);
    },
    isHighlighted
  );

  return new window.ymaps3.YMapMarker(
    { coordinates: feature.geometry.coordinates },
    element
  );
}

/**
 * Создаёт полный маркер для видео (маркер + элемент)
 */
export function createVideoMarker(video, navigate, editModeRef, currentUser) {
  const element = createVideoMarkerElement(
    video,
    () => {
      if (editModeRef?.current) return;
      navigate(`/video/${video.users?.login || 'user'}/${video.id}`);
    }
  );

  const marker = createMarker({
    coordinates: [Number(video.longitude), Number(video.latitude)],
    element
  });

  return { marker, element };
}

/**
 * Создаёт красивый элемент маркера для точки маршрута
 */
export function createRouteMarkerElement({ index, transport, isActive = false, isViewOnly = false }) {
  const element = document.createElement('div');
  element.className = `route-marker ${isActive ? 'active' : ''} ${isViewOnly ? 'view-only' : ''}`;
  
  const transportIcon = TRANSPORT_ICONS[transport] || '📍';
  const transportColor = TRANSPORT_COLORS[transport] || '#7c3aed';
  const activeColor = isViewOnly ? transportColor : '#5b21b6';
  const baseColor = isActive ? activeColor : (isViewOnly ? transportColor : '#7c3aed');
  
  const size = isViewOnly ? 30 : 40;
  
  element.style.cssText = `
    position: relative;
    width: ${size}px;
    height: ${size}px;
    background: ${baseColor};
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    cursor: pointer;
    transform: translate(-50%, -100%) rotate(-45deg);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    z-index: ${isActive ? 100 : 1};
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    transform: rotate(45deg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: ${size / 3}px;
    line-height: 1;
  `;

  content.innerHTML = `
    <span style="margin-top: -2px; font-weight: 800;">${index + 1}</span>
    ${!isViewOnly ? `<span style="font-size: 0.75em;">${transportIcon}</span>` : ''}
  `;

  element.appendChild(content);

  // Эффект пульсации для активной точки
  if (isActive) {
    const pulse = document.createElement('div');
    pulse.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(124, 58, 237, 0.4);
      border-radius: 50%;
      animation: marker-pulse 2s infinite;
      z-index: -1;
    `;
    element.appendChild(pulse);
  }

  return element;
}
