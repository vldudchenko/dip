import { API_URL, DEFAULT_RADIUS } from '../utils/constants';
import { getFromCache, setCache, clearCache } from '../utils/cache';

// Глобальный перехватчик fetch для работы с httpOnly-куками
// JWT-токен передаётся автоматически браузером через куку — не трогаем localStorage
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  
  if (typeof resource === 'string' && resource.startsWith(API_URL)) {
    config = config || {};
    // Отправляем куки (JWT httpOnly-кука) при каждом запросе к нашему API
    config.credentials = 'include';
  }
  
  return originalFetch(resource, config);
};

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
  async fetchUser(userId, forceRefresh = false) {
    if (!userId || userId === 'undefined') return null;
    const cacheKey = `user:${userId}`;
    if (forceRefresh) {
      clearCache(cacheKey);
    } else {
      const cached = getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const res = await fetch(`${API_URL}/users/${userId}`);
      if (!res.ok) {
        clearCache(cacheKey);
        return null;
      }
      const data = await res.json();
      setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Fetch user error:', error);
      return null;
    }
  },

  async fetchVideos(lat, lng, radius, routeId) {
    // Используем радиус из запроса или default из конфига
    const searchRadius = radius != null ? radius : APP_CONFIG.DEFAULT_RADIUS;
    
    // Кэшируем только запросы с координатами
    const cacheKey = lat != null && lng != null 
      ? `videos:${lat.toFixed(4)}:${lng.toFixed(4)}:${searchRadius}` 
      : routeId 
        ? `videos:route:${routeId}`
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
      if (routeId) {
        url.searchParams.set('routeId', routeId);
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

  async uploadVideo(videoFile, userId, latitude, longitude, isLive = false, routeData = null, videoDuration = 0, routeId = null) {
    try {
      // 1. Получаем Signed URL от нашего бэкенда
      const ext = videoFile.name.split('.').pop();
      const uniqueName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const urlRes = await fetch(`${API_URL}/videos/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: uniqueName })
      });
      const urlData = await urlRes.json();
      
      if (!urlData.success || !urlData.signedUrl) {
        throw new Error('Не удалось получить Signed URL');
      }

      // 2. Прямая загрузка файла в Supabase (Storage)
      const uploadRes = await fetch(urlData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoFile.type || 'video/mp4'
        },
        body: videoFile
      });

      if (!uploadRes.ok) {
        throw new Error('Ошибка при загрузке файла в хранилище');
      }

      // Путь к файлу в бакете (используем path, который вернул Supabase)
      const filePath = urlData.path;

      // 3. Подтверждаем загрузку на бэкенде
      const confirmData = {
        userId,
        latitude,
        longitude,
        isLive,
        routeId,
        filePath,
        originalName: videoFile.name,
      };

      if (isLive && routeData) {
        confirmData.routeStart = JSON.stringify(routeData.routeStart);
        confirmData.routeEnd = JSON.stringify(routeData.routeEnd);
        confirmData.routeGeometry = JSON.stringify(routeData.routeGeometry);
        confirmData.videoDuration = videoDuration;
      }

      const res = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(confirmData)
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

  async deleteVideo(videoId) {
    try {
      const res = await fetch(`${API_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
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
        body: JSON.stringify({ userId: userId || null })
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
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      
      // Обновляем кэш лайка и инвалидируем статистику
      if (userId) setCache(`like:${videoId}:${userId}`, { liked: result.liked });
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
        body: JSON.stringify({ content, parentId: parentId || null })
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

  async updateComment(commentId, videoId, content) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const result = await res.json();
      
      // Инвалидируем кэш комментариев по videoId (именно по нему хранится кэш)
      if (videoId) clearCache(`comments:${videoId}`);
      
      return result;
    } catch (error) {
      console.error('Update comment error:', error);
      return null;
    }
  },

  async deleteComment(commentId, videoId) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      
      // Инвалидируем кэш комментариев по videoId (именно по нему хранится кэш)
      if (videoId) clearCache(`comments:${videoId}`);
      
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
  },
  // ============================================
  // Поиск
  // ============================================
  async fetchRoutes() {
    try {
      const res = await fetch(`${API_URL}/routes`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Fetch routes error:', error);
      return [];
    }
  },

  async searchRoutes(filters) {
    try {
      if (!filters) return this.fetchRoutes();
      
      let queryStr = '';
      if (typeof filters === 'string') {
        if (!filters) return this.fetchRoutes();
        queryStr = `query=${encodeURIComponent(filters)}`;
      } else {
        const params = new URLSearchParams();
        if (filters.searchQuery) params.set('query', filters.searchQuery);
        if (filters.selectedGuide && filters.selectedGuide !== 'all') params.set('guideId', filters.selectedGuide);
        
        // Маппинг массивов в параметры, которые ожидает бэкенд
        if (filters.useDistance && filters.distance && Array.isArray(filters.distance)) {
          params.set('minDist', filters.distance[0]);
          params.set('maxDist', filters.distance[1]);
        }
        
        if (filters.useDuration && filters.duration && Array.isArray(filters.duration)) {
          params.set('minDuration', filters.duration[0]);
          params.set('maxDuration', filters.duration[1]);
        }
        
        if (filters.onlyActive) params.set('onlyActive', 'true');
        if (filters.onlyWithPaths) params.set('onlyWithPaths', 'true');
        if (filters.sortBy) params.set('sortBy', filters.sortBy);
        
        if (filters.transports && Array.isArray(filters.transports) && filters.transports.length > 0) {
          params.set('transports', filters.transports.join(','));
        }
        
        queryStr = params.toString();
      }
      
      const res = await fetch(`${API_URL}/routes/search/all?${queryStr}`);
      if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
      
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Search routes error:', error);
      // При ошибке возвращаем пустой список, чтобы не ломать UI
      return [];
    }
  },

  // ============================================
  // Сессии
  // ============================================
  async fetchUserSessions(userId) {
    try {
      const res = await fetch(`${API_URL}/sessions/user/${userId}`);
      const data = await res.json();
      // Распаковываем вложенную структуру { session: { ... } }
      return Array.isArray(data) ? data.map(item => item.session).filter(Boolean) : [];
    } catch (error) {
      console.error('Fetch user sessions error:', error);
      return [];
    }
  },

  async fetchGuideSessions(guideId) {
    try {
      const res = await fetch(`${API_URL}/sessions/guide/${guideId}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Fetch guide sessions error:', error);
      return [];
    }
  }
};
