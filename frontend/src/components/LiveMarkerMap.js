import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import customization from '../customization.json';
import { toLngLatRoute, getBounds, getPositionAlongRoute, createAvatarElement } from '../utils/map/helpers';
import { toLeafletLatLng, toLeafletPolyline } from '../utils/map/leaflet/helpers';
import { createAvatarIcon } from '../utils/map/leaflet/markers';
import { useMapProvider } from '../hooks/useMapProvider';
import { useYandexMaps } from '../hooks/useYandexMaps';

/**
 * Компонент карты для отображения live-маркера с маршрутом.
 * Поддерживает оба провайдера: Яндекс и Leaflet (OSM).
 */
export function LiveMarkerMap({ routeGeometry, videoDuration, currentTime, video, inline }) {
  const { provider } = useMapProvider();

  if (provider === 'yandex') {
    return <LiveMarkerMapYandex
      routeGeometry={routeGeometry}
      videoDuration={videoDuration}
      currentTime={currentTime}
      video={video}
      inline={inline}
    />;
  }

  return <LiveMarkerMapLeaflet
    routeGeometry={routeGeometry}
    videoDuration={videoDuration}
    currentTime={currentTime}
    video={video}
    inline={inline}
  />;
}

// ─── Leaflet реализация ───────────────────────────────────────────────────────

function LiveMarkerMapLeaflet({ routeGeometry, videoDuration, currentTime, video, inline }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const geometry = useMemo(() => toLngLatRoute(routeGeometry), [routeGeometry]);

  useEffect(() => {
    if (!mapContainerRef.current || !geometry.length) return;

    const bounds = getBounds(geometry);
    const center = [
      (bounds.minLat + bounds.maxLat) / 2,
      (bounds.minLon + bounds.maxLon) / 2,
    ];

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Линия маршрута
    const latlngs = toLeafletPolyline(geometry);
    L.polyline(latlngs, { color: '#7c3aed', weight: 5, opacity: 0.9 }).addTo(map);

    // Маркер-аватарка
    const avatarUrl = video?.users?.avatar;
    const login = video?.users?.login;
    const icon = createAvatarIcon(avatarUrl, login, true);
    const [startLng, startLat] = geometry[0];
    const marker = L.marker([startLat, startLng], { icon, zIndexOffset: 1000 }).addTo(map);

    // Подгоняем вид по маршруту
    map.fitBounds(latlngs, { padding: [20, 20] });

    mapRef.current = map;
    markerRef.current = marker;
    setMapReady(true);

    return () => {
      setMapReady(false);
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [geometry, video]);

  useEffect(() => {
    if (!mapReady || !markerRef.current || !geometry.length || !videoDuration) return;
    const progress = Math.min(Math.max(currentTime / videoDuration, 0), 1);
    const position = getPositionAlongRoute(geometry, progress);
    if (!position) return;
    const [lng, lat] = position.coords;
    markerRef.current.setLatLng([lat, lng]);
  }, [mapReady, geometry, currentTime, videoDuration]);

  return (
    <div className={`live-marker-map-container ${inline ? 'live-marker-map-container--inline' : ''}`}>
      <div ref={mapContainerRef} className="live-marker-map" />
      {!mapReady && <div className="live-marker-map-loading">Загрузка карты...</div>}
    </div>
  );
}

// ─── Яндекс реализация (оригинальный код) ────────────────────────────────────

function LiveMarkerMapYandex({ routeGeometry, videoDuration, currentTime, video, inline }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const markerIconRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const { ymapsReady } = useYandexMaps(true);
  const geometry = useMemo(() => toLngLatRoute(routeGeometry), [routeGeometry]);

  useEffect(() => {
    if (!mapContainerRef.current || !window.ymaps3 || !geometry.length) return;

    let mounted = true;

    const initMap = async () => {
      await window.ymaps3.ready;
      if (!mounted) return;

      const {
        YMap,
        YMapDefaultSchemeLayer,
        YMapDefaultFeaturesLayer,
        YMapFeature,
        YMapMarker
      } = window.ymaps3;

      const bounds = getBounds(geometry);
      const center = [
        (bounds.minLon + bounds.maxLon) / 2,
        (bounds.minLat + bounds.maxLat) / 2
      ];

      const map = new YMap(mapContainerRef.current, {
        location: { center, zoom: 15 },
        mode: 'vector'
      });

      const schemeLayer = new YMapDefaultSchemeLayer({ customization });
      map.addChild(schemeLayer);
      map.addChild(new YMapDefaultFeaturesLayer());

      map.addChild(
        new YMapFeature({
          geometry: { type: 'LineString', coordinates: geometry },
          style: { stroke: [{ color: '#7c3aed', width: 5, opacity: 0.9 }] }
        })
      );

      const avatarUrl = video?.users?.avatar;
      const login = video?.users?.login;
      const markerElement = createAvatarElement(avatarUrl, login, true);
      const marker = new YMapMarker({ coordinates: geometry[0] }, markerElement);
      map.addChild(marker);

      const innerElement = markerElement.querySelector('img');
      mapRef.current = map;
      markerRef.current = marker;
      if (innerElement) markerIconRef.current = innerElement;
      setMapReady(true);
    };

    initMap();

    return () => {
      mounted = false;
      setMapReady(false);
      markerRef.current = null;
      markerIconRef.current = null;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
      }
      mapRef.current = null;
    };
  }, [geometry, video, ymapsReady]);

  useEffect(() => {
    if (!mapReady || !markerRef.current || !geometry.length || !videoDuration) return;
    const progress = Math.min(Math.max(currentTime / videoDuration, 0), 1);
    const position = getPositionAlongRoute(geometry, progress);
    if (!position) return;
    markerRef.current.update({ coordinates: position.coords });
    if (markerIconRef.current && typeof markerIconRef.current.getBoundingClientRect === 'function') {
      markerIconRef.current.style.transform = `translate(-50%, -100%)`;
    }
  }, [mapReady, geometry, currentTime, videoDuration]);

  return (
    <div className={`live-marker-map-container ${inline ? 'live-marker-map-container--inline' : ''}`}>
      <div ref={mapContainerRef} className="live-marker-map" />
      {!mapReady && <div className="live-marker-map-loading">Загрузка карты...</div>}
    </div>
  );
}

export default LiveMarkerMap;
