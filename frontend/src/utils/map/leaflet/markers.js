import L from 'leaflet';
import defaultAvatar from '../../../static/Avatar.png';
import { getTransportOption, STOP_TYPE_MAP } from '../../routeConstants';

/**
 * Создаёт Leaflet DivIcon с аватаркой пользователя для маркера видео
 */
export function createVideoIcon(video, isHighlighted = false) {
  const avatarUrl = video?.users?.avatar || defaultAvatar;
  const login = video?.users?.login || 'user';
  const borderColor = isHighlighted ? '#22c55e' : 'white';

  return L.divIcon({
    className: '',
    html: `
      <div class="VideoMarker" style="cursor:pointer;">
        <img
          src="${avatarUrl}"
          alt="${login}"
          style="
            width:50px;
            height:50px;
            border-radius:50%;
            border:3px solid ${borderColor};
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            object-fit:cover;
            display:block;
          "
          onerror="this.src='${defaultAvatar}'"
        />
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25],
  });
}

/**
 * Создаёт Leaflet DivIcon для точки маршрута
 */
export function createRoutePointIcon(pointData, isStart, transportColor, stopTypeLabel) {
  const stopType = pointData?.stop_type;
  const isFinish = stopType === 'finish';

  let bgColor = transportColor || '#059669';
  if (isStart) bgColor = '#059669';
  if (isFinish) bgColor = '#dc2626';

  let html;
  if (isStart || isFinish || (stopType && stopType !== 'none' && stopType !== 'start')) {
    const label = isStart ? 'Старт' : isFinish ? 'Финиш' : (stopTypeLabel || stopType);
    html = `
      <div style="
        background:${bgColor};
        color:white;
        padding:4px 12px;
        border-radius:14px;
        font-size:12px;
        font-weight:bold;
        white-space:nowrap;
        box-shadow:0 2px 6px rgba(0,0,0,0.3);
        border:2px solid white;
        cursor:pointer;
        transform:translate(-50%,-50%);
        width: max-content;
        display: flex;
        align-items: center;
        justify-content: center;
      ">${label}</div>
    `;
    return L.divIcon({ className: '', html, iconSize: [0, 0], iconAnchor: [0, 0] });
  } else {
    html = `
      <div style="
        width:14px;
        height:14px;
        background:${bgColor};
        border:2px solid white;
        border-radius:50%;
        box-shadow:0 0 4px rgba(0,0,0,0.5);
        cursor:pointer;
        transform:translate(-50%,-50%);
      "></div>
    `;
    return L.divIcon({ className: '', html, iconSize: [0, 0], iconAnchor: [0, 0] });
  }
}

/**
 * Создаёт DivIcon с аватаркой для live-маркера
 */
export function createAvatarIcon(avatarUrl, login, isHighlighted = false) {
  const borderColor = isHighlighted ? '#22c55e' : '#7c3aed';
  return L.divIcon({
    className: '',
    html: `
      <div style="transform:translate(-50%,-50%);">
        <img
          src="${avatarUrl || defaultAvatar}"
          alt="${login || ''}"
          style="
            width:50px;
            height:50px;
            border-radius:50%;
            border:3px solid ${borderColor};
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            object-fit:cover;
            display:block;
          "
          onerror="this.src='${defaultAvatar}'"
        />
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
