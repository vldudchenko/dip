import { supabaseAnon, supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с видео (CRUD операции)
 */
class VideoService {
  /**
   * Получает все видео с фильтрацией по радиусу
   */
  async getAllVideos(filters = {}) {
    const { latitude, longitude, radius } = filters;

    let query = supabaseAnon
      .from('videos')
      .select(`
        *,
        users (
          login,
          avatar
        )
      `)
      .order('created_at', { ascending: false });

    // Базовая фильтрация по координатам (приблизительная)
    if (latitude && longitude && radius) {
      const searchRadius = parseFloat(radius) / 111;
      query = query
        .gte('latitude', parseFloat(latitude) - searchRadius)
        .lte('latitude', parseFloat(latitude) + searchRadius)
        .gte('longitude', parseFloat(longitude) - searchRadius)
        .lte('longitude', parseFloat(longitude) + searchRadius);
    }

    const { data, error } = await query;

    if (error) throw error;

    let result = data || [];

    // Точная фильтрация по радиусу (формула гаверсинуса)
    if (latitude && longitude && radius) {
      const radiusMeters = parseFloat(radius) * 1000;
      result = result.filter(video => {
        if (video.latitude == null || video.longitude == null) return false;

        const distance = this.calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(video.latitude),
          parseFloat(video.longitude)
        );

        return distance <= radiusMeters;
      });
    }

    return result;
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
    const { data, error } = await supabaseAnon
      .from('likes')
      .select('id')
      .eq('video_id', id)
      .eq('user_id', userId)
      .single();

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
