import { supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с маршрутами
 */
class RoutesService {
  /**
   * Получает все маршруты
   */
  async getAllRoutes() {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Получает маршруты по ID гида
   */
  async getRoutesByGuideId(guideId) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('guide_id', guideId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Получает маршрут по ID
   */
  async getRouteById(id) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Создает новый маршрут
   */
  async createRoute(routeData) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .insert(routeData)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Обновляет маршрут
   */
  async updateRoute(id, routeData) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .update(routeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Удаляет маршрут
   */
  async deleteRoute(id) {
    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Получает статистику маршрута
   */
  async getRouteStats(id) {
    // Получаем количество просмотров
    const { count: viewsCount, error: viewsError } = await supabaseAdmin
      .from('route_views')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', id);

    if (viewsError) throw viewsError;

    // Получаем количество завершенных сессий
    const { count: completedSessionsCount, error: sessionsError } = await supabaseAdmin
      .from('route_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('route_id', id)
      .eq('status', 'completed');

    if (sessionsError) throw sessionsError;

    return {
      views: viewsCount || 0,
      completed_sessions: completedSessionsCount || 0
    };
  }

  /**
   * Добавляет уникальный просмотр маршрута (уникальный по user_id)
   */
  async addView(routeId, userId) {
    // В Supabase/Postgres при нарушении UNIQUE-ограничения может быть ошибка, если не сделать upsert.
    // Если пользователь уже смотрел маршрут, просто игнорируем ошибку (т.к. UNIQUE constraint в БД)
    const { data, error } = await supabaseAdmin
      .from('route_views')
      .insert({ route_id: routeId, user_id: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // уникальное нарушение
        return { success: true, newView: false };
      }
      throw error;
    }

    return { success: true, newView: true, data };
  }
  /**
   * Поиск маршрутов по названию или описанию
   */
  async searchRoutes(query) {
    const { data, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }
}

export const routesService = new RoutesService();
export default routesService;
