import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import customization from '../customization.json';
import { createRouteMarkerElement } from '../utils/map/markers';

/**
 * Просмотр маршрута на карте
 */
export const RouteMapView = forwardRef(({ pathGeometry, checkpoints, onCheckpointClick }, ref) => {
  const mapContainerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);

  // Экспонируем методы для внешнего управления
  useImperativeHandle(ref, () => ({
    centerOn: (coords, zoom = 14) => {
      if (mapInstance) {
        mapInstance.setLocation({ center: coords, zoom, duration: 800 });
      }
    }
  }), [mapInstance]);

  useEffect(() => {
    if (!window.ymaps3 || !mapContainerRef.current) return;

    const initMap = async () => {
      await window.ymaps3.ready;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapFeature, YMapMarker } = window.ymaps3;

      const map = new YMap(mapContainerRef.current, {
        location: {
          center: checkpoints.length > 0 ? checkpoints[0].coords : (pathGeometry?.[0] || [37.6177, 55.7558]),
          zoom: 12
        },
        mode: 'vector'
      });

      map.addChild(new YMapDefaultSchemeLayer({ customization }));
      const featuresLayer = new YMapDefaultFeaturesLayer();
      map.addChild(featuresLayer);

      // Отрисовка пути
      if (pathGeometry && pathGeometry.length > 1) {
        const polyline = new YMapFeature({
          id: 'route-path',
          geometry: {
            type: 'LineString',
            coordinates: pathGeometry
          },
          style: {
            stroke: [{ color: '#7c3aed', width: 5, opacity: 0.8 }]
          }
        });
        featuresLayer.addChild(polyline);
      }

      // Отрисовка контрольных точек
      checkpoints.forEach((cp, index) => {
        const element = createRouteMarkerElement({ 
          index, 
          transport: cp.transport, 
          isViewOnly: true 
        });
        
        element.title = cp.title;
        element.onclick = () => onCheckpointClick && onCheckpointClick(cp, index);

        const marker = new YMapMarker({
          coordinates: cp.coords
        }, element);

        map.addChild(marker);
      });

      setMapInstance(map);
    };

    initMap();

    return () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = '';
      }
    };
  }, [pathGeometry, checkpoints]);

  return (
    <div className="route-map-view-container">
      <div ref={mapContainerRef} className="route-display-map" />
    </div>
  );
});
