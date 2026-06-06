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

const parseCoords = (coords) => {
  if (!coords) return null;
  
  let target = coords;
  if (!Array.isArray(coords) && typeof coords === 'object') {
    if (coords.coords !== undefined) target = coords.coords;
    else if (coords.coordinates !== undefined) target = coords.coordinates;
  }
  
  if (!target) return null;
  
  const arr = Array.isArray(target) ? target : [target.lng || target.longitude, target.lat || target.latitude];
  if (!arr || arr.length < 2) return null;
  
  const lng = parseFloat(arr[0]);
  const lat = parseFloat(arr[1]);
  
  if (isNaN(lng) || isNaN(lat)) return null;
  return [lng, lat];
}

function createYandexClusterElement(item, onClick) {
  const size = item.count < 10 ? 30 : item.count < 100 ? 40 : 50;
  const color = item.count < 10 ? '#7c3aed' : item.count < 100 ? 'rgba(240, 194, 12, 0.9)' : 'rgba(241, 128, 23, 0.9)';

  const el = document.createElement('div');
  el.className = 'custom-cluster-icon';
  el.style.backgroundColor = color;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = '50%';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.color = '#fff';
  el.style.fontWeight = 'bold';
  el.style.border = '2px solid rgba(255,255,255,0.7)';
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.3)';
  el.style.transform = 'translate(-50%, -50%)';

  const text = document.createElement('span');
  text.textContent = item.count;
  el.appendChild(text);

  el.onclick = onClick;
  return el;
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
  resetKey,
  routeId,
  ymapsReady,
  showMilestones = true,
  videoFilterMode = 'all',
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
  const [tooltipState, setTooltipState] = useState({ show: false, text: '', x: 0, y: 0 });
  const [mapBounds, setMapBounds] = useState(null);
  const debouncedBounds = useDebounce(mapBounds, 500);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    setActivePopupIndex(activePointIndex);
  }, [activePointIndex]);


  const navigate = useNavigate();
  const location = useLocation();

  const mapContainerRef = useRef(null);
  const lastCenteredRouteIdRef = useRef(null);
  const lastResetKeyRef = useRef(resetKey);
  const selectionMarkerRef = useRef(null);
  const markersRef = useRef([]);
  const fetchVideosRef = useRef(fetchVideos);
  const userRef = useRef(user);
  const highlightedVideoIdRef = useRef(null);
  const lastFetchCoordsRef = useRef({ lat: null, lng: null });
  const mapInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
  const refreshVideosRef = useRef(null);
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

  // ─── Debounced Bounds для кластеризации ───────────────────────────────
  useEffect(() => {
    if (!map || mode !== 'videos' || !showVideos || !debouncedBounds) return;

    let isMounted = true;
    const fetchClusters = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/videos/clusters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bounds: debouncedBounds.bounds, zoom: debouncedBounds.zoom + 1 })
        });
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (isMounted) setClusters(data);
      } catch (e) {
        console.error('Failed to fetch clusters', e);
      }
    };
    fetchClusters();
    return () => { isMounted = false; };
  }, [debouncedBounds, mode, showVideos, map]);


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

    // Создаем карту названий маршрутов для видео
    const routeTitles = {};
    const sourceRoutes = props.allRoutes || routes || [];
    sourceRoutes.forEach(r => {
      if (r.id) routeTitles[r.id] = r.title;
    });

    const currentData = (mode === 'videos' && videoFilterMode === 'all' && clusters.length > 0 && mapZoom < 17)
      ? clusters
      : videos;

    currentData.forEach((item) => {
      try {
        const lat = Number(item.lat || item.latitude);
        const lng = Number(item.lng || item.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        if (item.is_cluster) {
          const element = createYandexClusterElement(item, () => {
            const currentZoom = map.zoom || map.location?.zoom || mapZoom || 15;
            map.setLocation({
              center: [lng, lat],
              zoom: currentZoom + 2,
              duration: 300
            });
          });
          const marker = new window.ymaps3.YMapMarker(
            { 
              coordinates: [lng, lat],
              zIndex: 1000 
            },
            element
          );
          map.addChild(marker);
          markersRef.current.push(marker);
        } else {
          const videoData = {
            id: item.video_id || item.id,
            latitude: lat,
            longitude: lng,
            routeId: item.routeId || item.route_id,
            poster_url: item.poster_url,
            users: {
              login: item.user_login || item.users?.login,
              avatar: item.user_avatar || item.users?.avatar
            }
          };

          const feature = {
            geometry: { coordinates: [lng, lat] },
            properties: { video: videoData }
          };

          const marker = renderMarker(
            feature,
            navigate,
            userRef.current,
            highlightedVideoId,
            hoveredRouteId
          );
          marker.videoData = videoData;

          const element = marker.element || marker._element;
          if (element) {
            const vRouteId = videoData.routeId;
            element.onmouseenter = () => {
              if (vRouteId) onRouteHover?.(vRouteId);
            };
            element.onmouseleave = () => {
              if (vRouteId) onRouteHover?.(null);
            };

            if (vRouteId && routeTitles[vRouteId]) {
              element.title = routeTitles[vRouteId];
            }
          }

          map.addChild(marker);
          markersRef.current.push(marker);
        }
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
  }, [map, videos, highlightedVideoId, navigate, mode, showVideos, props.allRoutes, clusters, videoFilterMode, mapZoom]);

  // Рендер точек и линии маршрута
  useEffect(() => {
    if (!map || !window.ymaps3 || (mode !== 'route-editor' && mode !== 'route-viewer' && mode !== 'point-selector' && mode !== 'videos')) return;

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
        const coords = parseCoords(pointData);
        if (!coords) return;
        const isStart = pointData.type === 'start' || index === 0;

        const transportType = pointData.transport || 'walking';
        const transportColor = getTransportOption(transportType).color;
        const stopTypeLabel = pointData.stop_type ? (STOP_TYPE_MAP[pointData.stop_type]?.label || '') : '';

        const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);
        const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
        const stopType = pointData.stop_type;
        const isMilestone = isStart || (stopType && stopType !== 'none');

        if (isMilestone && showMilestones) {
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
        }

        // Рисуем линию от предыдущей точки к текущей
        if (index > 0) {
          const prevCoords = parseCoords(points[index - 1]);
          if (!prevCoords) return;
          const color = getTransportOption(transportType).color;
          const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);
          const polylineOpacity = (!hoveredRouteId || isCurrentHovered) ? 0.85 : 0.2;
          const polylineWeight = isCurrentHovered ? 6 : 4;

          const newPolyline = new YMapFeature({
            id: `route-${route.id || routeIdx}-segment-${index}`,
            geometry: {
              type: 'LineString',
              coordinates: [prevCoords, coords]
            },
            style: {
              stroke: [{ color: color, width: polylineWeight, opacity: polylineOpacity }]
            },
            cursor: 'pointer'
          });
          newPolyline.routeId = route.id;
          newPolyline.originalColor = color;
          newPolyline.routeTitle = route.title;

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

    // Рисуем попап отдельно после всех маркеров, чтобы он был сверху (только в редакторе)
    if (mode === 'route-editor' && activePopupIndex !== null) {
      const points = routesToRender[0]?.path_data || [];
      const pointData = points[activePopupIndex];
      if (pointData) {
        const coords = parseCoords(pointData);
        if (coords) {
          const { YMapMarker } = window.ymaps3;

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
  }, [map, routes, props.routePoints, mode, activePopupIndex, showPath, showMilestones, onRouteHover, onRouteClick]);

  // ─── Центрирование карты (fitBounds) ──────────────────────────────────
  useEffect(() => {
    if (!map || !window.ymaps3 || (mode !== 'route-viewer' && mode !== 'point-selector')) return;

    // Центрируем только если изменился маршрут или был нажат сброс
    const routeChanged = routeId !== lastCenteredRouteIdRef.current;
    const resetPressed = resetKey !== lastResetKeyRef.current;

    if (!routeChanged && !resetPressed) return;

    const routesToRender = routes.length > 0 ? routes : (props.routePoints ? [{ path_data: props.routePoints }] : []);
    if (routesToRender.length === 0) return;

    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    routesToRender.forEach(r => {
      const points = r.path_data || [];
      points.forEach(p => {
        const coords = parseCoords(p);
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
      lastCenteredRouteIdRef.current = routeId;
      lastResetKeyRef.current = resetKey;
    }
  }, [map, routes, resetKey, mode, routeId, props.routePoints]);

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
            stroke: [{ color: polyline.originalColor || '#6366f1', width: weight, opacity: opacity }]
          }
        });
      }
    });
  }, [hoveredRouteId, map, routes, showMilestones, videos, showVideos]);

  // Рендер выбранной точки (point-selector)
  useEffect(() => {
    if (!map || !window.ymaps3 || mode !== 'point-selector') return;

    const { YMapMarker } = window.ymaps3;

    if (selectedPointMarkerRef.current) {
      try { map.removeChild(selectedPointMarkerRef.current); } catch (e) { }
      selectedPointMarkerRef.current = null;
    }

    const parsedSelectedPoint = parseCoords(selectedPoint);
    if (parsedSelectedPoint) {
      const el = document.createElement('div');
      el.className = 'selected-point-marker';
      el.innerHTML = '<div style="width:20px;height:20px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.4);transform:translate(-50%,-50%);cursor:pointer;"></div>';

      const marker = new YMapMarker({
        coordinates: parsedSelectedPoint,
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

        if (location.bounds) {
          const b = location.bounds;
          setMapBounds({
            bounds: {
              _southWest: { lat: b[0][1], lng: b[0][0] },
              _northEast: { lat: b[1][1], lng: b[1][0] }
            },
            zoom: location.zoom
          });
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

  useEffect(() => {
    // Ждем когда ymapsReady станет true И появится объект в window
    if (ymapsReady && window.ymaps3 && !map && mapContainerRef.current && !isInitializingRef.current) {
      isInitializingRef.current = true;

      // Небольшая задержка, чтобы React успел отрисовать контейнер
      setTimeout(() => {
        if (!mapContainerRef.current) {
          isInitializingRef.current = false;
          return;
        }

        const savedState = loadMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);

        initMap({
          container: mapContainerRef.current,
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
        }).then((result) => {
          if (result && result.map) {
            setMap(result.map);
            setMapCenter(savedState.center);
            setMapZoom(savedState.zoom);
            mapInitializedRef.current = true;
            if (result.map.location && result.map.location.bounds) {
              const b = result.map.location.bounds;
              setMapBounds({
                bounds: {
                  _southWest: { lat: b[0][1], lng: b[0][0] },
                  _northEast: { lat: b[1][1], lng: b[1][0] }
                },
                zoom: result.map.location.zoom
              });
            }
          } else {
            isInitializingRef.current = false;
          }
        }).catch(err => {
          isInitializingRef.current = false;
        });
      }, 100);
    }
  }, [map, mode, navigate, ymapsReady]);

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
 
  // Регистрация общего слушателя событий на карте для маршрутов (наведение, клик, тултипы)
  useEffect(() => {
    if (!map || !window.ymaps3) return;

    const { YMapListener, YMapFeature } = window.ymaps3;

    const featureListener = new YMapListener({
      layer: 'any',
      onClick: (object) => {
        const entity = object?.entity;
        if (entity && entity instanceof YMapFeature) {
          const routeId = entity.routeId;
          if (routeId) {
            onRouteClick?.(routeId);
          }
        }
      },
      onMouseEnter: (object, event) => {
        const entity = object?.entity;
        if (entity && entity instanceof YMapFeature) {
          const routeId = entity.routeId;
          if (routeId) {
            onRouteHover?.(routeId);
            if (mapContainerRef.current) {
              mapContainerRef.current.style.cursor = 'pointer';
            }
            if (entity.routeTitle && mapContainerRef.current) {
              if (mode === 'videos') {
                mapContainerRef.current.title = entity.routeTitle;
              } else {
                let x = 0, y = 0;
                if (event?.domEvent) {
                  const rect = mapContainerRef.current.getBoundingClientRect();
                  x = event.domEvent.clientX - rect.left;
                  y = event.domEvent.clientY - rect.top;
                } else if (event?.position) {
                  x = event.position[0];
                  y = event.position[1];
                }
                setTooltipState({
                  show: true,
                  text: entity.routeTitle,
                  x: x,
                  y: y
                });
              }
            }
          }
        }
      },
      onMouseMove: (object, event) => {
        const entity = object?.entity;
        if (entity && entity instanceof YMapFeature) {
          if (mode !== 'videos' && entity.routeTitle && mapContainerRef.current) {
            let x = 0, y = 0;
            if (event?.domEvent) {
              const rect = mapContainerRef.current.getBoundingClientRect();
              x = event.domEvent.clientX - rect.left;
              y = event.domEvent.clientY - rect.top;
            } else if (event?.position) {
              x = event.position[0];
              y = event.position[1];
            }
            setTooltipState(prev => ({
              ...prev,
              x: x,
              y: y
            }));
          }
        }
      },
      onMouseLeave: (object) => {
        const entity = object?.entity;
        if (entity && entity instanceof YMapFeature) {
          onRouteHover?.(null);
          if (mapContainerRef.current) {
            mapContainerRef.current.style.cursor = '';
            mapContainerRef.current.title = '';
          }
          setTooltipState({ show: false, text: '', x: 0, y: 0 });
        }
      }
    });

    map.addChild(featureListener);

    return () => {
      try {
        map.removeChild(featureListener);
      } catch (e) { }
    };
  }, [map, onRouteHover, onRouteClick]);

  return (
    <div className="map-wrapper" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%', margin: 0, boxShadow: 'none', borderRadius: 0 }}>
      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div
          ref={mapContainerRef}
          className="map-container"
          style={{ height: '100%', width: '100%' }}
        />
        {tooltipState.show && (
          <div
            style={{
              position: 'absolute',
              left: `${tooltipState.x + 15}px`,
              top: `${tooltipState.y + 15}px`,
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              pointerEvents: 'none',
              zIndex: 99999,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              whiteSpace: 'nowrap',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
          >
            {tooltipState.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default YandexMap;