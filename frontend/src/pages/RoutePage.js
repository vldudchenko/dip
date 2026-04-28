import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  DIFFICULTY_CLASSES,
  DIFFICULTY_LABELS,
  STATUS_CLASSES,
  STATUS_LABELS,
  TRANSPORT_MAP,
  STOP_TYPE_MAP
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
  const [routeVideos, setRouteVideos] = useState([]);
  const [routeImages, setRouteImages] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);

  // Состояние для работы с сессиями
  const [showAddSession, setShowAddSession] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [newSession, setNewSession] = useState({
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    price: '',
    min_people: '',
    max_people: ''
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

          // Загрузка медиа
          refreshMedia();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const refreshMedia = async () => {
      try {
        setMediaLoading(true);
        const videosResp = await fetch(`${API_URL}/videos?routeId=${id}`);
        if (videosResp.ok) setRouteVideos(await videosResp.json());

        const imagesResp = await fetch(`${API_URL}/images/route/${id}`);
        if (imagesResp.ok) setRouteImages(await imagesResp.json());
      } catch (err) {
        console.error('Error fetching media:', err);
      } finally {
        setMediaLoading(false);
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
          end_date: newSession.end_date || newSession.start_date,
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          price: Number(newSession.price),
          min_people: Number(newSession.min_people),
          max_people: Number(newSession.max_people)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось создать сессию');
      }

      setShowAddSession(false);
      setNewSession({ start_date: '', end_date: '', start_time: '', end_time: '', price: '', min_people: '', max_people: '' });
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
          end_date: editingSession.end_date || editingSession.start_date,
          start_time: editingSession.start_time,
          end_time: editingSession.end_time,
          price: Number(editingSession.price),
          min_people: Number(editingSession.min_people),
          max_people: Number(editingSession.max_people)
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
      end_date: session.end_date || session.start_date,
      start_time: session.start_time.substring(0, 5),
      end_time: session.end_time.substring(0, 5),
      price: session.price,
      min_people: session.min_people,
      max_people: session.max_people
    });
  };



  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      setMediaLoading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', currentUserId);
      formData.append('routeId', id);

      const response = await fetch(`${API_URL}/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить изображение');
      }

      // Обновляем список изображений
      const imagesResp = await fetch(`${API_URL}/images/route/${id}`);
      if (imagesResp.ok) setRouteImages(await imagesResp.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    try {
      const response = await fetch(`${API_URL}/images/${imageToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Не удалось удалить изображение');
      setRouteImages(prev => prev.filter(img => img.id !== imageToDelete.id));
      setImageToDelete(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    try {
      const response = await fetch(`${API_URL}/videos/${videoToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Не удалось удалить видео');
      setRouteVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
      setVideoToDelete(null);
    } catch (err) {
      alert(err.message);
    }
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
              <p>{new Date(route.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
          )}
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
                    <label>Дата начала *</label>
                    <input
                      type="date"
                      value={newSession.start_date}
                      onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value, end_date: newSession.end_date < e.target.value ? e.target.value : newSession.end_date })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="form-col">
                    <label>Дата окончания *</label>
                    <input
                      type="date"
                      value={newSession.end_date}
                      onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
                      required
                      min={newSession.start_date || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="form-row">
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
                <div className="form-row">
                  <div className="form-col">
                    <label>Цена (₽) *</label>
                    <input
                      type="number"
                      value={newSession.price}
                      onChange={(e) => setNewSession({ ...newSession, price: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-col">
                    <label>Мин. человек *</label>
                    <input
                      type="number"
                      value={newSession.min_people}
                      onChange={(e) => setNewSession({ ...newSession, min_people: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-col">
                    <label>Макс. человек *</label>
                    <input
                      type="number"
                      value={newSession.max_people}
                      onChange={(e) => setNewSession({ ...newSession, max_people: e.target.value })}
                      required
                      min="1"
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
                  const isFull = session.participants_count >= session.max_people;
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
                            {session.end_date && session.end_date !== session.start_date && (
                              <> — {new Date(session.end_date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}</>
                            )}
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
                        <span className="session-price" style={{ marginRight: '1rem', fontWeight: 'bold' }}>
                          💰 Цена: {session.price} ₽
                        </span>
                        <span>
                          👥 Записалось: {session.participants_count} / {session.max_people}
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
                                  <label>Дата начала</label>
                                  <input
                                    type="date"
                                    value={editingSession.start_date}
                                    onChange={(e) => setEditingSession({ ...editingSession, start_date: e.target.value, end_date: editingSession.end_date < e.target.value ? e.target.value : editingSession.end_date })}
                                    required
                                  />
                                </div>
                                <div className="form-col-small">
                                  <label>Дата окончания</label>
                                  <input
                                    type="date"
                                    value={editingSession.end_date}
                                    onChange={(e) => setEditingSession({ ...editingSession, end_date: e.target.value })}
                                    required
                                    min={editingSession.start_date}
                                  />
                                </div>
                              </div>
                              <div className="form-row-small" style={{ marginTop: '10px' }}>
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
                              <div className="form-row-small" style={{ marginTop: '10px' }}>
                                <div className="form-col-small">
                                  <label>Цена (₽)</label>
                                  <input
                                    type="number"
                                    value={editingSession.price}
                                    onChange={(e) => setEditingSession({ ...editingSession, price: e.target.value })}
                                    required
                                    min="0"
                                  />
                                </div>
                                <div className="form-col-small">
                                  <label>Мин. чел</label>
                                  <input
                                    type="number"
                                    value={editingSession.min_people}
                                    onChange={(e) => setEditingSession({ ...editingSession, min_people: e.target.value })}
                                    required
                                    min="1"
                                  />
                                </div>
                                <div className="form-col-small">
                                  <label>Макс. чел</label>
                                  <input
                                    type="number"
                                    value={editingSession.max_people}
                                    onChange={(e) => setEditingSession({ ...editingSession, max_people: e.target.value })}
                                    required
                                    min="1"
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

          <div className="media-section">
            <div className="media-header">
              <h2>Медиа маршрута {isGuide && (
                <label className="btn btn--secondary btn--small">
                  + Добавить фото
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                    disabled={mediaLoading}
                  />
                </label>
              )}</h2>
            </div>

            <div className="media-tabs">
              <div className="media-images">
                {routeImages.length === 0 ? (
                  <p className="no-media">Нет фотографий</p>
                ) : (
                  <div className="image-grid">
                    {routeImages.map((img) => (
                      <div key={img.id} className="image-item">
                        <img src={img.file_url} alt={img.original_name} onClick={() => window.open(img.file_url, '_blank')} />
                        {isGuide && (
                          <button
                            className="image-delete"
                            onClick={() => setImageToDelete(img)}
                            title="Удалить"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="media-videos">
                <div className="media-subheader">
                  <h3>Видео</h3>
                  {isGuide && (
                    <button
                      className="btn btn--secondary btn--small"
                      onClick={() => alert('Загрузка видео к маршруту доступна на карте при включении Live-режима или через основную форму загрузки. В будущем добавим кнопку прямой загрузки сюда.')}
                    >
                      + Добавить видео
                    </button>
                  )}
                </div>

                {routeVideos.length === 0 ? (
                  <p className="no-media">Нет видео</p>
                ) : (
                  <div className="video-grid-small">
                    {routeVideos.map((vid) => (
                      <div key={vid.id} className="video-item-small">
                        <div className="video-container-small">
                          <video src={vid.file_url} controls />
                          {isGuide && (
                            <button
                              className="video-delete-btn"
                              onClick={() => setVideoToDelete(vid)}
                              title="Удалить видео"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <div className="video-info-small">
                          <span>👤 {vid.users?.login}</span>
                          <span>📅 {new Date(vid.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
        </div>
      </div>

      <ConfirmModal
        isOpen={!!imageToDelete}
        title="Удаление изображения"
        message="Вы уверены, что хотите удалить это изображение?"
        confirmLabel="Удалить"
        onConfirm={handleDeleteImage}
        onCancel={() => setImageToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!videoToDelete}
        title="Удаление видео"
        message="Вы уверены, что хотите удалить это видео?"
        confirmLabel="Удалить"
        onConfirm={handleDeleteVideo}
        onCancel={() => setVideoToDelete(null)}
      />
    </div>
  );
};

export default RoutePage;
