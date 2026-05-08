import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../utils/constants';
import { initMap } from '../utils/mapInit';
import { loadMapState } from '../utils/mapState';
import { videosToFeatures } from '../utils/map/features';
import { renderMarker, createRoutePointMarkerElement } from '../utils/map/markers';
import { createStopTypePopupElement } from '../utils/map/stopTypePopup';
import { getTransportOption, STOP_TYPE_MAP } from '../utils/routeConstants';


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

export function YandexMap({ 
  user, 
  videos = [], 
  fetchVideos = () => {}, 
  onUploadRef = { current: null }, 
  onFetchVideosRef = { current: null },
  mode = 'videos', // 'videos' | 'route-editor' | 'route-viewer'
  routePoints = [],
  onMapClick = null,
  onPointDragEnd = null,
  onPointClick = null,
  onPointChange = null,
  activePointIndex = null,
  selectedPoint = null,
  disableFetchOnMove = false,
  showPath = true,
  showVideos = true
}) {
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
  const [activePopupIndex, setActivePopupIndex] = useState(null);
  
  useEffect(() => {
    setActivePopupIndex(activePointIndex);
  }, [activePointIndex]);


  const navigate = useNavigate();
  const location = useLocation();

  const mapContainerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const fetchVideosRef = useRef(fetchVideos);
  const userRef = useRef(user);
  const highlightedVideoIdRef = useRef(null);
  const lastFetchCoordsRef = useRef({ lat: null, lng: null });
  const mapInitializedRef = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onPointDragEndRef = useRef(onPointDragEnd);
  const onPointClickRef = useRef(onPointClick);
  const onPointChangeRef = useRef(onPointChange);
  const routeFeaturesRef = useRef({ polylines: [], markers: [] });
  const selectedPointMarkerRef = useRef(null);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { fetchVideosRef.current = fetchVideos; }, [fetchVideos]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onPointDragEndRef.current = onPointDragEnd; }, [onPointDragEnd]);
  useEffect(() => { onPointClickRef.current = onPointClick; }, [onPointClick]);
  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);


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


  // Рендер маркеров - срабатывает при изменении videos или highlightedVideoId
  useEffect(() => {
    if (!map || !window.ymaps3 || mode === 'route-editor' || !showVideos) {
      // Очищаем старые маркеры
      markersRef.current.forEach((marker) => {
        try { map.removeChild(marker); } catch (e) {}
      });
      markersRef.current = [];
      return;
    }

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
        try { map.removeChild(marker); } catch (e) {}
      });
      markersRef.current = [];
    };
  }, [map, videos, highlightedVideoId, navigate, mode, showVideos]);

  // Рендер точек и линии маршрута
  useEffect(() => {
    if (!map || !window.ymaps3 || (mode !== 'route-editor' && mode !== 'route-viewer')) return;

    if (!showPath) {
      const { polylines, markers } = routeFeaturesRef.current;
      polylines.forEach(p => { try { map.removeChild(p); } catch (e) {} });
      markers.forEach(m => { try { map.removeChild(m); } catch (e) {} });
      routeFeaturesRef.current = { polylines: [], markers: [] };
      return;
    }

    const { YMapFeature, YMapMarker } = window.ymaps3;
    const { polylines, markers } = routeFeaturesRef.current;

    polylines.forEach(p => {
      try { map.removeChild(p); } catch (e) {}
    });
    routeFeaturesRef.current.polylines = [];
    
    markers.forEach(m => {
      try { map.removeChild(m); } catch (e) {}
    });
    routeFeaturesRef.current.markers = [];

    if (!routePoints || routePoints.length === 0) return;

    routePoints.forEach((pointData, index) => {
      const coords = Array.isArray(pointData) ? pointData : pointData.coords;
      const isStart = pointData.type === 'start' || index === 0;

      const transportType = pointData.transport || 'walking';
      const transportColor = getTransportOption(transportType).color;
      const stopTypeLabel = pointData.stop_type ? (STOP_TYPE_MAP[pointData.stop_type]?.label || '') : '';

      const el = createRoutePointMarkerElement(pointData, isStart, transportColor, stopTypeLabel);
      
      if (mode === 'route-editor') {
        el.onclick = (e) => {
          e.stopPropagation();
          if (index === 0) return; // Не открываем попап для старта
          setActivePopupIndex(index);
          if (onPointClickRef.current) {
            onPointClickRef.current(index);
          }
        };
      }


      const markerOptions = {
        coordinates: coords,
        draggable: mode === 'route-editor' && !!onPointDragEndRef.current,
        onDragEnd: (coordinates) => {
          if (onPointDragEndRef.current) {
            onPointDragEndRef.current(index, coordinates);
          }
        }
      };

      const marker = new YMapMarker(markerOptions, el);
      map.addChild(marker);
      routeFeaturesRef.current.markers.push(marker);

      // Рисуем линию от предыдущей точки к текущей
      if (index > 0) {
        const prevCoords = Array.isArray(routePoints[index - 1]) ? routePoints[index - 1] : routePoints[index - 1].coords;
        const color = getTransportOption(transportType).color;

        const newPolyline = new YMapFeature({
          id: `route-segment-${index}`,
          geometry: {
            type: 'LineString',
            coordinates: [prevCoords, coords]
          },
          style: {
            stroke: [{ color: color, width: 4 }]
          }
        });
        map.addChild(newPolyline);
        routeFeaturesRef.current.polylines.push(newPolyline);
      }
    });

    if ((mode === 'route-viewer' || mode === 'point-selector') && routePoints.length > 0) {
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      routePoints.forEach(p => {
        const coords = Array.isArray(p) ? p : p.coords;
        if (!coords) return;
        const [lon, lat] = coords;
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      });
      if (minLon !== Infinity) {
        const padding = 0.05;
        map.update({
          location: {
            bounds: [
              [minLon - padding, minLat - padding],
              [maxLon + padding, maxLat + padding]
            ]
          },
          duration: 800
        });
      }
    }

    // Рисуем попап отдельно после всех маркеров, чтобы он был сверху
    if (activePopupIndex !== null && routePoints[activePopupIndex]) {
      const pointData = routePoints[activePopupIndex];
      const coords = Array.isArray(pointData) ? pointData : pointData.coords;

      const popupEl = createStopTypePopupElement({
        currentType: pointData.stop_type,
        onSelect: (newType) => {
          if (onPointChangeRef.current) {
            onPointChangeRef.current(activePopupIndex, 'stop_type', newType);
          }
          setActivePopupIndex(null);
          if (onPointClickRef.current) onPointClickRef.current(null);
        },
        onCancel: () => {
          setActivePopupIndex(null);
          if (onPointClickRef.current) onPointClickRef.current(null);
        }
      });
      
      const popupMarker = new YMapMarker({ coordinates: coords }, popupEl);
      map.addChild(popupMarker);
      routeFeaturesRef.current.markers.push(popupMarker);
    }

    return () => {

      const { polylines: p, markers: m } = routeFeaturesRef.current;
      p.forEach(line => {
        try { map.removeChild(line); } catch (e) {}
      });
      m.forEach(marker => {
        try { map.removeChild(marker); } catch (e) {}
      });
    };
  }, [map, routePoints, mode, activePopupIndex, showPath]);
  
  // Рендер выбранной точки (point-selector)
  useEffect(() => {
    if (!map || !window.ymaps3 || mode !== 'point-selector') return;

    const { YMapMarker } = window.ymaps3;

    if (selectedPointMarkerRef.current) {
      try { map.removeChild(selectedPointMarkerRef.current); } catch (e) {}
      selectedPointMarkerRef.current = null;
    }

    if (selectedPoint) {
      const el = document.createElement('div');
      el.className = 'selected-point-marker';
      el.innerHTML = '<div style="width:20px;height:20px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.4);transform:translate(-50%,-50%);cursor:pointer;"></div>';

      const marker = new YMapMarker({
        coordinates: selectedPoint,
        draggable: true,
        zIndex: 1000,
        onDragEnd: (coordinates) => {
          if (onMapClickRef.current) {
            onMapClickRef.current(coordinates);
          }
        }
      }, el);

      map.addChild(marker);
      selectedPointMarkerRef.current = marker;
    }

    return () => {
      if (selectedPointMarkerRef.current) {
        try { map.removeChild(selectedPointMarkerRef.current); } catch (e) {}
        selectedPointMarkerRef.current = null;
      }
    };
  }, [map, selectedPoint, mode]);


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
        if (mode === 'videos' && !disableFetchOnMove) {
          await fetchVideosRef.current(lat, lng);
        }
      } catch (error) {
        console.error('Ошибка загрузки видео:', error);
      }
    };

    loadVideos();
  }, [map, debouncedMapCenter, mode]);

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
      },
      onClick: () => {
        setActivePopupIndex(null);
        if (onPointClickRef.current) onPointClickRef.current(null);
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
        onUploadRef,
        onFetchVideosRef,
        navigate,
        highlightedVideoIdRef,
        refreshVideosRef,
        mode,
        onMapClickRef
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
    <div className="map-wrapper" style={{ height: '100%', width: '100%' }}>
      <div ref={mapContainerRef} style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div id="map" className="map-container" style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}

export default YandexMap;
