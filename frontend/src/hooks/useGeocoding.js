import { useState, useEffect } from 'react';
import { reverseGeocode } from '../utils/map/leaflet/helpers';

/**
 * Хук для получения адресов контрольных точек маршрута
 */
export const useGeocoding = (pathData) => {
  const [routeAddresses, setRouteAddresses] = useState({});

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!pathData || pathData.length === 0) return;

      const points = pathData;

      // Фильтруем точки, для которых нужен адрес
      const pointsToGeocode = points.map((pt, index) => ({ pt, index }))
        .filter(({ pt, index }) => {
          const isStart = index === 0;
          const isFinish = pt.stop_type === 'finish' || index === points.length - 1;
          const isStop = pt.stop_type && pt.stop_type !== 'none' && !isFinish;
          return isStart || isFinish || isStop;
        });

      // Выполняем запросы последовательно с небольшой задержкой для Nominatim
      for (let i = 0; i < pointsToGeocode.length; i++) {
        const { pt, index } = pointsToGeocode[i];
        const coords = Array.isArray(pt) ? pt : pt.coords;
        if (!coords) continue;
        const [lng, lat] = coords;

        try {
          const address = await reverseGeocode(lng, lat);
          if (address) {
            // Обновляем состояние частично, чтобы пользователь видел прогресс
            setRouteAddresses(prev => ({ ...prev, [index]: address }));
          }
        } catch (e) {
          console.error("Geocoding error", e);
        }

        // Небольшая пауза между запросами (OSM Nominatim policy)
        if (i < pointsToGeocode.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };

    fetchAddresses();
  }, [pathData]);

  return routeAddresses;
};
