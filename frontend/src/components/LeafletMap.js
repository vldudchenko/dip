import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../utils/constants';
import { videosToFeatures } from '../utils/map/features';
import { getTransportOption, STOP_TYPE_MAP } from '../utils/routeConstants';
import { getBoundsFromCoords, saveOsmMapState, loadOsmMapState, toLeafletLatLng, toLeafletPolyline, fromLeafletLatLng } from '../utils/map/leaflet/helpers';
import { createVideoIcon, createRoutePointIcon } from '../utils/map/leaflet/markers';
import { createStopTypePopupElement } from '../utils/map/stopTypePopup';

// Исправление дефолтных иконок Leaflet в CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DEBOUNCE_DELAY = 500;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const getTransportIcon = (type) => getTransportOption(type).icon;

export function LeafletMap({
  videos = [],
  mode = 'videos', // videos, route-editor, route-viewer, point-selector
  onMapClick,
  onPointDragEnd,
  onPointClick,
  onPointChange,
  activePointIndex,
  selectedPoint,
  disableFetchOnMove = false,
  showPath = true,
  showVideos = true,
  routes = [],
  onRouteHover,
  onRouteClick,
  resetKey,
  routeId,
  hoveredRouteId,
  showMilestones = true,
  videoFilterMode = 'all',
  ...props
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const lastCenteredRouteIdRef = useRef(null);
  const lastResetKeyRef = useRef(resetKey);
  const [map, setMap] = useState(null);
  const storedUserId = localStorage.getItem('user_id');
  const safeUserId = storedUserId && storedUserId !== 'undefined' ? storedUserId : null;
  const userRef = useRef({ id: safeUserId });

  const videoMarkersRef = useRef([]);
  const videoClusterGroupRef = useRef(null);
  const routeLayersRef = useRef({ polylines: [], markers: [] });
  const selectionMarkerRef = useRef(null);
  const selectedPointMarkerRef = useRef(null);
  const popupMarkerRef = useRef(null);
  const highlightedVideoIdRef = useRef(null);
  const currentPopupElementRef = useRef(null);

  // Refs for callbacks to avoid effect dependencies
  const onPointChangeRef = useRef(onPointChange);
  const onPointDragEndRef = useRef(onPointDragEnd);
  const onPointClickRef = useRef(onPointClick);
  const fetchVideosRef = useRef(props.fetchVideos);
  const lastFetchCoordsRef = useRef({ lat: null, lng: null });
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useEffect(() => { onPointChangeRef.current = onPointChange; }, [onPointChange]);
  useEffect(() => { onPointDragEndRef.current = onPointDragEnd; }, [onPointDragEnd]);
  useEffect(() => { onPointClickRef.current = onPointClick; }, [onPointClick]);
  useEffect(() => { fetchVideosRef.current = props.fetchVideos; }, [props.fetchVideos]);

  const [mapCenter, setMapCenter] = useState(MAP_DEFAULT_CENTER);
  const [highlightedVideoId, setHighlightedVideoId] = useState(null);

  // ─── Инициализация карты ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const savedState = loadOsmMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    const mapInstance = L.map(mapContainerRef.current, {
      center: [savedState.center[1], savedState.center[0]],
      zoom: savedState.zoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);

    // Зум-контролы скрыты по просьбе пользователя

    mapInstance.on('moveend', () => {
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      const newCoords = [center.lng, center.lat];
      setMapCenter(newCoords);
      saveOsmMapState(newCoords, zoom);
    });

    mapRef.current = mapInstance;
    setMap(mapInstance);

    mapInstance.on('click', (e) => {
      if (mode === 'route-editor' || mode === 'point-selector') {
        // Передаем координаты в формате [lng, lat]
        onMapClickRef.current?.([e.latlng.lng, e.latlng.lat]);
      }
    });

    return () => {
      mapInstance.remove();
      setMap(null);
      mapRef.current = null;
    };
  }, []);

  // Реакция на изменение hoveredRouteId теперь встроена в основные эффекты отрисовки

  // ─── Переход со страницы видео (state с координатами) ─────────────────
  useEffect(() => {
    if (!map) return;
    const state = location.state;
    if (state?.center && state?.highlightedVideoId) {
      const [lng, lat] = state.center;
      map.setView([lat, lng], state.zoom || 17);
      setHighlightedVideoId(state.highlightedVideoId);
      highlightedVideoIdRef.current = state.highlightedVideoId;
      setTimeout(() => {
        setHighlightedVideoId(null);
        highlightedVideoIdRef.current = null;
      }, 10000);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);


  // ─── Debounced Bounds для кластеризации ───────────────────────────────
  const [mapBounds, setMapBounds] = useState(null);
  const debouncedBounds = useDebounce(mapBounds, 500);
  const [clusters, setClusters] = useState([]);

  useEffect(() => {
    if (!map) return;
    const updateBounds = () => {
      setMapBounds({
        bounds: map.getBounds(),
        zoom: map.getZoom()
      });
    };
    // Initial fetch
    updateBounds();
    map.on('moveend', updateBounds);
    return () => map.off('moveend', updateBounds);
  }, [map]);

  useEffect(() => {
    if (!map || mode !== 'videos' || !showVideos || !debouncedBounds) return;

    let isMounted = true;
    const fetchClusters = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/videos/clusters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Передаем zoom + 1, чтобы кластеризация была менее агрессивной (мельче сетка)
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

  // ─── Маркеры видео и кластеров ─────────────────────────────────────────
  useEffect(() => {
    if (!map || mode === 'route-editor' || !showVideos) {
      if (videoClusterGroupRef.current) {
        videoClusterGroupRef.current.forEach(m => m.remove());
        videoClusterGroupRef.current = [];
      }
      return;
    }

    if (videoClusterGroupRef.current) {
      videoClusterGroupRef.current.forEach(m => m.remove());
    }
    videoClusterGroupRef.current = [];
    videoMarkersRef.current = [];

    // На высоких уровнях зума (>= 17) отключаем кластеризацию для детального просмотра
    // Кластеризация используется только в режиме "Все видео" и на зуме < 17.
    // В режиме "По маршрутам" используем сырые отфильтрованные данные (videos),
    // так как серверный RPC кластеризации пока не поддерживает фильтрацию по ID маршрутов.
    const currentData = (mode === 'videos' && videoFilterMode === 'all' && clusters.length > 0 && map.getZoom() < 17)
      ? clusters
      : videos;

    // Создаем карту названий маршрутов для видео
    const routeTitles = {};
    const sourceRoutes = props.allRoutes || routes || [];
    sourceRoutes.forEach(r => {
      if (r.id) routeTitles[r.id] = r.title;
    });

    currentData.forEach((item) => {
      try {
        const lat = Number(item.lat || item.latitude);
        const lng = Number(item.lng || item.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        let marker;

        if (item.is_cluster) {
          // Рисуем кластер
          const size = item.count < 10 ? 30 : item.count < 100 ? 40 : 50;
          const color = item.count < 10 ? '#7c3aed' : item.count < 100 ? 'rgba(240, 194, 12, 0.6)' : 'rgba(241, 128, 23, 0.6)';

          const icon = L.divIcon({
            html: `
              <div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; border: 2px solid rgba(255,255,255,0.5);">
                <span>${item.count}</span>
              </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: L.point(size, size, true)
          });

          marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
          marker.on('click', () => {
            map.setView([lat, lng], map.getZoom() + 2);
          });
        } else {
          // Обычный видео-маркер
          // Адаптируем данные сервера для createVideoIcon
          const videoData = {
            id: item.video_id || item.id,
            latitude: lat,
            longitude: lng,
            routeId: item.route_id,
            poster_url: item.poster_url,
            users: {
              login: item.user_login || item.users?.login,
              avatar: item.user_avatar || item.users?.avatar
            }
          };

          const isHighlighted = highlightedVideoId && videoData.id === highlightedVideoId;
          const icon = createVideoIcon(videoData, isHighlighted);

          marker = L.marker([lat, lng], {
            icon,
            opacity: 1,
            zIndexOffset: 1000,
            videoData
          });

          // Добавляем подсказку с названием маршрута
          const vRouteId = videoData.routeId;
          if (vRouteId && routeTitles[vRouteId]) {
            marker.bindTooltip(routeTitles[vRouteId], { sticky: true, className: 'route-tooltip' });
          }

          // Добавляем подсветку пути при наведении на видео-маркер
          marker.on('mouseover', () => {
            if (vRouteId) onRouteHover?.(vRouteId);
          });
          marker.on('mouseout', () => {
            if (vRouteId) onRouteHover?.(null);
          });

          marker.on('click', () => {
            navigate(`/video/${videoData.users?.login || 'user'}/${videoData.id}`);
          });
          videoMarkersRef.current.push(marker);
        }

        marker.addTo(map);
        videoClusterGroupRef.current.push(marker);
      } catch (e) {
        console.error('[LeafletMap] Error adding marker:', e);
      }
    });

    return () => {
      if (videoClusterGroupRef.current) {
        videoClusterGroupRef.current.forEach(m => m.remove());
        videoClusterGroupRef.current = [];
      }
      videoMarkersRef.current = [];
    };
  }, [map, videos, clusters, highlightedVideoId, navigate, mode, showVideos]);

  // ─── Маркеры и линии маршрута ─────────────────────────────────────────
  useEffect(() => {
    if (!map || (mode !== 'route-editor' && mode !== 'route-viewer' && mode !== 'point-selector' && mode !== 'videos')) return;

    if (!showPath) {
      routeLayersRef.current.polylines.forEach(l => l.remove());
      routeLayersRef.current.markers.forEach(m => m.remove());
      routeLayersRef.current = { polylines: [], markers: [] };
      if (popupMarkerRef.current) {
        popupMarkerRef.current.remove();
        popupMarkerRef.current = null;
      }
      return;
    }

    // Очищаем предыдущий рендер
    routeLayersRef.current.polylines.forEach(l => l.remove());
    routeLayersRef.current.markers.forEach(m => m.remove());
    routeLayersRef.current = { polylines: [], markers: [] };

    // Очищаем попап через удаление из карты
    if (popupMarkerRef.current) {
      popupMarkerRef.current.remove();
      popupMarkerRef.current = null;
    }

    // Если передан список маршрутов, отрисовываем их все
    const routesToRender = routes.length > 0 ? routes : (props.routePoints ? [{ path_data: props.routePoints }] : []);

    if (routesToRender.length === 0) return;

    routesToRender.forEach((route) => {
      const points = route.path_data || [];
      if (!points || points.length === 0) return;

      points.forEach((pointData, index) => {
        const coords = Array.isArray(pointData) ? pointData : pointData.coords;
        if (!coords) return;

        const isStart = pointData.type === 'start' || index === 0;
        const transportType = pointData.transport || 'walking';
        const transportColor = getTransportOption(transportType).color;
        const stopTypeLabel = pointData.stop_type ? (STOP_TYPE_MAP[pointData.stop_type]?.label || '') : '';
        const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);

        const stopType = pointData.stop_type;
        const isMilestone = isStart || (stopType && stopType !== 'none');

        if (isMilestone && showMilestones) {
          const icon = createRoutePointIcon(pointData, isStart, transportColor, stopTypeLabel);
          const [lng, lat] = coords;
          const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
          const marker = L.marker([lat, lng], {
            icon,
            draggable: mode === 'route-editor' && !!onPointDragEndRef.current,
            opacity,
            routeId: route.id // Сохраняем ID для обновления
          });

          if (mode === 'route-editor' && index !== 0) {
            marker.on('click', (e) => {
              e.originalEvent?.stopPropagation();
              onPointClickRef.current?.(index);
            });
          } else if (mode === 'videos' || mode === 'route-viewer' || mode === 'point-selector') {
            marker.on('click', (e) => {
              if (mode === 'point-selector') {
                const { lat, lng } = e.latlng;
                onMapClick?.([lng, lat]);
                return;
              }
              L.DomEvent.stopPropagation(e);
              if (route.id) onRouteClick?.(route.id);
            });
          }

          if (mode === 'route-editor' && onPointDragEndRef.current) {
            marker.on('dragend', (e) => {
              const pos = e.target.getLatLng();
              onPointDragEndRef.current(index, [pos.lng, pos.lat]);
            });
          }

          if (route.title) {
            marker.bindTooltip(route.title, { sticky: true, className: 'route-tooltip' });
          }

          marker.on('mouseover', () => {
            onRouteHover?.(route.id);
          });
          marker.on('mouseout', () => {
            onRouteHover?.(null);
          });

          marker.addTo(map);
          routeLayersRef.current.markers.push(marker);
        }

        if (index > 0) {
          const prevCoords = Array.isArray(points[index - 1]) ? points[index - 1] : points[index - 1].coords;
          const color = getTransportOption(transportType).color;
          const isCurrentHovered = hoveredRouteId && route.id && String(route.id) === String(hoveredRouteId);
          const polylineOpacity = (!hoveredRouteId || isCurrentHovered) ? 0.85 : 0.2;
          const polylineWeight = isCurrentHovered ? 6 : 4;

          const polyline = L.polyline([toLeafletLatLng(prevCoords), toLeafletLatLng(coords)], {
            color,
            weight: polylineWeight,
            opacity: polylineOpacity,
            routeId: route.id // Сохраняем ID для обновления
          });

          if (route.title) {
            polyline.bindTooltip(route.title, { sticky: true, className: 'route-tooltip' });
          }

          polyline.on('mouseover', () => {
            onRouteHover?.(route.id);
          });
          polyline.on('mouseout', () => {
            onRouteHover?.(null);
          });

          polyline.on('click', (e) => {
            if (mode === 'point-selector') {
              const { lat, lng } = e.latlng;
              onMapClick?.([lng, lat]);
              return;
            }
            L.DomEvent.stopPropagation(e);
            if (route.id) onRouteClick?.(route.id);
          });

          polyline.addTo(map);
          routeLayersRef.current.polylines.push(polyline);
        }
      });
    });

    // Попап выбора типа остановки (только для режима редактора)
    if (mode === 'route-editor') {
      const targetIndex = activePointIndex;
      const points = routesToRender[0]?.path_data || [];
      if (targetIndex !== null && targetIndex !== undefined && points[targetIndex]) {
        const pointData = points[targetIndex];
        const coords = Array.isArray(pointData) ? pointData : pointData.coords;
        if (coords) {
          const [lng, lat] = coords;

          const popupEl = createStopTypePopupElement({
            currentType: pointData.stop_type,
            onSelect: (newType) => {
              onPointChangeRef.current?.(targetIndex, 'stop_type', newType);
              onPointClickRef.current?.(null);
            },
            onCancel: () => {
              onPointClickRef.current?.(null);
            },
            isLeaflet: true
          });

          // Используем L.popup напрямую на карте без промежуточного маркера
          const popup = L.popup({
            offset: [0, -10],
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: 'clean-popup',
            autoPanPadding: [50, 150]
          })
            .setLatLng([lat, lng])
            .setContent(popupEl);

          // Открываем попап
          popup.addTo(map);
          popupMarkerRef.current = popup;
        }
      }
    }

    return () => {
      routeLayersRef.current.polylines.forEach(l => l.remove());
      routeLayersRef.current.markers.forEach(m => m.remove());
      if (popupMarkerRef.current) {
        popupMarkerRef.current.remove();
        popupMarkerRef.current = null;
      }
    };
  }, [map, routes, props.routePoints, mode, activePointIndex, showPath, showMilestones, onRouteHover, onRouteClick]);

  // ─── Центрирование карты (fitBounds) ──────────────────────────────────
  useEffect(() => {
    if (!map || (mode !== 'route-viewer' && mode !== 'point-selector')) return;

    // Центрируем только если изменился маршрут или был нажат сброс
    const routeChanged = routeId !== lastCenteredRouteIdRef.current;
    const resetPressed = resetKey !== lastResetKeyRef.current;

    if (!routeChanged && !resetPressed) return;

    const routesToRender = routes.length > 0 ? routes : (props.routePoints ? [{ path_data: props.routePoints }] : []);
    if (routesToRender.length === 0) return;

    const allCoords = [];
    routesToRender.forEach(r => {
      const points = r.path_data || [];
      points.forEach(p => {
        const coords = Array.isArray(p) ? p : p?.coords;
        if (coords) allCoords.push(coords);
      });
    });

    const bounds = getBoundsFromCoords(allCoords);
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 1 });
      lastCenteredRouteIdRef.current = routeId;
      lastResetKeyRef.current = resetKey;
    }
  }, [map, routes, resetKey, mode, routeId, props.routePoints]);

  // Эффект для плавного обновления прозрачности при наведении
  useEffect(() => {
    if (!map) return;

    // Обновляем видео-маркеры
    videoMarkersRef.current.forEach(marker => {
      const video = marker.options.videoData;
      if (!video) return;
      const vRouteId = video.routeId || video.route_id;
      const isCurrentHovered = hoveredRouteId && vRouteId && String(vRouteId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
      marker.setOpacity(opacity);
    });

    // Обновляем маркеры маршрута
    routeLayersRef.current.markers.forEach(marker => {
      const rId = marker.options.routeId;
      const isCurrentHovered = hoveredRouteId && rId && String(rId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 1 : 0.3;
      marker.setOpacity(opacity);
    });

    // Обновляем линии маршрута
    routeLayersRef.current.polylines.forEach(polyline => {
      const rId = polyline.options.routeId;
      const isCurrentHovered = hoveredRouteId && rId && String(rId) === String(hoveredRouteId);
      const opacity = (!hoveredRouteId || isCurrentHovered) ? 0.85 : 0.2;
      const weight = isCurrentHovered ? 6 : 4;
      polyline.setStyle({ opacity, weight });
    });
  }, [hoveredRouteId, map]);

  // ─── Маркер выбранной точки (point-selector) ──────────────────────────
  useEffect(() => {
    if (!map || mode !== 'point-selector') return;

    if (selectedPointMarkerRef.current) {
      selectedPointMarkerRef.current.remove();
      selectedPointMarkerRef.current = null;
    }

    if (selectedPoint) {
      const [lng, lat] = selectedPoint;
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:20px;height:20px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.4);transform:translate(-50%,-50%);"></div>',
        iconSize: [0, 0]
      });

      const marker = L.marker([lat, lng], {
        icon,
        draggable: true,
        zIndexOffset: 1000
      });

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        onMapClick?.([pos.lng, pos.lat]);
      });

      marker.addTo(map);
      selectedPointMarkerRef.current = marker;
    }

    return () => {
      if (selectedPointMarkerRef.current) {
        selectedPointMarkerRef.current.remove();
        selectedPointMarkerRef.current = null;
      }
    };
  }, [map, mode, selectedPoint]);

  // ─── Debounced загрузка видео по координатам ──────────────────────────
  const debouncedCenter = useDebounce(mapCenter, DEBOUNCE_DELAY);

  useEffect(() => {
    if (!map || mode !== 'videos' || disableFetchOnMove) return;
    const [lng, lat] = debouncedCenter;
    const last = lastFetchCoordsRef.current;
    if (
      last.lat != null && last.lng != null &&
      Math.abs(lat - last.lat) < 0.001 && Math.abs(lng - last.lng) < 0.001
    ) return;

    lastFetchCoordsRef.current = { lat, lng };
    fetchVideosRef.current?.(lat, lng).catch(e => console.error('Ошибка загрузки видео:', e));
  }, [debouncedCenter, mode]);

  useEffect(() => {
    refreshVideosRef.current = () => {
      const [lng, lat] = mapCenter;
      if (lat && lng) fetchVideosRef.current?.(lat, lng);
    };
  }, [mapCenter]);

  const refreshVideosRef = useRef(null);

  return (
    <div className="map-wrapper" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: '100%', width: '100%', margin: 0, boxShadow: 'none', borderRadius: 0 }}>
      <div ref={mapContainerRef} className="map-container" style={{ height: '100%' }} />
    </div>
  );
};

