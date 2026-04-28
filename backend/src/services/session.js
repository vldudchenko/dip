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
      .select('id, start_date, end_date, start_time, end_time, status')
      .in('status', ['pending_date', 'in_progress']);

    if (error) throw error;

    const updates = [];

    for (const session of sessions) {
      const sessionStartDateTime = new Date(`${session.start_date}T${session.start_time}`);
      const sessionEndDateTime = new Date(`${session.end_date || session.start_date}T${session.end_time}`);

      if (session.status === 'pending_date' && now >= sessionStartDateTime) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ status: 'in_progress' })
            .eq('id', session.id)
        );
      }

      if (session.status === 'in_progress' && now >= sessionEndDateTime) {
        updates.push(
          supabaseAdmin
            .from('route_sessions')
            .update({ status: 'completed' })
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

  async getSessionById(id) {
    await this.ensureSessionStatuses();

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

  async getSessionsByGuideId(guideId) {
    await this.ensureSessionStatuses();

    const { data, error } = await supabaseAdmin
      .from('route_sessions')
      .select(`
        *,
        route:routes (
          id,
          title,
          difficulty
        )
      `)
      .eq('guide_id', guideId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return data;
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

  async removeParticipant(sessionId, userId) {
    const { error } = await supabaseAdmin
      .from('session_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) throw error;

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
        session:route_sessions (
          id,
          route_id,
          start_date,
          end_date,
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
