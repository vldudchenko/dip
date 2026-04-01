import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../utils/constants';
import { initMap } from '../utils/mapInit';
import { loadMapState } from '../utils/mapState';
import { videosToFeatures } from '../utils/map/features';
import { renderMarker } from '../utils/map/markers';

const DEBOUNCE_DELAY = 500;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function Map({ user, videos, editMode, fetchVideos, onUploadRef, onFetchVideosRef }) {
  const [map, setMap] = useState(null);
  const [mapCenter, setMapCenter] = useState(() => {
    // Используем координаты из mapState или по умолчанию
    const saved = loadMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    return saved.center;
  });
  const [mapZoom, setMapZoom] = useState(() => {
    const saved = loadMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    return saved.zoom;
  });
  const [mapSize, setMapSize] = useState();
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [highlightedVideoId, setHighlightedVideoId] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const mapContainerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const editModeRef = useRef(editMode);
  const fetchVideosRef = useRef(fetchVideos);
  const userRef = useRef(user);
  const highlightedVideoIdRef = useRef(null);
  const lastFetchCoordsRef = useRef({ lat: null, lng: null });
  const mapInitializedRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);
  useEffect(() => { fetchVideosRef.current = fetchVideos; }, [fetchVideos]);

  // Обработка координат из state (при переходе со страницы видео)
  useEffect(() => {
    if (!map) return;
    const state = location.state;
    if (state?.center && state?.highlightedVideoId) {
      map.update({
        location: {
          center: state.center,
          zoom: state.zoom || 17
        }
      });

      setHighlightedVideoId(state.highlightedVideoId);
      highlightedVideoIdRef.current = state.highlightedVideoId;

      setTimeout(() => {
        setHighlightedVideoId(null);
        highlightedVideoIdRef.current = null;
      }, 10000);

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [map, location.state, navigate]);

  useEffect(() => {
    const updateMapSize = () => {
      if (mapContainerRef.current) {
        setMapSize({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight
        });
      }
    };

    updateMapSize();
    window.addEventListener('resize', updateMapSize);
    return () => window.removeEventListener('resize', updateMapSize);
  }, []);

  // Удаление маркера выделения при выходе из editMode
  useEffect(() => {
    if (!editMode && selectionMarkerRef.current && map) {
      map.removeChild(selectionMarkerRef.current);
      selectionMarkerRef.current = null;
    }
  }, [editMode, map]);

  // Рендер маркеров - срабатывает при изменении videos или highlightedVideoId
  useEffect(() => {
    if (!map || !window.ymaps3) return;

    // Очищаем старые маркеры
    markersRef.current.forEach((marker) => {
      try {
        map.removeChild(marker);
      } catch (e) {}
    });
    markersRef.current = [];

    // Создаём новые маркеры
    const features = videosToFeatures(videos);
    features.forEach((feature) => {
      try {
        const marker = renderMarker(
          feature,
          navigate,
          editModeRef,
          userRef.current,
          highlightedVideoId
        );
        map.addChild(marker);
        markersRef.current.push(marker);
      } catch (e) {
        console.error('[Map] Error adding marker:', e);
      }
    });

    // Очистка при размонтировании или изменении зависимостей
    return () => {
      markersRef.current.forEach((marker) => {
        try {
          map.removeChild(marker);
        } catch (e) {}
      });
      markersRef.current = [];
    };
  }, [map, videos, highlightedVideoId, navigate]);

  // Debounced координаты для загрузки видео
  const debouncedMapCenter = useDebounce(mapCenter, DEBOUNCE_DELAY);

  // Загрузка видео при изменении координат
  useEffect(() => {
    if (!map) return;

    const lat = debouncedMapCenter[1];
    const lng = debouncedMapCenter[0];

    // Проверяем, не загружали ли уже видео для этих координат
    const lastFetch = lastFetchCoordsRef.current;
    if (
      lastFetch.lat != null &&
      lastFetch.lng != null &&
      Math.abs(lat - lastFetch.lat) < 0.001 &&
      Math.abs(lng - lastFetch.lng) < 0.001
    ) {
      return;
    }

    lastFetchCoordsRef.current = { lat, lng };

    const loadVideos = async () => {
      try {
        await fetchVideosRef.current(lat, lng);
      } catch (error) {
        console.error('Ошибка загрузки видео:', error);
      }
    };

    loadVideos();
  }, [map, debouncedMapCenter]);

  // Обновление видео после загрузки нового
  const refreshVideosRef = useRef(() => {});
  useEffect(() => {
    refreshVideosRef.current = () => {
      const lat = mapCenter[1];
      const lng = mapCenter[0];
      if (lat && lng) {
        fetchVideosRef.current(lat, lng);
      }
    };
  }, [mapCenter]);

  // Слушатель движения карты
  useEffect(() => {
    if (!map || !window.ymaps3) return;

    const { YMapListener } = window.ymaps3;
    let lastLocation = null;
    let moveTimer = null;

    const listener = new YMapListener({
      onUpdate: ({ location }) => {
        if (!location) return;

        const hasMoved = lastLocation && (
          location.center[0] !== lastLocation.center[0] ||
          location.center[1] !== lastLocation.center[1] ||
          location.zoom !== lastLocation.zoom
        );

        if (hasMoved) {
          setIsMapMoving(true);
          setMapCenter(location.center);
          setMapZoom(location.zoom);
        }

        lastLocation = location;

        if (moveTimer) clearTimeout(moveTimer);

        moveTimer = setTimeout(() => {
          setIsMapMoving(false);
        }, 150);
      }
    });

    map.addChild(listener);

    return () => {
      if (moveTimer) clearTimeout(moveTimer);
      try {
        map.removeChild(listener);
      } catch (e) {}
    };
  }, [map]);

  // Инициализация карты
  useEffect(() => {
    if (window.ymaps3 && !map) {
      // Получаем координаты из mapState
      const savedState = loadMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

      initMap({
        containerId: 'map',
        center: savedState.center,
        zoom: savedState.zoom,
        userRef,
        selectionMarkerRef,
        editModeRef,
        onUploadRef,
        onFetchVideosRef,
        navigate,
        highlightedVideoIdRef,
        refreshVideosRef
      }).then(({ map }) => {
        setMap(map);
        // Устанавливаем координаты из mapState для первого запроса видео
        setMapCenter(savedState.center);
        setMapZoom(savedState.zoom);
        mapInitializedRef.current = true;
      });
    }
  }, [map, navigate, onUploadRef, onFetchVideosRef]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (map) {
        markersRef.current.forEach((marker) => {
          try {
            map.removeChild(marker);
          } catch (e) {}
        });
        markersRef.current = [];

        if (selectionMarkerRef.current) {
          try {
            map.removeChild(selectionMarkerRef.current);
          } catch (e) {}
          selectionMarkerRef.current = null;
        }
      }
    };
  }, [map]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} style={{ position: 'relative' }}>
        <div id="map" className="map-container" />
      </div>
    </div>
  );
}

export default Map;
