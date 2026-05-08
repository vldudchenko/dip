import { saveMapState, loadMapState } from '../mapState';
import customization from '../../customization.json';
import { buildRoute } from './helpers';
import { createUploadPopupElement } from './uploadPopup';
import { LiveMarkerUploadController } from './liveMarkerUpload';

/**
 * Инициализирует карту Яндекс с базовой функциональностью
 */
export async function initMap({
  containerId,
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
  const container = document.getElementById(containerId);
  if (!container) return null;

  container.innerHTML = '';

  const map = new YMap(container, {
    location: mapState,
    mode: 'vector'
  });

  let currentZoom = zoom;
  let activeLiveController = null;
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

  // Слушатель для live-маршрута
  const liveRouteClickListener = new YMapListener({
    onClick: async (_, event) => {
      if (!activeLiveController?.isActive || !event?.coordinates) return;

      try {
        const selected = await activeLiveController.complete(event.coordinates, buildRoute);
        if (!selected) return;

        if (currentPopupElement?.updateSecondPoint) {
          currentPopupElement.updateSecondPoint(event.coordinates, selected.routeGeometry);
        }
      } catch (error) {
        console.error('Error building walking route:', error);
        alert('Не удалось построить пешеходный маршрут. Выберите другие точки.');
        activeLiveController?.reset();
        activeLiveController = null;
      }
    }
  });
  map.addChild(liveRouteClickListener);

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
