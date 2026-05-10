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
  fetchVideos = () => { },
  onUploadRef = { current: null },
  onFetchVideosRef = { current: null },
  mode = 'videos',
  disableFetchOnMove = false,
  showPath = true,
  showVideos = true,
  routes = [],
  onMapClick,
  onPointDragEnd,
  onPointClick,
  onPointChange,
  activePointIndex,
  selectedPoint,
  hoveredRouteId,
  onRouteHover,
  onRouteClick,
  ...props
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
        try { map.removeChild(marker); } catch (e) { }
      });
      markersRef.current = [];
      return;
    }

    // Очищаем старые маркеры
    markersRef.current.forEach((marker) => {
      try {
        map.removeChild(marker);
      } catch (e) { }
    });
    markersRef.current = [];

    // Создаём новые маркеры
    const features = videosToFeatures(videos);
    // Создаем карту названий маршрутов для видео
    const routeTitles = {};
    (props.allRoutes || []).forEach(r => {
      if (r.id) routeTitles[r.id] = r.title;
    });

    features.forEach((feature) => {
      try {
        const video = feature.properties.video;
        const marker = renderMarker(
          feature,
          navigate,
          userRef.current,
          highlightedVideoId,
          hoveredRouteId
        );
        marker.videoData = video; // Сохраняем для оптимизации
        
        // Добавляем слушатели наведения на элемент маркера
        const element = marker.element || marker._element; // В YMaps 3.0 элемент может быть в разных свойствах в зависимости от версии
        if (element) {
          const vRouteId = video.routeId || video.route_id;
          element.onmouseenter = () => {
            if (vRouteId) onRouteHover?.(vRouteId);
          };
          element.onmouseleave = () => {
            if (vRouteId) onRouteHover?.(null);
          };

          // Подсказка (простейшая реализация через title)
          if (vRouteId && routeTitles[vRouteId]) {
            element.title = routeTitles[vRouteId];
          }
        }

        map.addChild(marker);
        markersRef.current.push(marker);
      } catch (e) {
        console.error('[Map] Error adding marker:', e);
      }
    });

    // Очистка при размонтировании или изменении зависимостей
    return () => {
      markersRef.current.forEach((marker) => {
        try { map.removeChild(marker); } catch (e) { }
      });
      markersRef.current = [];
    };
  }, [map, videos, highlightedVideoId, navigate, mode, showVideos, props.allRoutes]);

  // Рендер точек и линии маршрута
  useEffect(() => {
    if (!map || !window.ymaps3 || (mode !== 'route-editor' && mode !== 'route-viewer' && mode !== 'videos')) return;

    if (!showPath) {
      const { polylines, markers } = routeFeaturesRef.current;
      polylines.forEach(p => { try { map.removeChild(p); } catch (e) { } });
      markers.forEach(m => { try { map.removeChild(m); } catch (e) { } });
      routeFeaturesRef.current = { polylines: [], markers: [] };
      return;
    }

    const { YMapFeature, YMapMarker } = window.ymaps3;
    const { polylines, markers } = routeFeaturesRef.current;

    polylines.forEach(p => {
      try { map.removeChild(p); } catch (e) { }
    });
    routeFeaturesRef.current.polylines = [];

    markers.forEach(m => {
      try { map.removeChild(m); } catch (e) { }
    });
    routeFeaturesRef.current.markers = [];

    // Если передан список маршрутов, отрисовываем их все
    const routesToRender = routes.length > 0 ? routes : (props.routePoints ? [{ path_data: props.routePoints }] : []);

    if (routesToRender.length === 0) return;

    routesToRender.forEach((route, routeIdx) => {
      const points = route.path_data || [];
      if (!points || points.length === 0) return;

      points.forEach((pointData, index) => {
        const coords = Array.isArray(pointData) ? pointData : pointData.coords;
        const isStart = pointData.type === 'start' || index === 0;

        const transportType = pointData.transport || 'walking';
        const transportColor = getTransportOption(transportType).color;
        const stopTypeLabel = pointData.stop_type ? (STOP_TYPE_MAP[pointData.stop_type]?.label || '') : '';

        const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);
        const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
        const el = createRoutePointMarkerElement(pointData, isStart, transportColor, stopTypeLabel, opacity);

        el.onmouseenter = () => onRouteHover?.(route.id);
        el.onmouseleave = () => onRouteHover?.(null);
        if (route.title) {
          el.title = route.title;
        }

        if (mode === 'route-editor') {
          el.onclick = (e) => {
            e.stopPropagation();
            if (index === 0) return; // Не открываем попап для старта
            setActivePopupIndex(index);
            if (onPointClickRef.current) {
              onPointClickRef.current(index);
            }
          };
        } else if (mode === 'videos' || mode === 'route-viewer' || mode === 'point-selector') {
          el.onclick = (e) => {
            if (mode === 'point-selector') {
              onMapClick?.(coords);
              return;
            }
            e.stopPropagation();
            if (route.id) onRouteClick?.(route.id);
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
        marker.routeId = route.id; // Сохраняем для оптимизации
        map.addChild(marker);
        routeFeaturesRef.current.markers.push(marker);

        // Рисуем линию от предыдущей точки к текущей
        if (index > 0) {
          const prevCoords = Array.isArray(points[index - 1]) ? points[index - 1] : points[index - 1].coords;
          const color = getTransportOption(transportType).color;
          const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);
          const polylineOpacity = (!hoveredRouteId || isCurrentHovered) ? 0.85 : 0.2;
          const polylineWeight = isCurrentHovered ? 6 : 4;

          const newPolyline = new YMapFeature({
            id: `route-${routeIdx}-segment-${index}`,
            geometry: {
              type: 'LineString',
              coordinates: [prevCoords, coords]
            },
            style: {
              stroke: [{ color: color, width: polylineWeight, opacity: polylineOpacity }]
            }
          });
          newPolyline.routeId = route.id;

          // В YMaps 3.0 события можно ловить через YMapListener, 
          // но для простоты добавим свойства, которые проверим в листенере
          newPolyline.onmouseenter = () => onRouteHover?.(route.id);
          newPolyline.onmouseleave = () => onRouteHover?.(null);
          
          newPolyline.onclick = (event) => {
            if (mode === 'point-selector') {
              // Пытаемся достать координаты из события
              const coords = event?.coordinates || event?.position;
              if (coords) onMapClick?.(coords);
              return;
            }
            if (event && event.stopPropagation) event.stopPropagation();
            if (route.id) onRouteClick?.(route.id);
          };

          map.addChild(newPolyline);
          routeFeaturesRef.current.polylines.push(newPolyline);
        }
      });
    });

    if ((mode === 'route-viewer' || mode === 'point-selector') && routesToRender.length > 0) {
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      routesToRender.forEach(r => {
        const points = r.path_data || [];
        points.forEach(p => {
          const coords = Array.isArray(p) ? p : p.coords;
          if (!coords) return;
          const [lon, lat] = coords;
          if (lon < minLon) minLon = lon;
          if (lat < minLat) minLat = lat;
          if (lon > maxLon) maxLon = lon;
          if (lat > maxLat) maxLat = lat;
        });
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

    // Рисуем попап отдельно после всех маркеров, чтобы он был сверху (только в редакторе)
    if (mode === 'route-editor' && activePopupIndex !== null) {
      const points = routesToRender[0]?.path_data || [];
      const pointData = points[activePopupIndex];
      if (pointData) {
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
    }

    return () => {

      const { polylines: p, markers: m } = routeFeaturesRef.current;
      p.forEach(line => {
        try { map.removeChild(line); } catch (e) { }
      });
      m.forEach(marker => {
        try { map.removeChild(marker); } catch (e) { }
      });
    };
  }, [map, routes, props.routePoints, mode, activePopupIndex, showPath, onRouteHover, onRouteClick]);

  // Эффект для плавного обновления прозрачности при наведении
  useEffect(() => {
    if (!map || !window.ymaps3) return;

    // Обновляем видео-маркеры
    markersRef.current.forEach(marker => {
      const video = marker.videoData;
      if (!video) return;
      const vRouteId = video.routeId || video.route_id;
      const isCurrentHovered = hoveredRouteId && vRouteId && String(vRouteId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
      
      const element = marker.element || marker._element;
      if (element) {
        element.style.opacity = opacity.toString();
      }
    });

    // Обновляем маркеры и линии маршрута
    const { polylines, markers } = routeFeaturesRef.current;
    
    markers.forEach(marker => {
      const rId = marker.routeId;
      if (!rId) return;
      const isCurrentHovered = hoveredRouteId && String(rId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
      
      const element = marker.element || marker._element;
      if (element) {
        element.style.opacity = opacity.toString();
      }
    });

    polylines.forEach(polyline => {
      const rId = polyline.routeId;
      if (!rId) return;
      const isCurrentHovered = hoveredRouteId && String(rId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 0.85 : 0.2;
      const weight = isCurrentHovered ? 6 : 4;
      
      // В YMaps 3.0 обновляем через свойство style
      if (polyline.update) {
        polyline.update({
          style: {
            stroke: [{ color: polyline.style?.stroke?.[0]?.color, width: weight, opacity: opacity }]
          }
        });
      }
    });
  }, [hoveredRouteId, map]);

  // Рендер выбранной точки (point-selector)
  useEffect(() => {
    if (!map || !window.ymaps3 || mode !== 'point-selector') return;

    const { YMapMarker } = window.ymaps3;

    if (selectedPointMarkerRef.current) {
      try { map.removeChild(selectedPointMarkerRef.current); } catch (e) { }
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
        try { map.removeChild(selectedPointMarkerRef.current); } catch (e) { }
        selectedPointMarkerRef.current = null;
      }
    };
  }, [map, selectedPoint, mode]);


  // Debounced координаты для загрузки видео
  const debouncedMapCenter = useDebounce(mapCenter, DEBOUNCE_DELAY);

  // Реакция на изменение hoveredRouteId встроена в основные эффекты

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
  const refreshVideosRef = useRef(() => { });
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
      },
      onAction: (event) => {
        if (event.type === 'click' && event.entity?.onclick) {
          event.entity.onclick(event);
        }
      },
      onPointerEnter: (event) => {
        if (event?.entity?.onmouseenter) {
          event.entity.onmouseenter();
        }
      },
      onPointerLeave: (event) => {
        if (event?.entity?.onmouseleave) {
          event.entity.onmouseleave();
        }
      }
    });


    map.addChild(listener);

    return () => {
      if (moveTimer) clearTimeout(moveTimer);
      try {
        map.removeChild(listener);
      } catch (e) { }
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
          } catch (e) { }
        });
        markersRef.current = [];

        if (selectionMarkerRef.current) {
          try {
            map.removeChild(selectionMarkerRef.current);
          } catch (e) { }
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
