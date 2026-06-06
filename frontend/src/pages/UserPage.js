import { API_URL } from '../utils/constants';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import defaultAvatar from '../static/Avatar.png';
import {
  STATUS_LABELS,
  STATUS_CLASSES
} from '../utils/routeConstants';
import { UserPageSkeleton } from '../components/Skeletons/ProfileSkeleton';
import { SessionItem } from '../components/SessionItem';
import FormattedDate from '../components/FormattedDate';
import { ConfirmModal } from '../components/ConfirmModal';


/**
 * Страница пользователя
 * Отображает профиль пользователя, его прохождения и видео
 */
export const UserPage = () => {
  const { login } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const storedUserId = localStorage.getItem('user_id');
  const currentUserId = storedUserId && storedUserId !== 'undefined' ? storedUserId : null;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  // Данные вкладок
  const [activeTab, setActiveTab] = useState('videos');
  const [userSessions, setUserSessions] = useState([]);
  const [userVideos, setUserVideos] = useState([]);

  // Пагинация прохождений
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 5;

  // Пагинация видео
  const [videoPage, setVideoPage] = useState(1);
  const VIDEOS_PER_PAGE = 6;

  // Модалки записи/отписки
  const [sessionToJoin, setSessionToJoin] = useState(null);
  const [sessionToLeave, setSessionToLeave] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = currentUserId === user?.id;

  const fetchData = useCallback(async () => {
    try {
      // 1. Загружаем данные пользователя
      const userResponse = await fetch(`${API_URL}/users/login/${login}`);
      if (!userResponse.ok) {
        throw new Error('Пользователь не найден');
      }
      const userData = await userResponse.json();

      // Если пользователь — гид, перенаправляем на страницу гида
      if (userData.is_guide) {
        navigate(`/guide/${login}`, { replace: true });
        return;
      }

      setUser(userData);
      setAvatarError(false);

      // 2. Загружаем прохождения пользователя
      const sessionsResponse = await fetch(`${API_URL}/sessions/user/${userData.id}`);
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        // Распаковываем вложенную структуру { session: { ... } }
        const sessions = Array.isArray(sessionsData)
          ? sessionsData
            .map(item => item.session)
            .filter(Boolean)
          : [];
        setUserSessions(sessions);
      }

      // 3. Загружаем все видео и фильтруем по user_id
      const videosResponse = await fetch(`${API_URL}/videos`);
      if (videosResponse.ok) {
        const videosData = await videosResponse.json();
        const filtered = Array.isArray(videosData)
          ? videosData.filter(v => v.user_id === userData.id)
          : [];
        setUserVideos(filtered);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleJoinConfirm = async () => {
    if (!sessionToJoin || !currentUserId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToJoin}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось записаться');
      }

      setSessionToJoin(null);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveConfirm = async () => {
    if (!sessionToLeave || !currentUserId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToLeave}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось отписаться');
      }

      setSessionToLeave(null);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleGuide = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/guide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGuide: !user.is_guide,
          userId: currentUserId
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);

      // Если стал гидом — перенаправляем на страницу гида
      if (updatedUser.is_guide) {
        navigate(`/guide/${login}`, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    }
  };


  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  // Статистика
  const completedSessions = userSessions.filter(s => s.status === 'completed').length;

  // Пагинация прохождений
  const sortedSessions = [...userSessions].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const totalSessionPages = Math.ceil(sortedSessions.length / SESSIONS_PER_PAGE);
  const paginatedSessions = sortedSessions.slice(
    (sessionPage - 1) * SESSIONS_PER_PAGE,
    sessionPage * SESSIONS_PER_PAGE
  );

  // Пагинация видео
  const sortedVideos = [...userVideos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const totalVideoPages = Math.ceil(sortedVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = sortedVideos.slice(
    (videoPage - 1) * VIDEOS_PER_PAGE,
    videoPage * VIDEOS_PER_PAGE
  );

  if (loading) {
    return <UserPageSkeleton />;
  }


  if (error || !user) {
    return <div className="user-page">Ошибка: {error || 'Пользователь не найден'}</div>;
  }



  return (
    <div className="user-page">
      {/* Шапка профиля */}
      <div className="user-header">
        <div className="avatar-container avatar-container--profile">
          <img
            src={avatarError || !user.avatar ? defaultAvatar : user.avatar}
            alt="Аватар"
            onError={() => setAvatarError(true)}
          />
        </div>

        <div className="user-header-info">
          <h1>{user.full_name || user.login}</h1>
          <p className="user-login" style={{ color: '#333' }}>@{user.login}</p>
        </div>
      </div>

      {/* Табы */}
      <div className="user-content-section">
        <div className="routes-header-tabs">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => { setActiveTab('videos'); setVideoPage(1); }}
            >
              <span>Видео</span>
              {userVideos.length > 0 && <span className="tab-count">{userVideos.length}</span>}
            </button>
            <button
              className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => { setActiveTab('sessions'); setSessionPage(1); }}
            >
              <span>Прохождения</span>
              {userSessions.length > 0 && <span className="tab-count">{userSessions.length}</span>}
            </button>
          </div>
        </div>

        {/* Вкладка: Прохождения */}
        {activeTab === 'sessions' && (
          <div className="user-sessions-tab">
            {userSessions.length === 0 ? (
              <p className="no-routes">Пользователь ещё не участвовал в прохождениях</p>
            ) : (
              <>
                <div className="sessions-list">
                  {paginatedSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      currentUserId={currentUserId}
                      statusLabels={STATUS_LABELS}
                      statusClasses={STATUS_CLASSES}
                      isLoggedIn={!!currentUserId}
                      isJoined={session.participants?.some(p => String(p.user_id) === String(currentUserId))}
                      onJoin={setSessionToJoin}
                      onLeave={setSessionToLeave}
                      showRouteTitle={true}
                      showOrganizer={true}
                      initialGuide={session.guide}
                      currentUserIsGuide={currentUser?.is_guide}
                    />
                  ))}
                </div>

                {totalSessionPages > 1 && (
                  <div className="pagination">
                    <div style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                      {sessionPage > 1 && (
                        <button
                          className="btn btn--secondary btn--small"
                          onClick={() => setSessionPage(prev => Math.max(1, prev - 1))}
                        >
                          Назад
                        </button>
                      )}
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#666', whiteSpace: 'nowrap' }}>
                      Страница {sessionPage} из {totalSessionPages}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                      {sessionPage < totalSessionPages && (
                        <button
                          className="btn btn--secondary btn--small"
                          onClick={() => setSessionPage(prev => Math.min(totalSessionPages, prev + 1))}
                        >
                          Вперед
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Вкладка: Видео */}
        {activeTab === 'videos' && (
          <div className="user-videos-tab" style={{ minHeight: '741px' }}>
            {userVideos.length === 0 ? (
              <p className="no-routes">Пользователь ещё не загружал видео</p>
            ) : (
              <>
                <div className="user-videos-grid">
                  {paginatedVideos.map((video) => (
                    <Link
                      key={video.id}
                      to={`/video/${video.users?.login || login}/${video.id}`}
                      className="user-video-card"
                    >
                      <div className="user-video-thumbnail">
                        <video
                          src={video.file_url}
                          muted
                          preload="metadata"
                          className="user-video-preview"
                        />
                      </div>
                      <div className="user-video-info">
                        <div className="user-video-meta">
                          <span className="user-video-views">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="view-icon">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            {video.views?.[0]?.count || 0}
                          </span>
                          <span className="user-video-date">
                            <FormattedDate date={video.created_at} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {totalVideoPages > 1 && (
                  <div className="pagination">
                    <div style={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
                      {videoPage > 1 && (
                        <button
                          className="btn btn--secondary btn--small"
                          onClick={() => setVideoPage(prev => Math.max(1, prev - 1))}
                        >
                          Назад
                        </button>
                      )}
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#666', whiteSpace: 'nowrap' }}>
                      Страница {videoPage} из {totalVideoPages}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                      {videoPage < totalVideoPages && (
                        <button
                          className="btn btn--secondary btn--small"
                          onClick={() => setVideoPage(prev => Math.min(totalVideoPages, prev + 1))}
                        >
                          Вперед
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!sessionToJoin}
        title="Запись на прохождение"
        message="Вы уверены, что хотите записаться на это прохождение?"
        confirmLabel="Записаться"
        confirmVariant="primary"
        isConfirmDisabled={actionLoading}
        onConfirm={handleJoinConfirm}
        onCancel={() => setSessionToJoin(null)}
      />

      <ConfirmModal
        isOpen={!!sessionToLeave}
        title="Отмена записи"
        message="Вы уверены, что хотите отменить свою запись на это прохождение?"
        confirmLabel="Отписаться"
        confirmVariant="delete"
        isConfirmDisabled={actionLoading}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setSessionToLeave(null)}
      />
    </div>
  );
};

export default UserPage;
