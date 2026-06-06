import { supabaseAnon, supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с видео (CRUD операции)
 */
class VideoService {
  /**
   * Получает все видео с фильтрацией по радиусу
   */
  async getAllVideos(filters = {}) {
    const { latitude, longitude, radius, routeId, status = 'ready' } = filters;

    let query = supabaseAnon
      .from('videos')
      .select(`
        *,
        users (
          login,
          avatar
        ),
        views!left (count)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (routeId) {
      query = query.eq('route_id', routeId);
    }

    // Если переданы координаты, используем нашу новую RPC функцию
    if (latitude && longitude && radius) {
      const radiusDeg = parseFloat(radius) / 111; // Примерный перевод км в градусы
      const { data, error } = await supabaseAnon.rpc('get_videos_in_radius', {
        p_lat: parseFloat(latitude),
        p_lng: parseFloat(longitude),
        p_radius_deg: radiusDeg,
        p_route_id: routeId || null
      });

      if (error) throw error;
      
      // Форматируем ответ под ожидаемую фронтендом структуру
      return (data || []).map(v => ({
        ...v,
        users: { login: v.user_login, avatar: v.user_avatar },
        views: [{ count: v.view_count }]
      }));
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Получает кластеризованные видео для карты
   */
  async getClusters(filters = {}) {
    const { bounds, zoom } = filters;
    if (!bounds || zoom == null) return [];

    // bounds: { _southWest: { lat, lng }, _northEast: { lat, lng } }
    const minLat = bounds._southWest.lat;
    const minLng = bounds._southWest.lng;
    const maxLat = bounds._northEast.lat;
    const maxLng = bounds._northEast.lng;

    const { data, error } = await supabaseAnon
      .rpc('get_video_clusters', {
        min_lat: minLat,
        min_lng: minLng,
        max_lat: maxLat,
        max_lng: maxLng,
        zoom_level: zoom
      });

    if (error) throw error;
    return data || [];
  }

  /**
   * Получает видео по ID
   */
  async getVideoById(id) {
    const { data, error } = await supabaseAnon
      .from('videos')
      .select(`
        *,
        users (
          login,
          avatar
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Получает статистику видео
   */
  async getVideoStats(id) {
    const { data, error } = await supabaseAnon
      .rpc('get_video_stats', { p_video_id: id })
      .single();

    if (error) throw error;

    return {
      viewCount: Number(data.view_count) || 0,
      likeCount: Number(data.like_count) || 0,
      commentCount: Number(data.comment_count) || 0
    };
  }

  /**
   * Добавляет просмотр видео
   */
  async addView(id, userId) {
    if (!userId) {
      return { success: false, viewed: false, message: 'Требуется авторизация' };
    }

    const { data, error } = await supabaseAdmin
      .rpc('add_view', { p_video_id: id, p_user_id: userId })
      .single();

    if (error) throw error;

    return {
      success: data.success,
      viewed: data.success,
      message: data.message
    };
  }

  /**
   * Управляет лайками (добавление/удаление)
   */
  async toggleLike(id, userId) {
    // Проверяем существующий лайк
    const { data: existingLike, error: likeError } = await supabaseAnon
      .from('likes')
      .select('id')
      .eq('video_id', id)
      .eq('user_id', userId)
      .single();

    if (likeError && likeError.code !== 'PGRST116') {
      throw likeError;
    }

    if (existingLike) {
      // Удаляем лайк
      const { error: deleteError } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) throw deleteError;

      return { success: true, liked: false, message: 'Лайк удалён' };
    } else {
      // Добавляем лайк
      const { data: newLike, error: insertError } = await supabaseAdmin
        .from('likes')
        .insert({ video_id: id, user_id: userId })
        .select()
        .single();

      if (insertError) throw insertError;

      return { success: true, liked: true, message: 'Лайк поставлен' };
    }
  }

  /**
   * Проверяет наличие лайка у пользователя
   */
  async checkLike(id, userId) {
    if (!userId) {
      return { liked: false };
    }
    
    const { data, error } = await supabaseAnon
      .from('likes')
      .select('id')
      .eq('video_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { liked: !!data };
  }

  /**
   * Расчитывает расстояние между двумя точками (формула гаверсинуса)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export const videoService = new VideoService();
export default videoService;
