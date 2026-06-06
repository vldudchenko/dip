import { useState, useEffect } from 'react';
import { api } from '../api';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';

/**
 * Хук для серверной фильтрации и сортировки списка маршрутов.
 * Теперь делегирует основную работу API бэкенда.
 */
export const useFilteredRoutes = (initialRoutes, filters, userCompletedRouteIds = new Set()) => {
  const [filteredRoutes, setFilteredRoutes] = useState(initialRoutes);

  // Когда initialRoutes меняются (например, при первой загрузке страницы), 
  // обновляем состояние, если фильтры по умолчанию
  useEffect(() => {
    setFilteredRoutes(initialRoutes);
  }, [initialRoutes]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchFiltered = async () => {
      try {
        // Выполняем запрос к бэкенду с параметрами фильтрации
        const data = await api.searchRoutes(filters);
        
        if (!isMounted) return;
        
        let result = data;
        
        // Фильтр: скрыть пройденные (выполняем на клиенте)
        if (filters.onlyCompleted) {
          result = result.filter(r => !userCompletedRouteIds.has(r.id));
        }
        
        // Резервная клиентская фильтрация по дистанции
        if (filters.useDistance && filters.distance) {
          result = result.filter(r => 
            r.calculatedDistance >= filters.distance[0] && 
            r.calculatedDistance <= filters.distance[1]
          );
        }

        // Резервная клиентская фильтрация по длительности
        if (filters.useDuration && filters.duration) {
          result = result.filter(r => 
            r.calculatedDuration >= filters.duration[0] && 
            r.calculatedDuration <= filters.duration[1]
          );
        }

        // Фильтр по транспорту (только если выбраны не все виды транспорта)
        if (filters.transports && filters.transports.length > 0 && filters.transports.length < TRANSPORT_OPTIONS.length) {
          result = result.filter(r => {
            // Если пути нет, считаем, что маршрут подходит под любой транспорт (или по умолчанию walking)
            if (!r.path_data || !Array.isArray(r.path_data) || r.path_data.length === 0) return true;
            
            const routeTransports = r.path_data.map(p => p.transport || 'walking');
            return routeTransports.some(t => filters.transports.includes(t));
          });
        }
        
        setFilteredRoutes(result);
      } catch (err) {
        console.error('Client side filter error:', err);
        if (isMounted) setFilteredRoutes([]);
      }
    };

    fetchFiltered();

    return () => { isMounted = false; };
  }, [filters, userCompletedRouteIds]);

  return filteredRoutes;
};
