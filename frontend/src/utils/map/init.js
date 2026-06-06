import { saveMapState, loadMapState } from '../mapState';
import customization from '../../customization.json';

/**
 * Инициализирует карту Яндекс с базовой функциональностью
 */
export async function initMap({
  container,
  center,
  zoom,
  userRef,
  selectionMarkerRef,
  refreshVideosRef,
  mode,
  onMapClickRef
}) {
  if (!window.ymaps3) return null;

  await window.ymaps3.ready;

  const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapListener,
    YMapMarker
  } = window.ymaps3;

  const mapState = loadMapState(center, zoom);
  if (!container) return null;

  container.innerHTML = '';

  const map = new YMap(container, {
    location: mapState,
    mode: 'vector'
  });

  let currentZoom = zoom;
  let currentPopupElement = null;

  // Слои карты
  const schemeLayer = new YMapDefaultSchemeLayer({ customization });
  map.addChild(schemeLayer);
  map.addChild(new YMapDefaultFeaturesLayer());

  // Слушатель изменения позиции карты
  const locationListener = new YMapListener({
    onUpdate: ({ location }) => {
      if (!location) return;
      saveMapState(location);
      currentZoom = location.zoom;
    }
  });
  map.addChild(locationListener);


  // Слушатель кликов для добавления видео
  const clickListener = new YMapListener({
    onClick: (_, event) => {
      const coords = event.coordinates;

      if (mode === 'route-editor' || mode === 'point-selector') {
        if (onMapClickRef?.current) {
          onMapClickRef.current(coords);
        }
        return;
      }
    }
  });
  map.addChild(clickListener);

  return { map };
}
