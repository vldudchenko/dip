import { supabaseAdmin } from '../db/supabase.js';

// Helper for distance calculation (Haversine formula)
const calculateTotalDistance = (pathData) => {
  if (!pathData || !Array.isArray(pathData) || pathData.length < 2) return 0;
  
  const R = 6371; // km
  let dist = 0;
  
  // Normalize points to [lon, lat] format
  const normalized = pathData.map(p => {
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object' && p.coords) return p.coords;
    if (p && typeof p === 'object' && p.lat !== undefined && (p.lng !== undefined || p.lon !== undefined)) {
      return [p.lng || p.lon, p.lat];
    }
    return null;
  }).filter(Boolean);

  if (normalized.length < 2) return 0;

  for (let i = 1; i < normalized.length; i++) {
    const [lon1, lat1] = normalized[i - 1];
    const [lon2, lat2] = normalized[i];

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    dist += R * c;
  }
  return dist;
};

// Helper for duration calculation (in minutes)
const calculateTotalDuration = (pathData) => {
  if (!pathData || !Array.isArray(pathData) || pathData.length < 2) return 0;
  
  let totalMinutes = 0;
  const speeds = { 
    'walking': 5, 
    'cycling': 15, 
    'driving': 40, 
    'bus': 30, 
    'train': 60, 
    'boat': 15 
  };
  
  for (let i = 1; i < pathData.length; i++) {
    const p1 = pathData[i - 1];
    const p2 = pathData[i];
    
    const dist = calculateTotalDistance([p1, p2]);
    const transport = (pathData[i] && pathData[i].transport) || 'walking';
    const speed = speeds[transport] || 5;
    totalMinutes += (dist / speed) * 60;
  }
  return Math.round(totalMinutes);
};

/**
 * Сервис для работы с маршрутами
 */
class RoutesService {
  async _attachStats(routes) {
    if (!routes || routes.length === 0) return [];

    const routeIds = routes.map(r => r.id);

    // 1. Получаем количество завершенных сессий и их длительность
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('route_sessions')
      .select('route_id, start_date, end_date, start_time, end_time')
      .in('route_id', routeIds)
      .eq('status', 'completed');

    if (sessionsError) throw sessionsError;

    // 2. Получаем количество активных сессий (набор открыт)
    const { data: activeSessions, error: activeSessionsError } = await supabaseAdmin
      .from('route_sessions')
      .select('route_id, participants_count, max_people')
      .in('route_id', routeIds)
      .eq('status', 'waiting');

    if (activeSessionsError) throw activeSessionsError;

    // Группируем завершенные сессии и считаем среднюю длительность
    const sessionStats = sessions.reduce((acc, s) => {
      const start = new Date(`${s.start_date}T${s.start_time}`);
      const end = new Date(`${s.end_date || s.start_date}T${s.end_time}`);
      const durationMin = (end - start) / (1000 * 60);
      
      if (!acc[s.route_id]) {
        acc[s.route_id] = { count: 0, totalDuration: 0 };
      }
      if (durationMin > 0) {
        acc[s.route_id].count += 1;
        acc[s.route_id].totalDuration += durationMin;
      }
      return acc;
    }, {});

    // Группируем сессии со статусом "Ожидает набора"
    const activeSessionCounts = activeSessions.reduce((acc, s) => {
      acc[s.route_id] = (acc[s.route_id] || 0) + 1;
      return acc;
    }, {});

    // 3. Получаем количество видео
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('route_id')
      .in('route_id', routeIds);

    if (videosError) throw videosError;

    const videoCounts = videos.reduce((acc, v) => {
      acc[v.route_id] = (acc[v.route_id] || 0) + 1;
      return acc;
    }, {});

    // Обогащаем маршруты данными
    return routes.map(route => {
      const stats = sessionStats[route.id] || { count: 0, totalDuration: 0 };
      const avgDur = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : null;
      
      return {
        ...route,
        completed_sessions_count: stats.count,
        active_sessions_count: activeSessionCounts[route.id] || 0,
        video_count: videoCounts[route.id] || 0,
        average_session_duration: avgDur,
        calculatedDistance: calculateTotalDistance(route.path_data),
        calculatedDuration: calculateTotalDuration(route.path_data)
      };
    });
  }

  async getAllRoutes() {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Ожидаем завершения обогащения статистики
    return await this._attachStats(data);
  }

