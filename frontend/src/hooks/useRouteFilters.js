import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';

const ALL_TRANSPORTS = TRANSPORT_OPTIONS.map(t => t.value);

/**
 * Хук для управления состоянием фильтров и синхронизации с URL Query Params
 */
export const useRouteFilters = (initialMaxDistance = 100, initialMaxDuration = 1000) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Инициализация из URL или localStorage
  const getInitialFilters = () => {
    // Сначала пробуем URL
    const hasUrlParams = searchParams.toString().length > 0;
    
    if (hasUrlParams) {
      const urlTransports = searchParams.get('transports');
      return {
        sortBy: searchParams.get('sortBy') || 'newest',
        selectedGuide: searchParams.get('guide') || 'all',
        searchQuery: searchParams.get('query') || '',
        onlyActive: searchParams.get('active') === 'true',
        onlyCompleted: searchParams.get('completed') === 'true',
        transports: urlTransports ? urlTransports.split(',') : ALL_TRANSPORTS,
        useDistance: searchParams.get('useDist') === 'true',
        useDuration: searchParams.get('useDur') === 'true',
        distance: [
          Number(searchParams.get('minDist')) || 0,
          Number(searchParams.get('maxDist')) || (searchParams.get('maxDist') === null ? initialMaxDistance : Number(searchParams.get('maxDist')))
        ],
        duration: [
          Number(searchParams.get('minDur')) || 0,
          Number(searchParams.get('maxDur')) || (searchParams.get('maxDur') === null ? initialMaxDuration : Number(searchParams.get('maxDur')))
        ]
      };
    }

    // Если в URL пусто, пробуем localStorage
    const saved = localStorage.getItem('route_filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Проверяем актуальность максимумов
        parsed.distance[1] = Math.min(parsed.distance[1], initialMaxDistance);
        parsed.duration[1] = Math.min(parsed.duration[1], initialMaxDuration);
        if (!parsed.transports) parsed.transports = ALL_TRANSPORTS;
        if (parsed.useDistance === undefined) parsed.useDistance = false;
        if (parsed.useDuration === undefined) parsed.useDuration = false;
        return parsed;
      } catch (e) {
        console.error('Error parsing saved filters:', e);
      }
    }

    // Дефолтные значения (теперь по умолчанию выключены)
    return {
      sortBy: 'newest',
      selectedGuide: 'all',
      searchQuery: '',
      onlyActive: false,
      onlyCompleted: false,
      transports: ALL_TRANSPORTS,
      useDistance: false,
      useDuration: false,
      distance: [0, initialMaxDistance],
      duration: [0, initialMaxDuration]
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [draftFilters, setDraftFilters] = useState(getInitialFilters);

  // Синхронизация черновика при изменении внешних данных (например, при загрузке новых маршрутов и расчете максимумов)
  useEffect(() => {
    if (searchParams.get('maxDist') === null) {
      setDraftFilters(prev => ({ ...prev, distance: [prev.distance[0], initialMaxDistance] }));
      setFilters(prev => ({ ...prev, distance: [prev.distance[0], initialMaxDistance] }));
    }
  }, [initialMaxDistance]);

  useEffect(() => {
    if (searchParams.get('maxDur') === null) {
      setDraftFilters(prev => ({ ...prev, duration: [prev.duration[0], initialMaxDuration] }));
      setFilters(prev => ({ ...prev, duration: [prev.duration[0], initialMaxDuration] }));
    }
  }, [initialMaxDuration]);

  // Обновление URL и localStorage ПРИ ПРИМЕНЕНИИ (не при каждом изменении draft)
  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    
    // Сохраняем в localStorage
    localStorage.setItem('route_filters', JSON.stringify(draftFilters));

    // Обновляем URL
    const params = new URLSearchParams();
    if (draftFilters.sortBy !== 'newest') params.set('sortBy', draftFilters.sortBy);
    if (draftFilters.selectedGuide !== 'all') params.set('guide', draftFilters.selectedGuide);
    if (draftFilters.searchQuery) params.set('query', draftFilters.searchQuery);
    if (draftFilters.onlyActive) params.set('active', 'true');
    if (draftFilters.onlyCompleted) params.set('completed', 'true');
    
    if (draftFilters.useDistance) {
      params.set('useDist', 'true');
      if (draftFilters.distance[0] > 0) params.set('minDist', draftFilters.distance[0]);
      if (draftFilters.distance[1] < initialMaxDistance) params.set('maxDist', draftFilters.distance[1]);
    }
    
    if (draftFilters.useDuration) {
      params.set('useDur', 'true');
      if (draftFilters.duration[0] > 0) params.set('minDur', draftFilters.duration[0]);
      if (draftFilters.duration[1] < initialMaxDuration) params.set('maxDur', draftFilters.duration[1]);
    }
    
    if (draftFilters.transports && draftFilters.transports.length < ALL_TRANSPORTS.length) {
      params.set('transports', draftFilters.transports.join(','));
    }

    setSearchParams(params, { replace: true });
  }, [draftFilters, setSearchParams, initialMaxDistance, initialMaxDuration]);


  const updateFilter = useCallback((key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    const reset = {
      sortBy: 'newest',
      selectedGuide: 'all',
      searchQuery: '',
      onlyActive: false,
      onlyCompleted: false,
      transports: ALL_TRANSPORTS,
      useDistance: false,
      useDuration: false,
      distance: [0, initialMaxDistance],
      duration: [0, initialMaxDuration]
    };
    setDraftFilters(reset);
    setFilters(reset);
    localStorage.removeItem('route_filters');
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [initialMaxDistance, initialMaxDuration, setSearchParams]);

  return { filters, draftFilters, updateFilter, applyFilters, resetFilters };
};
