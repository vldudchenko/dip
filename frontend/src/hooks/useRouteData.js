import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/constants';

/**
 * Хук для управления основными данными маршрута: информация, гид, статистика, медиа
 */
export const useRouteData = (routeId, currentUserId) => {
  const [route, setRoute] = useState(null);
  const [guide, setGuide] = useState(null);
  const [routeStats, setRouteStats] = useState({ views: 0, completed_sessions: 0 });
  const [routeVideos, setRouteVideos] = useState([]);
  const [routeImages, setRouteImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMedia = useCallback(async () => {
    try {
      setMediaLoading(true);
      const [videosResp, imagesResp] = await Promise.all([
        fetch(`${API_URL}/videos?routeId=${routeId}`),
        fetch(`${API_URL}/images/route/${routeId}`)
      ]);

      if (videosResp.ok) setRouteVideos(await videosResp.json());
      if (imagesResp.ok) setRouteImages(await imagesResp.json());
    } catch (err) {
      console.error('Error fetching media:', err);
    } finally {
      setMediaLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    if (routeId === 'new') {
      setRoute({ title: '', description: '', path_data: [] });
      setGuide(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const routeResponse = await fetch(`${API_URL}/routes/${routeId}`);
        if (!routeResponse.ok) throw new Error('Маршрут не найден');
        const routeData = await routeResponse.json();
        setRoute(routeData);

        const [guideResp, statsResp] = await Promise.all([
          fetch(`${API_URL}/users/${routeData.guide_id}`),
          fetch(`${API_URL}/routes/${routeId}/stats`)
        ]);

        if (guideResp.ok) setGuide(await guideResp.json());
        if (statsResp.ok) setRouteStats(await statsResp.json());

        // Засчитываем просмотр
        if (currentUserId) {
          fetch(`${API_URL}/routes/${routeId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
          }).catch(e => console.error('Stats view error:', e));
        }

        await fetchMedia();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [routeId, currentUserId, fetchMedia]);

  const createRoute = useCallback(async (title, description) => {
    const response = await fetch(`${API_URL}/routes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({ title, description, guide_id: currentUserId, userId: currentUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось создать маршрут');
    }

    return await response.json();
  }, [currentUserId]);

  const updateRouteInfo = useCallback(async (title, description) => {
    const response = await fetch(`${API_URL}/routes/${routeId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({ title, description, userId: currentUserId })
    });

    if (!response.ok) throw new Error('Не удалось сохранить изменения');

    const updatedRoute = await response.json();
    setRoute(prev => ({ ...prev, title: updatedRoute.title, description: updatedRoute.description }));
    return updatedRoute;
  }, [routeId, currentUserId]);

  const uploadMedia = useCallback(async (file) => {
    if (routeId === 'new') return;
    const formData = new FormData();
    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'images' : 'videos';
    const field = isImage ? 'image' : 'video';
    
    formData.append(field, file);
    formData.append('userId', currentUserId);
    formData.append('routeId', routeId);

    setMediaLoading(true);
    try {
      const response = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: {
          'user-id': currentUserId
        },
        body: formData
      });

      if (!response.ok) throw new Error(`Не удалось загрузить ${isImage ? 'изображение' : 'видео'}`);
      await fetchMedia();
    } finally {
      setMediaLoading(false);
    }
  }, [routeId, currentUserId, fetchMedia]);

  const deleteMedia = useCallback(async (mediaId, type) => {
    const endpoint = type === 'image' ? 'images' : 'videos';
    const response = await fetch(`${API_URL}/${endpoint}/${mediaId}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({ userId: currentUserId })
    });

    if (!response.ok) throw new Error(`Не удалось удалить ${type === 'image' ? 'изображение' : 'видео'}`);
    
    if (type === 'image') {
      setRouteImages(prev => prev.filter(img => img.id !== mediaId));
    } else {
      setRouteVideos(prev => prev.filter(v => v.id !== mediaId));
    }
  }, [currentUserId]);

  return {
    route,
    guide,
    routeStats,
    routeVideos,
    routeImages,
    loading,
    mediaLoading,
    error,
    createRoute,
    updateRouteInfo,
    uploadMedia,
    deleteMedia,
    refreshMedia: fetchMedia
  };
};
