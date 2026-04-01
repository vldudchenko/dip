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
  editModeRef,
  onUploadRef,
  onFetchVideosRef,
  navigate,
  highlightedVideoIdRef,
  refreshVideosRef
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

      if (activeLiveController?.isActive) return;
      if (!editModeRef.current) return;
      if (!userRef.current) {
        alert('Ошибка: пользователь не авторизован');
        return;
      }

      if (selectionMarkerRef.current) {
        map.removeChild(selectionMarkerRef.current);
        selectionMarkerRef.current = null;
      }

      activeLiveController?.reset();
      activeLiveController = null;

      let uploading = false;

      const handleLiveRouteSelect = (startPoint, isActive) => {
        if (isActive && startPoint) {
          activeLiveController?.reset();
          activeLiveController = new LiveMarkerUploadController(map);
          activeLiveController.activate(startPoint);
          return;
        }

        activeLiveController?.reset();
        activeLiveController = null;
      };

      const { popupElement, uploadButton } = createUploadPopupElement(
        map,
        coords,
        async (uploadData) => {
          uploading = true;
          uploadButton.disabled = true;
          uploadButton.textContent = 'Загрузка...';

          try {
            const { file, isLive, coordinates, routeStart, routeEnd, routeGeometry, videoDuration } = uploadData;

            const formData = new FormData();
            formData.append('video', file);
            formData.append('userId', userRef.current.id);
            formData.append('latitude', coordinates[1]);
            formData.append('longitude', coordinates[0]);
            formData.append('isLive', isLive);

            if (isLive) {
              formData.append('routeStart', JSON.stringify(routeStart));
              formData.append('routeEnd', JSON.stringify(routeEnd));
              formData.append('routeGeometry', JSON.stringify(routeGeometry));
              formData.append('videoDuration', videoDuration);
            }

            const res = await fetch(`${process.env.REACT_APP_API_URL}/videos`, {
              method: 'POST',
              body: formData
            });
            const result = await res.json();

            if (result?.success) {
              activeLiveController?.reset();
              activeLiveController = null;

              if (selectionMarkerRef.current) {
                map.removeChild(selectionMarkerRef.current);
                selectionMarkerRef.current = null;
              }

              // Обновляем список видео
              if (refreshVideosRef?.current) {
                refreshVideosRef.current();
              }
              return { success: true };
            }

            const errorText = result?.error || 'Ошибка загрузки';
            alert(errorText);
            uploading = false;
            uploadButton.disabled = false;
            uploadButton.textContent = 'Загрузить видео';
            return { success: false, error: errorText };
          } catch (error) {
            console.error('Upload error:', error);
            alert('Ошибка загрузки видео');
            uploading = false;
            uploadButton.disabled = false;
            uploadButton.textContent = 'Загрузить видео';
            return { success: false, error: 'Ошибка загрузки видео' };
          }
        },
        () => {
          activeLiveController?.reset();
          activeLiveController = null;

          if (selectionMarkerRef.current) {
            map.removeChild(selectionMarkerRef.current);
            selectionMarkerRef.current = null;
          }
        },
        uploading,
        handleLiveRouteSelect
      );

      currentPopupElement = popupElement;

      const marker = new YMapMarker(
        {
          coordinates: coords,
          onClick: () => {
            popupElement.style.display = 'block';
          }
        },
        popupElement
      );

      map.addChild(marker);
      selectionMarkerRef.current = marker;
    }
  });
  map.addChild(clickListener);

  return { map };
}
