import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import { 
  DIFFICULTY_CLASSES, 
  DIFFICULTY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS 
} from '../utils/routeConstants';

/**
 * Страница просмотра маршрута
 */
export const RoutePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('user_id');
  
  const [route, setRoute] = useState(null);
  const [guide, setGuide] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [userJoinedSessions, setUserJoinedSessions] = useState(new Set());
  
  // Состояние для работы с сессиями
  const [showAddSession, setShowAddSession] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [newSession, setNewSession] = useState({
    start_date: '',
    start_time: '',
    end_time: ''
  });
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const routeResponse = await fetch(`${API_URL}/routes/${id}`);
        if (!routeResponse.ok) {
          throw new Error('Маршрут не найден');
        }
        const routeData = await routeResponse.json();
        setRoute(routeData);

        const guideResponse = await fetch(`${API_URL}/users/${routeData.guide_id}`);
        if (guideResponse.ok) {
          setGuide(await guideResponse.json());
        }

        const sessionsResponse = await fetch(`${API_URL}/sessions/route/${id}`);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData);

          if (currentUserId) {
            const joinedSessions = new Set();
            for (const session of sessionsData) {
              const checkResponse = await fetch(
                `${API_URL}/sessions/${session.id}/is-joined?userId=${currentUserId}`
              );
              if (checkResponse.ok) {
                const { isJoined } = await checkResponse.json();
                if (isJoined) {
                  joinedSessions.add(session.id);
                }
              }
            }
            setUserJoinedSessions(joinedSessions);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentUserId]);

  const refreshSessions = async () => {
    const sessionsResponse = await fetch(`${API_URL}/sessions/route/${id}`);
    if (sessionsResponse.ok) {
      setSessions(await sessionsResponse.json());
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
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
      refreshSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
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
      refreshSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSessionError(null);
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: id,
          guide_id: currentUserId,
          start_date: newSession.start_date,
          start_time: newSession.start_time,
          end_time: newSession.end_time
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось создать сессию');
      }

      setShowAddSession(false);
      setNewSession({ start_date: '', start_time: '', end_time: '' });
      refreshSessions();
    } catch (err) {
      setSessionError(err.message);
    }
  };

  const handleEditSession = async (e, sessionId) => {
    e.preventDefault();
    setSessionError(null);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: editingSession.start_date,
          start_time: editingSession.start_time,
          end_time: editingSession.end_time
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить сессию');
      }

      setEditingSession(null);
      refreshSessions();
    } catch (err) {
      setSessionError(err.message);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось удалить сессию');
      }

      setSessionToDelete(null);
      refreshSessions();
    } catch (err) {
      setSessionError(err.message);
    }
  };

  const startEditingSession = (session) => {
    setEditingSession({
      id: session.id,
      start_date: session.start_date,
      start_time: session.start_time.substring(0, 5),
      end_time: session.end_time.substring(0, 5)
    });
  };

  const isGuide = currentUserId === route?.guide_id;

  if (loading) {
    return <div className="route-detail-page">Загрузка...</div>;
  }

  if (error) {
    return <div className="route-detail-page">Ошибка: {error}</div>;
  }

  return (
    <div className="route-detail-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Назад
      </button>

      <div className="route-detail-content">
        <div className="route-detail-main">
          <div className="route-detail-header">
            <h1>{route.title}</h1>
            <span className={`route-detail-difficulty ${DIFFICULTY_CLASSES[route.difficulty]}`}>
              {DIFFICULTY_LABELS[route.difficulty]}
            </span>
          </div>

          {route.description && (
            <div className="route-detail-description">
              <p>{route.description}</p>
            </div>
          )}

          <div className="route-detail-info">
            <h2>Детали маршрута</h2>
            <div className="route-detail-grid">
              <div className="detail-item">
                <span className="detail-icon">💰</span>
                <div className="detail-content">
                  <span className="detail-label">Цена</span>
                  <span className="detail-value">{route.price} ₽</span>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-icon">👥</span>
                <div className="detail-content">
                  <span className="detail-label">Группа</span>
                  <span className="detail-value">
                    от {route.min_people} до {route.max_people} чел.
                  </span>
                </div>
              </div>

              <div className="detail-item">
                <span className="detail-icon">📅</span>
                <div className="detail-content">
                  <span className="detail-label">Создан</span>
                  <span className="detail-value">
                    {new Date(route.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="sessions-section">
            <div className="sessions-header">
              <h2>Прохождения маршрута</h2>
              {isGuide && (
                <button
                  className="btn btn--primary btn--small"
                  onClick={() => setShowAddSession(!showAddSession)}
                >
                  {showAddSession ? 'Отмена' : '+ Добавить прохождение'}
                </button>
              )}
            </div>

            {showAddSession && (
              <form className="add-session-form" onSubmit={handleCreateSession}>
                <div className="form-row">
                  <div className="form-col">
                    <label>Дата *</label>
                    <input
                      type="date"
                      value={newSession.start_date}
                      onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-col">
                    <label>Время начала *</label>
                    <input
                      type="time"
                      value={newSession.start_time}
                      onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Время окончания *</label>
                    <input
                      type="time"
                      value={newSession.end_time}
                      onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {sessionError && <div className="form-error">{sessionError}</div>}
                <button type="submit" className="btn btn--primary">
                  Создать прохождение
                </button>
              </form>
            )}

            {sessions.length === 0 ? (
              <p className="no-sessions">Пока нет запланированных прохождений</p>
            ) : (
              <div className="sessions-list">
                {sessions.map((session) => {
                  const isJoined = userJoinedSessions.has(session.id);
                  const isFull = session.participants_count >= route.max_people;
                  const canJoin = session.status === 'waiting' && !isFull && !isJoined;
                  const canLeave = isJoined && session.status === 'waiting';
                  
                  const isLoggedIn = currentUserId !== null;
                  const sessionDateTime = new Date(`${session.start_date}T${session.start_time}`);
                  const now = new Date();
                  const hoursUntilStart = (sessionDateTime - now) / (1000 * 60 * 60);
                  const isPast24Hours = hoursUntilStart <= 24;
                  
                  const isJoinDisabled = !isLoggedIn || isFull || session.status !== 'waiting' || !isPast24Hours;
                  const joinDisabledReason = !isLoggedIn 
                    ? 'Пользователь не авторизован'
                    : isFull 
                      ? 'Группа набрана'
                      : session.status !== 'waiting'
                        ? `Статус: ${STATUS_LABELS[session.status]}`
                        : 'Запись на прохождение возможна не позднее чем за 24 часа до начала';

                  return (
                    <div key={session.id} className="session-card">
                      <div className="session-header">
                        <div className="session-datetime">
                          <span className="session-date">
                            📅 {new Date(session.start_date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="session-time">
                            🕐 {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                          </span>
                        </div>
                        <span className={`session-status ${STATUS_CLASSES[session.status]}`}>
                          {STATUS_LABELS[session.status]}
                        </span>
                      </div>

                      <div className="session-participants-info">
                        <span>
                          👥 Записалось: {session.participants_count} / {route.max_people}
                        </span>
                        {isFull && <span className="session-full">Группа набрана</span>}
                      </div>

                      {session.participants && session.participants.length > 0 && (
                        <div className="session-participants-list">
                          <span>Участники:</span>
                          <div className="participants-avatars">
                            {session.participants.slice(0, 5).map((p, idx) => (
                              <img
                                key={idx}
                                src={p.users?.avatar || defaultAvatar}
                                alt={p.users?.login || 'User'}
                                className="participant-avatar"
                                title={p.users?.login || 'User'}
                              />
                            ))}
                            {session.participants.length > 5 && (
                              <span className="participants-more">
                                +{session.participants.length - 5}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="session-actions">
                        {isGuide ? (
                          editingSession?.id === session.id ? (
                            <form className="edit-session-form" onSubmit={(e) => handleEditSession(e, session.id)}>
                              <div className="form-row-small">
                                <div className="form-col-small">
                                  <label>Дата</label>
                                  <input
                                    type="date"
                                    value={editingSession.start_date}
                                    onChange={(e) => setEditingSession({ ...editingSession, start_date: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-col-small">
                                  <label>Начало</label>
                                  <input
                                    type="time"
                                    value={editingSession.start_time}
                                    onChange={(e) => setEditingSession({ ...editingSession, start_time: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-col-small">
                                  <label>Окончание</label>
                                  <input
                                    type="time"
                                    value={editingSession.end_time}
                                    onChange={(e) => setEditingSession({ ...editingSession, end_time: e.target.value })}
                                    required
                                  />
                                </div>
                              </div>
                              <div className="session-form-actions">
                                <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
                                <button type="button" className="btn btn--secondary btn--small" onClick={() => setEditingSession(null)}>Отмена</button>
                              </div>
                            </form>
                          ) : (
                            <div className="guide-session-actions">
                              <button
                                className="btn btn--secondary btn--small"
                                onClick={() => startEditingSession(session)}
                              >
                                ✏️ Редактировать
                              </button>
                              <button
                                className="btn btn--danger btn--small"
                                onClick={() => setSessionToDelete(session.id)}
                              >
                                🗑️ Удалить
                              </button>
                            </div>
                          )
                        ) : (
                          <>
                            {canJoin && (
                              <button
                                className="btn btn--primary"
                                onClick={() => handleJoinSession(session.id)}
                              >
                                Записаться
                              </button>
                            )}
                            {canLeave && (
                              <button
                                className="btn btn--secondary"
                                onClick={() => handleLeaveSession(session.id)}
                              >
                                Отписаться
                              </button>
                            )}
                            {isJoined && !canLeave && (
                              <span className="joined-label">✓ Вы записаны</span>
                            )}
                            {isJoinDisabled && !isJoined && (
                              <span className="join-disabled" title={joinDisabledReason}>
                                ⚠️ {joinDisabledReason}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="route-detail-sidebar">
          <div className="guide-card">
            <h3>Гид</h3>

            {guide && guide.login && (
              <>
                <Link to={`/guide/${guide.login}`} className="guide-card-link">
                  <img
                    src={avatarError || !guide?.avatar ? defaultAvatar : guide.avatar}
                    alt={guide.login}
                    className="guide-card-avatar"
                    onError={() => setAvatarError(true)}
                  />

                  <div className="guide-card-info">
                    <span className="guide-card-name">{guide.login}</span>
                    {guide.is_guide && (
                      <span className="guide-card-status">✓ Сертифицированный гид</span>
                    )}
                  </div>
                </Link>

                <div className="guide-card-actions">
                  <Link
                    to={`/guide/${guide.login}`}
                    className="btn btn--primary btn--full"
                  >
                    Профиль гида
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="route-action-card">
            <h3>Заинтересовал маршрут?</h3>
            <p className="route-action-text">
              Запишитесь на прохождение или свяжитесь с гидом
            </p>
            {guide && guide.email && (
              <a
                href={`mailto:${guide.email}`}
                className="btn btn--secondary btn--full"
              >
                ✉️ Написать гиду
              </a>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Удаление прохождения"
        message="Вы уверены, что хотите удалить это прохождение?"
        confirmLabel="Удалить"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};

export default RoutePage;
