import { API_URL, DEFAULT_RADIUS } from '../utils/constants';
import { getFromCache, setCache, clearCache } from '../utils/cache';

// Глобальная конфигурация
let APP_CONFIG = {
  DEFAULT_RADIUS: DEFAULT_RADIUS // значение по умолчанию из .env
};

// Загрузка конфигурации с backend
export async function loadConfig() {
  try {
    const res = await fetch(`${API_URL}/config`);
    const data = await res.json();
    if (data.DEFAULT_RADIUS != null) {
      APP_CONFIG.DEFAULT_RADIUS = data.DEFAULT_RADIUS;
    }
    return APP_CONFIG;
  } catch (error) {
    console.error('Error loading config:', error);
    return APP_CONFIG;
  }
}

// Получение текущей конфигурации
export function getConfig() {
  return APP_CONFIG;
}

export const api = {
  async fetchUser(userId) {
    const cacheKey = `user:${userId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_URL}/user/${userId}`);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Fetch user error:', error);
      console.log('User: ', userId)
      return null;
    }
  },

  async fetchVideos(lat, lng, radius) {
    // Используем радиус из запроса или default из конфига
    const searchRadius = radius != null ? radius : APP_CONFIG.DEFAULT_RADIUS;
    
    // Кэшируем только запросы с координатами
    const cacheKey = lat != null && lng != null 
      ? `videos:${lat.toFixed(4)}:${lng.toFixed(4)}:${searchRadius}` 
      : 'videos:all';

    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(`${API_URL}/videos`);
      if (lat != null && lng != null) {
        url.searchParams.set('latitude', lat);
        url.searchParams.set('longitude', lng);
        url.searchParams.set('radius', searchRadius);
      }
      const res = await fetch(url);
      const data = await res.json();
      const result = Array.isArray(data) ? data : [];
      setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Fetch videos error:', error);
      return [];
    }
  },

  async uploadVideo(videoFile, userId, latitude, longitude, isLive = false, routeData = null, videoDuration = 0) {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('userId', userId);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('isLive', isLive);

    if (isLive && routeData) {
      formData.append('routeStart', JSON.stringify(routeData.routeStart));
      formData.append('routeEnd', JSON.stringify(routeData.routeEnd));
      formData.append('routeGeometry', JSON.stringify(routeData.routeGeometry));
      formData.append('videoDuration', videoDuration);
    }

    try {
      const res = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      
      // Очищаем кэш видео после загрузки
      clearCache('videos:all');
      
      return result;
    } catch (error) {
      console.error('Upload video error:', error);
      throw error;
    }
  },

  async fetchVideoById(videoId) {
    const cacheKey = `video:${videoId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_URL}/videos/${videoId}`);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Fetch video by ID error:', error);
      return null;
    }
  },

  async deleteVideo(videoId, userId) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await res.json();
      
      // Очищаем кэш после удаления
      clearCache(`video:${videoId}`);
      clearCache('videos:all');
      
      return result;
    } catch (error) {
      console.error('Delete video error:', error);
      throw error;
    }
  },

  // ============================================
  // Статистика видео (с кэшированием)
  // ============================================
  async getVideoStats(videoId) {
    const cacheKey = `video-stats:${videoId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/stats`);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Get stats error:', error);
      return { viewCount: 0, likeCount: 0, commentCount: 0 };
    }
  },

  // ============================================
  // Просмотры (без кэша, всегда новый запрос)
  // ============================================
  async addView(videoId, userId) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return res.json();
    } catch (error) {
      console.error('Add view error:', error);
      return null;
    }
  },

  // ============================================
  // Лайки (с кэшированием состояния)
  // ============================================
  async toggleLike(videoId, userId) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await res.json();
      
      // Обновляем кэш лайка
      setCache(`like:${videoId}:${userId}`, { liked: result.liked });
      // Инвалидируем кэш статистики
      clearCache(`video-stats:${videoId}`);
      
      return result;
    } catch (error) {
      console.error('Toggle like error:', error);
      return null;
    }
  },

  async checkLike(videoId, userId) {
    const cacheKey = `like:${videoId}:${userId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/like?userId=${userId}`);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Check like error:', error);
      return { liked: false };
    }
  },

  // ============================================
  // Комментарии (с кэшированием)
  // ============================================
  async getComments(videoId) {
    const cacheKey = `comments:${videoId}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/comments`);
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Get comments error:', error);
      return [];
    }
  },

  async addComment(videoId, userId, content, parentId = null) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content, parentId })
      });
      const result = await res.json();
      
      // Инвалидируем кэш комментариев
      clearCache(`comments:${videoId}`);
      // Инвалидируем кэш статистики
      clearCache(`video-stats:${videoId}`);
      
      return result;
    } catch (error) {
      console.error('Add comment error:', error);
      return null;
    }
  },

  async updateComment(commentId, userId, content) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content })
      });
      const result = await res.json();
      
      // Инвалидируем кэш комментариев
      clearCache(`comments:${commentId}`);
      
      return result;
    } catch (error) {
      console.error('Update comment error:', error);
      return null;
    }
  },

  async deleteComment(commentId, userId) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const result = await res.json();
      
      // Инвалидируем кэш комментариев
      clearCache(`comments:${commentId}`);
      
      return result;
    } catch (error) {
      console.error('Delete comment error:', error);
      return null;
    }
  },

  // ============================================
  // Live маркеры (видео-экскурсии)
  // ============================================
  async getVideoDuration(videoPath) {
    try {
      const res = await fetch(`${API_URL}/videos/get-duration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath })
      });
      return res.json();
    } catch (error) {
      console.error('Get duration error:', error);
      return 0;
    }
  }
};
