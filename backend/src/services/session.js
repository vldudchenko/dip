import { supabaseAdmin } from '../db/supabase.js';

let lastStatusUpdate = 0;
const STATUS_UPDATE_INTERVAL = 60000;

const shouldUpdateStatuses = () => Date.now() - lastStatusUpdate > STATUS_UPDATE_INTERVAL;

class SessionService {
  async ensureSessionStatuses() {
    if (shouldUpdateStatuses()) {
      await this.updateSessionStatuses();
      lastStatusUpdate = Date.now();
    }
  }

  async updateSessionStatuses() {
    const now = new Date();

    const { data: sessions, error } = await supabaseAdmin
      .from('route_sessions')
      .select('id, start_date, end_date, start_time, end_time, status, participants_count, min_people, max_people, guide_id')
      .not('status', 'in', '("completed","cancelled")');

    if (error) throw error;

    const updates = [];

    for (const session of sessions) {
      const sessionStartDateTime = new Date(`${session.start_date}T${session.start_time}`);
      const sessionEndDateTime = new Date(`${session.end_date || session.start_date}T${session.end_time}`);

      let newStatus = session.status;

      if (now < sessionStartDateTime) {
        // До начала прохождения
        if (session.max_people && session.participants_count >= session.max_people) {
          newStatus = 'pending_date';
        } else {
          newStatus = 'waiting';
        }
      } else if (now >= sessionStartDateTime && now < sessionEndDateTime) {
        // Во время прохождения
        if (session.participants_count >= session.min_people) {
          newStatus = 'in_progress';
        } else {
          newStatus = 'cancelled';
        }
      } else if (now >= sessionEndDateTime) {
        // После окончания прохождения
        if (session.status === 'in_progress' || session.participants_count >= session.min_people) {
          newStatus = 'completed';
        } else {
          newStatus = 'cancelled';
        }
      }

      if (newStatus !== session.status) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', session.id)
        );
      }

      // Дополнительно: проверяем и исправляем participants_count если нужно
      // Это поможет исправить существующие неточности (например, если гид был в списке)
      const { data: realParticipants } = await supabaseAdmin
        .from('session_participants')
        .select('user_id')
        .eq('session_id', session.id);

      const realCount = (realParticipants || []).filter(p => p.user_id !== session.guide_id).length;
      if (realCount !== session.participants_count) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ participants_count: realCount })
            .eq('id', session.id)
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return { updated: updates.length };
  }

  async getSessionsByRouteId(routeId) {
    await this.ensureSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        session_participants (
          user_id,
          users (
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

    return (data || []).map(s => {
      const participants = (s.session_participants || [])
        .filter(p => p.user_id !== s.guide_id)
        .map(p => ({
          ...(p.users || {}),
          user_id: p.user_id
        }));
      return {
        ...s,
        participants,
        participants_count: participants.length
      };
    });
  }

  async getSessionById(id) {
    await this.ensureSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        session_participants (
          user_id,
          joined_at,
          users (
            id,
            login,
            avatar
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    const participants = (data.session_participants || [])
      .filter(p => p.user_id !== data.guide_id)
      .map(p => ({
        ...(p.users || {}),
        user_id: p.user_id
      }));
    return {
      ...data,
      participants,
      participants_count: participants.length
    };
  }

  async getSessionsByGuideId(guideId) {
    await this.ensureSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        route:routes (
          id,
          title
        ),
        session_participants (
          user_id,
          users (
            id,
            login,
            avatar
          )
        )
      `)
      .eq('guide_id', guideId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(s => {
      const participants = (s.session_participants || [])
        .filter(p => p.user_id !== s.guide_id)
        .map(p => ({
          ...(p.users || {}),
          user_id: p.user_id
        }));
      return {
        ...s,
        participants,
        participants_count: participants.length
      };
    });
  }

  async createSession(sessionData) {
    const { start_date, start_time } = sessionData;

    let initialStatus = 'waiting';
    if (start_date && start_time) {
      const sessionDateTime = new Date(`${start_date}T${start_time}`);
      const now = new Date();
      const hoursUntilStart = (sessionDateTime - now) / (1000 * 60 * 60);

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

  async deleteSession(id) {
    const { error } = await supabaseAdmin
      .from('route_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  }

  async addParticipant(sessionId, userId) {
    // Получаем информацию о сессии для проверки guide_id
    const { data: sessionInfo } = await supabaseAdmin
      .from('route_sessions')
      .select('guide_id')
      .eq('id', sessionId)
      .single();

    const { data, error } = await supabaseAdmin
      .from('session_participants')
      .insert({
        session_id: sessionId,
        user_id: userId
      })
      .select('id')
      .single();

    if (error) throw error;

    // Обновляем счетчик участников только если это НЕ гид
    if (sessionInfo && userId !== sessionInfo.guide_id) {
      const { error: updateError } = await supabaseAdmin.rpc('increment_participants', {
        session_id: sessionId
      });

      if (updateError) {
        const { data: session } = await supabaseAdmin
          .from('route_sessions')
          .select('participants_count')
          .eq('id', sessionId)
          .single();

        await supabaseAdmin
          .from('route_sessions')
          .update({ participants_count: (session?.participants_count || 0) + 1 })
          .eq('id', sessionId);
      }
    }

    // Сразу проверяем статусы
    await this.updateSessionStatuses();

    return data;
  }

  async removeParticipant(sessionId, userId) {
    // Получаем информацию о сессии для проверки guide_id
    const { data: sessionInfo } = await supabaseAdmin
      .from('route_sessions')
      .select('guide_id')
      .eq('id', sessionId)
      .single();

    const { error } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

    // Обновляем счетчик только если это НЕ гид
    if (sessionInfo && userId !== sessionInfo.guide_id) {
      const { error: updateError } = await supabaseAdmin.rpc('decrement_participants', {
        session_id: sessionId
      });

      if (updateError) {
        const { data: session } = await supabaseAdmin
          .from('route_sessions')
          .select('participants_count')
          .eq('id', sessionId)
          .single();

        await supabaseAdmin
          .from('route_sessions')
          .update({ participants_count: Math.max(0, (session?.participants_count || 0) - 1) })
          .eq('id', sessionId);
      }
    }

    // Сразу проверяем статусы
    await this.updateSessionStatuses();

    return { success: true };
  }

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

  async getUserSessions(userId) {
    await this.ensureSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('session_participants')
      .select(`
        session:route_sessions!inner (
          id,
          route_id,
          start_date,
          end_date,
          start_time,
          end_time,
          status,
          price,
          min_people,
          max_people,
          participants_count,
          route:routes (
            id,
            title,
            path_data
          ),
          guide:users (
            id,
            login,
            avatar
          ),
          session_participants (
            user_id,
            users (
              id,
              login,
              avatar
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('start_date', { foreignTable: 'session', ascending: false });

    if (error) throw error;

    return (data || []).map(item => {
      const s = item.session;
      const participants = (s.session_participants || [])
        .filter(p => p.user_id !== s.guide_id)
        .map(p => ({
          ...(p.users || {}),
          user_id: p.user_id
        }));
      return {
        ...item,
        session: {
          ...s,
          participants,
          participants_count: participants.length
        }
      };
    });
  }
}

export const sessionService = new SessionService();
export default sessionService;
