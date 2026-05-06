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

export const LeafletMap = ({ 
  videos, 
  mode = 'videos', 
  editMode = false,
  routePoints = [],
  ...props 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userRef = useRef({ id: localStorage.getItem('user_id') });
  
  const videoMarkersRef = useRef([]);
  const routeLayersRef = useRef({ polylines: [], markers: [] });
  const selectionMarkerRef = useRef(null);
  const activeLiveControllerRef = useRef(null);
  const popupMarkerRef = useRef(null);
  const highlightedVideoIdRef = useRef(null);
  const currentPopupElementRef = useRef(null);

  // Refs for callbacks to avoid effect dependencies
  const onPointChangeRef = useRef(props.onPointChange);
  const onPointDragEndRef = useRef(props.onPointDragEnd);
  const onPointClickRef = useRef(props.onPointClick);
  const fetchVideosRef = useRef(props.onFetchVideos);
  const editModeRef = useRef(editMode);
  const lastFetchCoordsRef = useRef({ lat: null, lng: null });

  useEffect(() => { onPointChangeRef.current = props.onPointChange; }, [props.onPointChange]);
  useEffect(() => { onPointDragEndRef.current = props.onPointDragEnd; }, [props.onPointDragEnd]);
  useEffect(() => { onPointClickRef.current = props.onPointClick; }, [props.onPointClick]);
  useEffect(() => { fetchVideosRef.current = props.onFetchVideos; }, [props.onFetchVideos]);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  const [mapCenter, setMapCenter] = useState(MAP_DEFAULT_CENTER);
  const [highlightedVideoId, setHighlightedVideoId] = useState(null);

  // ─── Инициализация карты ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const savedState = loadOsmMapState(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    const map = L.map(mapContainerRef.current, {
      center: [savedState.center[1], savedState.center[0]],
      zoom: savedState.zoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Зум-контролы скрыты по просьбе пользователя

    map.on('moveend', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const newCoords = [center.lng, center.lat];
      setMapCenter(newCoords);
      saveOsmMapState(newCoords, zoom);
    });

    mapRef.current = map;

    // Клик по карте для добавления видео в режиме редактирования
    let uploading = false;
    map.on('click', (e) => {
      if (mode === 'route-editor') {
        props.onMapClick?.([e.latlng.lng, e.latlng.lat]);
        return;
      }

      if (!editModeRef.current || mode !== 'videos' || uploading) return;

      const coords = [e.latlng.lng, e.latlng.lat];
      
      const handleLiveRouteSelect = (startPoint, isActive) => {
        if (isActive && startPoint) {
          activeLiveControllerRef.current?.reset();
          const controller = createLeafletLiveController(map);
          activeLiveControllerRef.current = controller;
          controller.activate(startPoint);
          return;
        }
        activeLiveControllerRef.current?.reset();
        activeLiveControllerRef.current = null;
      };

      const { popupElement, uploadButton } = createUploadPopupElement(
        { addChild: () => {}, removeChild: () => {} },
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
            const res = await fetch(`${process.env.REACT_APP_API_URL}/videos`, { method: 'POST', body: formData });
            const result = await res.json();
            if (result?.success) {
              activeLiveControllerRef.current?.reset();
              activeLiveControllerRef.current = null;
              if (selectionMarkerRef.current) {
                selectionMarkerRef.current.remove();
                selectionMarkerRef.current = null;
              }
              refreshVideosRef.current?.();
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
          activeLiveControllerRef.current?.reset();
          activeLiveControllerRef.current = null;
          if (selectionMarkerRef.current) {
            selectionMarkerRef.current.remove();
            selectionMarkerRef.current = null;
          }
        },
        uploading,
        handleLiveRouteSelect,
        true // isLeaflet
      );

      currentPopupElementRef.current = popupElement;

      const [pLat, pLng] = [coords[1], coords[0]];
      const selIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;background:#7c3aed;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:translate(-50%,-50%);"></div>',
        iconSize: [0, 0], iconAnchor: [0, 0]
      });

      const marker = L.marker([pLat, pLng], { icon: selIcon });
      marker.addTo(map);

      const leafletPopup = L.popup({ 
        offset: [0, -8], 
        closeButton: false, 
        autoClose: false, 
        closeOnClick: false, 
        className: 'clean-popup',
        autoPanPadding: [50, 150]
      }).setContent(popupElement);
      marker.bindPopup(leafletPopup).openPopup();

      selectionMarkerRef.current = marker;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Переход со страницы видео (state с координатами) ─────────────────
  useEffect(() => {
    const map = mapRef.current;
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

  // ─── Удаление маркера выделения при выходе из editMode ────────────────
  useEffect(() => {
    if (!editMode && selectionMarkerRef.current) {
      selectionMarkerRef.current.remove();
      selectionMarkerRef.current = null;
    }
  }, [editMode]);

  // ─── Маркеры видео ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || (mode === 'route-editor' || mode === 'route-viewer')) return;

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
          if (editModeRef.current) return;
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
  }, [mapRef.current, videos, highlightedVideoId, navigate, mode]);

  // ─── Маркеры и линии маршрута ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || (mode !== 'route-editor' && mode !== 'route-viewer')) return;

    // Очищаем предыдущий рендер
    routeLayersRef.current.polylines.forEach(l => l.remove());
    routeLayersRef.current.markers.forEach(m => m.remove());
    routeLayersRef.current = { polylines: [], markers: [] };
    
    // Очищаем попап через удаление из карты
    if (popupMarkerRef.current) {
      popupMarkerRef.current.remove();
      popupMarkerRef.current = null;
    }

    if (!routePoints || routePoints.length === 0) return;

    routePoints.forEach((pointData, index) => {
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
        const prevCoords = Array.isArray(routePoints[index - 1]) ? routePoints[index - 1] : routePoints[index - 1].coords;
        const color = getTransportOption(transportType).color;
        const polyline = L.polyline([toLeafletLatLng(prevCoords), toLeafletLatLng(coords)], {
          color, weight: 4, opacity: 0.85,
        });
        polyline.addTo(map);
        routeLayersRef.current.polylines.push(polyline);
      }
    });

    if (mode === 'route-viewer' && routePoints.length > 0) {
      const allCoords = routePoints.map(p => Array.isArray(p) ? p : p?.coords).filter(Boolean);
      const bounds = getBoundsFromCoords(allCoords);
      if (bounds) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    // Попап выбора типа остановки
    const targetIndex = props.activePointIndex;
    if (targetIndex !== null && targetIndex !== undefined && routePoints[targetIndex]) {
      const pointData = routePoints[targetIndex];
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

    return () => {
      routeLayersRef.current.polylines.forEach(l => l.remove());
      routeLayersRef.current.markers.forEach(m => m.remove());
      if (popupMarkerRef.current) {
        popupMarkerRef.current.remove();
        popupMarkerRef.current = null;
      }
    };
  }, [mapRef.current, routePoints, mode, props.activePointIndex]);

  // ─── Debounced загрузка видео по координатам ──────────────────────────
  const debouncedCenter = useDebounce(mapCenter, DEBOUNCE_DELAY);

  useEffect(() => {
    if (!mapRef.current || mode !== 'videos') return;
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
