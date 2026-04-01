import { useState, useCallback, useRef } from 'react';
import { api, getConfig } from '../api';

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef({ lat: null, lng: null, time: 0 });
  const FETCH_COOLDOWN = 800; // 0.8 секунды между запросами

  // Функция загрузки видео с защитой от частых запросов
  const fetchVideos = useCallback(async (lat, lng, radius) => {
    const now = Date.now();
    const lastFetch = lastFetchRef.current;

    // Проверяем, не слишком ли часто делаем запрос
    if (now - lastFetch.time < FETCH_COOLDOWN) {
      return;
    }

    // Проверяем, не те же ли это координаты (с небольшой погрешностью)
    if (
      lat != null &&
      lng != null &&
      lastFetch.lat != null &&
      lastFetch.lng != null &&
      Math.abs(lat - lastFetch.lat) < 0.001 &&
      Math.abs(lng - lastFetch.lng) < 0.001
    ) {
      return;
    }

    setLoading(true);
    lastFetchRef.current = { lat, lng, time: now };

    try {
      // Используем радиус из конфига, если не передан
      const searchRadius = radius != null ? radius : getConfig().DEFAULT_RADIUS;
      const data = await api.fetchVideos(lat, lng, searchRadius);
      setVideos(data);
    } catch (error) {
      console.error('[useVideos] Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { videos, fetchVideos, setVideos, loading };
}
