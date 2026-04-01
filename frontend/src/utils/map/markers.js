import { createAvatarElement } from './helpers';

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
