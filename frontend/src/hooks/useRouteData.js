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
          })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
              if (data && data.viewed) {
                // Мгновенно увеличиваем счетчик в интерфейсе, если просмотр уникальный/новый
                setRouteStats(prev => ({
                  ...prev,
                  views: (prev.views || 0) + 1,
                  viewCount: (prev.viewCount || 0) + 1
                }));
              }
            })
            .catch(e => console.error('Stats view error:', e));
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
    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'images' : 'videos';
    const ext = file.name.split('.').pop();
    const uniqueName = `${currentUserId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    setMediaLoading(true);
    try {
      // 1. Получаем Signed URL от нашего бэкенда
      const urlRes = await fetch(`${API_URL}/${type}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-id': currentUserId },
        body: JSON.stringify({ fileName: uniqueName })
      });
      const urlData = await urlRes.json();
      
      if (!urlData.success || !urlData.signedUrl) {
        throw new Error(`Не удалось получить Signed URL для ${isImage ? 'изображения' : 'видео'}`);
      }

      // 2. Прямая загрузка файла в Supabase (Storage)
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file
      });

      if (!uploadRes.ok) throw new Error('Ошибка при загрузке файла в хранилище');

      // 3. Подтверждаем загрузку на бэкенде
      const confirmData = {
        userId: currentUserId,
        routeId: routeId,
        filePath: urlData.path,
        originalName: file.name
      };

      const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'user-id': currentUserId },
        body: JSON.stringify(confirmData)
      });

      if (!res.ok) throw new Error(`Не удалось сохранить ${isImage ? 'изображение' : 'видео'} в базе`);

      await fetchMedia();
    } catch (error) {
      console.error('Upload media error:', error);
      throw error;
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
