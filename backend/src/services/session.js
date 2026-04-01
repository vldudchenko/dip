import { supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с прохождениями маршрутов (сессиями)
 */
class SessionService {
  /**
   * Обновляет статусы сессий на основе текущего времени
   * pending_date -> in_progress: когда наступило время начала
   * in_progress -> completed: когда прошло время окончания
   */
  async updateSessionStatuses() {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    // Получаем все активные сессии
    const { data: sessions, error } = await supabaseAdmin
      .from('route_sessions')
      .select('id, start_date, start_time, end_time, status')
      .in('status', ['pending_date', 'in_progress']);

    if (error) throw error;

    const updates = [];

    for (const session of sessions) {
      const sessionStartDateTime = new Date(`${session.start_date}T${session.start_time}`);
      const sessionEndDateTime = new Date(`${session.start_date}T${session.end_time}`);

      // Если сессия в статусе pending_date и наступило время начала
      if (session.status === 'pending_date' && now >= sessionStartDateTime) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ status: 'in_progress' })
            .eq('id', session.id)
        );
      }

      // Если сессия в статусе in_progress и прошло время окончания
      if (session.status === 'in_progress' && now >= sessionEndDateTime) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ status: 'completed' })
            .eq('id', session.id)
        );
      }
    }

    // Выполняем все обновления
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return { updated: updates.length };
  }

  /**
   * Получает все сессии для маршрута
   */
  async getSessionsByRouteId(routeId) {
    // Сначала обновляем статусы
    await this.updateSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        participants:session_participants (
          user_id,
          users:users (
            id,
            login,
            avatar
          )
        )
      `)
      .eq('route_id', routeId)
      .order('start_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Получает сессию по ID
   */
  async getSessionById(id) {
    // Сначала обновляем статусы
    await this.updateSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        participants:session_participants (
          user_id,
          joined_at,
          users:users (
            id,
            login,
            avatar
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Получает сессии по ID гида
   */
  async getSessionsByGuideId(guideId) {
    // Сначала обновляем статусы
    await this.updateSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        route:routes (
          id,
          title,
          difficulty,
          price,
          min_people,
          max_people
        )
      `)
      .eq('guide_id', guideId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Создаёт новую сессию
   */
  async createSession(sessionData) {
    const { start_date, start_time } = sessionData;

    // Определяем начальный статус
    let initialStatus = 'waiting';
    if (start_date && start_time) {
      const sessionDateTime = new Date(`${start_date}T${start_time}`);
      const now = new Date();
      const hoursUntilStart = (sessionDateTime - now) / (1000 * 60 * 60);

      // Если до начала меньше 24 часов, ставим pending_date
      if (hoursUntilStart <= 24) {
        initialStatus = 'pending_date';
      }
    }

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .insert({
        ...sessionData,
        status: initialStatus,
        participants_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Обновляет сессию
   */
  async updateSession(id, sessionData) {
    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .update(sessionData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Удаляет сессию
   */
  async deleteSession(id) {
    const { error } = await supabaseAdmin
      .from('route_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Добавляет участника в сессию
   */
  async addParticipant(sessionId, userId) {
    const { data, error } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: sessionId,
        user_id: userId
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Удаляет участника из сессии
   */
  async removeParticipant(sessionId, userId) {
    const { error } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  }

  /**
   * Проверяет, записан ли пользователь на сессию
   */
  async isUserJoined(sessionId, userId) {
    const { data, error } = await supabaseAdmin
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  }

  /**
   * Получает все сессии, на которые записан пользователь
   */
  async getUserSessions(userId) {
    // Сначала обновляем статусы
    await this.updateSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('session_participants')
      .select(`
        session:route_sessions (
          id,
          route_id,
          start_date,
          start_time,
          end_time,
          status,
          participants_count,
          route:routes (
            id,
            title,
            difficulty
          ),
          guide:users (
            id,
            login,
            avatar
          )
        )
      `)
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return data;
  }
}

export const sessionService = new SessionService();
export default sessionService;
