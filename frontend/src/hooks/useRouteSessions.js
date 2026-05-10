import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/constants';

/**
 * Хук для управления сессиями маршрута: получение списка, запись, CRUD
 */
export const useRouteSessions = (routeId, currentUserId) => {
  const [sessions, setSessions] = useState([]);
  const [userJoinedSessions, setUserJoinedSessions] = useState(new Set());
  const [sessionGuides, setSessionGuides] = useState({});
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch(`${API_URL}/sessions/route/${routeId}`);
      if (response.ok) {
        const sessionsData = await response.json();
        setSessions(sessionsData);

        if (currentUserId) {
          const joinedSessions = new Set();
          await Promise.all(sessionsData.map(async (session) => {
            const checkResponse = await fetch(
              `${API_URL}/sessions/${session.id}/is-joined?userId=${currentUserId}`
            );
            if (checkResponse.ok) {
              const { isJoined } = await checkResponse.json();
              if (isJoined) joinedSessions.add(session.id);
            }
          }));
          setUserJoinedSessions(joinedSessions);
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [routeId, currentUserId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Предзагрузка данных гидов для сессий
  useEffect(() => {
    const fetchGuides = async () => {
      const guideIds = [...new Set(sessions.map(s => s.guide_id))];
      const newGuides = { ...sessionGuides };
      let changed = false;

      await Promise.all(guideIds.map(async (gid) => {
        if (!newGuides[gid]) {
          try {
            const response = await fetch(`${API_URL}/users/${gid}`);
            if (response.ok) {
              newGuides[gid] = await response.json();
              changed = true;
            }
          } catch (err) {
            console.error('Error pre-fetching guide:', err);
          }
        }
      }));
      if (changed) setSessionGuides(newGuides);
    };
    if (sessions.length > 0) fetchGuides();
  }, [sessions]);

  const joinSession = useCallback(async (sessionId) => {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось записаться на сессию');
    }

    setUserJoinedSessions(prev => new Set([...prev, sessionId]));
    await fetchSessions();
  }, [currentUserId, fetchSessions]);

  const leaveSession = useCallback(async (sessionId) => {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/leave`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось отписаться от сессии');
    }

    setUserJoinedSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
    await fetchSessions();
  }, [currentUserId, fetchSessions]);

  const updateSession = useCallback(async (sessionId, data) => {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId 
      },
      body: JSON.stringify({ ...data, userId: currentUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось обновить сессию');
    }

    await fetchSessions();
  }, [currentUserId, fetchSessions]);

  const deleteSession = useCallback(async (sessionId) => {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId 
      },
      body: JSON.stringify({ userId: currentUserId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось удалить сессию');
    }

    await fetchSessions();
  }, [currentUserId, fetchSessions]);

  return {
    sessions,
    userJoinedSessions,
    sessionGuides,
    loadingSessions,
    joinSession,
    leaveSession,
    updateSession,
    deleteSession,
    refreshSessions: fetchSessions
  };
};
