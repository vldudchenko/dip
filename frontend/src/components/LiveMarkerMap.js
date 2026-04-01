import React, { useEffect, useMemo, useRef, useState } from 'react';
import customization from '../customization.json';
import { toLngLatRoute, getBounds, getPositionAlongRoute, createAvatarElement } from '../utils/map/helpers';

/**
 * Компонент карты для отображения live-маркера с маршрутом
 */
export function LiveMarkerMap({ routeGeometry, videoDuration, currentTime, video, inline }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const markerIconRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

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
        location: {
          center,
          zoom: 15
        },
        mode: 'vector'
      });

      // Слои карты
      const schemeLayer = new YMapDefaultSchemeLayer({ customization });
      map.addChild(schemeLayer);
      map.addChild(new YMapDefaultFeaturesLayer());

      // Линия маршрута
      map.addChild(
        new YMapFeature({
          geometry: {
            type: 'LineString',
            coordinates: geometry
          },
          style: {
            stroke: [{
              color: '#7c3aed',
              width: 5,
              opacity: 0.9
            }]
          }
        })
      );

      // Маркер с аватаркой
      const avatarUrl = video?.users?.avatar;
      const login = video?.users?.login;
      const markerElement = createAvatarElement(avatarUrl, login, true);

      const marker = new YMapMarker({ coordinates: geometry[0] }, markerElement);
      map.addChild(marker);

      // Добавляем маркер в DOM перед поиском img элемента
      const innerElement = markerElement.querySelector('img');

      mapRef.current = map;
      markerRef.current = marker;
      if (innerElement) {
        markerIconRef.current = innerElement;
      }
      setMapReady(true);
    };

    initMap();

    return () => {
      mounted = false;
      setMapReady(false);
      markerRef.current = null;
      markerIconRef.current = null;

      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          // ignore map destroy errors
        }
      }

      mapRef.current = null;
    };
  }, [geometry, video]);

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
