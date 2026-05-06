import { useState, useCallback } from 'react';

const MAP_PROVIDER_KEY = 'map_provider';
const DEFAULT_PROVIDER = 'osm'; // osm | yandex

/**
 * Хук для управления провайдером карты.
 * Выбор сохраняется в localStorage.
 * @returns {{ provider: string, setProvider: function }}
 */
export function useMapProvider() {
  const [provider, setProviderState] = useState(() => {
    try {
      const saved = localStorage.getItem(MAP_PROVIDER_KEY);
      if (saved === 'osm' || saved === 'yandex') return saved;
    } catch {}
    return DEFAULT_PROVIDER;
  });

  const setProvider = useCallback((newProvider) => {
    setProviderState(newProvider);
    try {
      localStorage.setItem(MAP_PROVIDER_KEY, newProvider);
    } catch {}
  }, []);

  return { provider, setProvider };
}