  async getRouteById(id) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    
    const enriched = await this._attachStats([data]);
    return enriched[0];
  }

  /**
   * Расширенный поиск маршрутов с фильтрацией
   */
  async searchRoutes(filters) {
    let query = supabaseAdmin.from('routes').select('*');

    // Базовые фильтры на уровне БД (если применимо)
    if (filters.guideId && filters.guideId !== 'all') {
      query = query.eq('guide_id', filters.guideId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const routesWithStats = await this._attachStats(data);
    let result = routesWithStats;

    // 1. Поиск по тексту (название, описание)
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) || 
        (r.description && r.description.toLowerCase().includes(q))
      );
    }

    // 2. Фильтр по транспорту
    if (filters.transports && filters.transports.length > 0) {
      result = result.filter(r => {
        // Если пути нет, считаем, что маршрут подходит под любой транспорт (или по умолчанию walking)
        if (!r.path_data || !Array.isArray(r.path_data) || r.path_data.length === 0) return true;
        
        const routeTransports = [...new Set(r.path_data.map(p => p.transport || 'walking'))];
        return routeTransports.some(t => filters.transports.includes(t));
      });
    }

    // 3. Фильтр по дистанции
    if (filters.minDist !== undefined) {
      result = result.filter(r => r.calculatedDistance >= filters.minDist);
    }
    if (filters.maxDist !== undefined) {
      result = result.filter(r => r.calculatedDistance <= filters.maxDist);
    }

    // 4. Фильтр по длительности
    if (filters.minDuration !== undefined) {
      result = result.filter(r => r.calculatedDuration >= filters.minDuration);
    }
    if (filters.maxDuration !== undefined) {
      result = result.filter(r => r.calculatedDuration <= filters.maxDuration);
    }

    // 5. Фильтр "Только активные"
    if (filters.onlyActive) {
      result = result.filter(r => (r.active_sessions_count || 0) > 0);
    }

    // 6. Фильтр "Только с путем"
    if (filters.onlyWithPaths) {
      result = result.filter(r => r.calculatedDistance > 0);
    }

    // Сортировка
    if (filters.sortBy) {
      result.sort((a, b) => {
        switch (filters.sortBy) {
          case 'newest': return new Date(b.created_at) - new Date(a.created_at);
          case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
          case 'popular': return (b.completed_sessions_count || 0) - (a.completed_sessions_count || 0);
          case 'videos': return (b.video_count || 0) - (a.video_count || 0);
          default: return 0;
        }
      });
    }

    return result;
  }

  /**
   * Получение статистики отдельного маршрута
   */
  async getRouteStats(id) {
    const route = await this.getRouteById(id);
    if (!route) throw new Error('Маршрут не найден');

    const { count: viewCount } = await supabaseAdmin
      .from('route_views')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', id);

    return {
      completedSessionsCount: route.completed_sessions_count || 0,
      completed_sessions: route.completed_sessions_count || 0, // frontend compatibility
      activeSessionsCount: route.active_sessions_count || 0,
      videoCount: route.video_count || 0,
      averageSessionDuration: route.average_session_duration || null,
      calculatedDistance: route.calculatedDistance || 0,
      calculatedDuration: route.calculatedDuration || 0,
      viewCount: viewCount || 0,
      views: viewCount || 0 // frontend compatibility
    };
  }

  /**
   * Регистрация уникального просмотра маршрута
   */
  async addView(routeId, userId) {
    if (!userId) return { viewed: false };

    // Проверяем, не смотрел ли уже
    const { data: existing } = await supabaseAdmin
      .from('route_views')
      .select('id')
      .eq('route_id', routeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return { viewed: false, alreadyViewed: true };

    const { error } = await supabaseAdmin
      .from('route_views')
      .insert({ route_id: routeId, user_id: userId });

    if (error) throw error;

    return { viewed: true };
  }

  /**
   * Получение маршрутов конкретного гида
   */
  async getRoutesByGuideId(guideId) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return await this._attachStats(data || []);
  }

  /**
   * Создание маршрута
   */
  async createRoute(data) {
    const { data: route, error } = await supabaseAdmin
      .from('routes')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return route;
  }

  /**
   * Обновление маршрута
   */
  async updateRoute(id, data) {
    const { data: route, error } = await supabaseAdmin
      .from('routes')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return route;
  }

  /**
   * Удаление маршрута
   */
  async deleteRoute(id) {
    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}

export const routesService = new RoutesService();
export default routesService;
