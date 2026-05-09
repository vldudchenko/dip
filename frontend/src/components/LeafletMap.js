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
import { createUploadPopupElement } from '../utils/map/uploadPopup';
import { buildRoute } from '../utils/map/helpers';
import { LiveMarkerUploadController } from '../utils/map/liveMarkerUpload';

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
  ...props
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const userRef = useRef({ id: localStorage.getItem('user_id') });

  const videoMarkersRef = useRef([]);
  const routeLayersRef = useRef({ polylines: [], markers: [] });
  const selectionMarkerRef = useRef(null);
  const selectedPointMarkerRef = useRef(null);
  const activeLiveControllerRef = useRef(null);
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


// ─── Маркеры видео ────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || mode === 'route-editor' || !showVideos) {
      videoMarkersRef.current.forEach(m => m.remove());
      videoMarkersRef.current = [];
      return;
    }

    videoMarkersRef.current.forEach(m => m.remove());
    videoMarkersRef.current = [];

    const features = videosToFeatures(videos);
    features.forEach((feature) => {
      try {
        const video = feature.properties.video;
        const isHighlighted = highlightedVideoId && video.id === highlightedVideoId;
        const icon = createVideoIcon(video, isHighlighted);
        const [lng, lat] = feature.geometry.coordinates;
        const marker = L.marker([lat, lng], { icon });
        marker.on('click', () => {
          navigate(`/video/${video.users?.login || 'user'}/${video.id}`);
        });
        marker.addTo(map);
        videoMarkersRef.current.push(marker);
      } catch (e) {
        console.error('[LeafletMap] Error adding video marker:', e);
      }
    });

    return () => {
      videoMarkersRef.current.forEach(m => m.remove());
      videoMarkersRef.current = [];
    };
  }, [map, videos, highlightedVideoId, navigate, mode, showVideos]);

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

        const icon = createRoutePointIcon(pointData, isStart, transportColor, stopTypeLabel);
        const [lng, lat] = coords;
        const marker = L.marker([lat, lng], {
          icon,
          draggable: mode === 'route-editor' && !!onPointDragEndRef.current,
        });

        if (mode === 'route-editor' && index !== 0) {
          marker.on('click', (e) => {
            e.originalEvent?.stopPropagation();
            onPointClickRef.current?.(index);
          });
        }

        if (mode === 'route-editor' && onPointDragEndRef.current) {
          marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            onPointDragEndRef.current(index, [pos.lng, pos.lat]);
          });
        }

        marker.addTo(map);
        routeLayersRef.current.markers.push(marker);

        if (index > 0) {
          const prevCoords = Array.isArray(points[index - 1]) ? points[index - 1] : points[index - 1].coords;
          const color = getTransportOption(transportType).color;
          const polyline = L.polyline([toLeafletLatLng(prevCoords), toLeafletLatLng(coords)], {
            color, weight: 4, opacity: 0.85,
          });
          polyline.addTo(map);
          routeLayersRef.current.polylines.push(polyline);
        }
      });
    });

    if ((mode === 'route-viewer' || mode === 'point-selector') && routesToRender.length > 0) {
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
      }
    }

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
  }, [map, routes, props.routePoints, mode, activePointIndex, showPath]);

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
    <div className="map-wrapper" style={{ height: '100%' }}>
      <div ref={mapContainerRef} className="map-container" style={{ height: '100%' }} />
    </div>
  );
};

function createLeafletLiveController(map) {
  let marker = null;
  let line = null;

  return {
    activate: (startPoint) => {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.5);transform:translate(-50%,-50%);"></div>',
        iconSize: [0, 0]
      });
      marker = L.marker([startPoint[1], startPoint[0]], { icon }).addTo(map);

      const onMouseMove = (e) => {
        if (line) line.remove();
        line = L.polyline([[startPoint[1], startPoint[0]], [e.latlng.lat, e.latlng.lng]], {
          color: '#ef4444', weight: 3, dashArray: '5, 10', opacity: 0.6
        }).addTo(map);
      };

      const onClick = (e) => {
        const endCoords = [e.latlng.lng, e.latlng.lat];
        const geometry = [[startPoint[0], startPoint[1]], [endCoords[0], endCoords[1]]];

        // Находим текущий попап и обновляем его
        const popups = document.querySelectorAll('.upload-popup');
        popups.forEach(p => {
          if (p.updateSecondPoint) p.updateSecondPoint(endCoords, geometry);
        });

        cleanup();
      };

      const cleanup = () => {
        map.off('mousemove', onMouseMove);
        map.off('click', onClick);
        if (line) line.remove();
        if (marker) marker.remove();
      };

      map.on('mousemove', onMouseMove);
      setTimeout(() => map.on('click', onClick), 100);
    },
    reset: () => {
      if (line) line.remove();
      if (marker) marker.remove();
    }
  };
}
