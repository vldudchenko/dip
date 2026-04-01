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
}

export const routesService = new RoutesService();
export default routesService;
