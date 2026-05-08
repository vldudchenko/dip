import { API_URL } from '../utils/constants';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import { SessionItem } from '../components/SessionItem';
import { RouteForm } from '../components/RouteForm';
import {
  getStatusLabel,
  getStatusClass,
  STATUS_LABELS,
  STATUS_CLASSES
} from '../utils/routeConstants';
import { ProfileSkeleton } from '../components/Skeletons/ProfileSkeleton';


/**
 * Страница гида
 * Отображает информацию о гиде и его маршруты
 */
export const GuidePage = () => {
  const { login } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('user_id');

  const [guide, setGuide] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [guideSessions, setGuideSessions] = useState([]);
  const [userJoinedSessions, setUserJoinedSessions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  // Состояние для работы с маршрутами и прохождениями
  const [activeTab, setActiveTab] = useState('routes');
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [activeSessionEditId, setActiveSessionEditId] = useState(null);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 5;

  const closeAllForms = () => {
    setEditingRoute(null);
    setShowAddRoute(false);
    setActiveSessionEditId(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await fetch(`${API_URL}/users/login/${login}`);
        if (!userResponse.ok) {
          throw new Error('Пользователь не найден');
        }
        const userData = await userResponse.json();

        if (!userData.is_guide) {
          navigate(`/user/${login}`);
          return;
        }

        setGuide(userData);
        setAvatarError(false);

        const routesResponse = await fetch(`${API_URL}/routes/guide/${userData.id}`);
        if (routesResponse.ok) {
          const routesData = await routesResponse.json();
          setRoutes(routesData);

          // Загружаем сессии гида (все, где он является организатором)
          const sessionsResponse = await fetch(`${API_URL}/sessions/guide/${userData.id}`);
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            setGuideSessions(sessionsData);

            if (currentUserId) {
              const joinedSessions = new Set();
              for (const session of sessionsData) {
                const checkResponse = await fetch(
                  `${API_URL}/sessions/${session.id}/is-joined?userId=${currentUserId}`
                );
                if (checkResponse.ok) {
                  const { isJoined } = await checkResponse.json();
                  if (isJoined) joinedSessions.add(session.id);
                }
              }
              setUserJoinedSessions(joinedSessions);
            }
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [login, navigate]);

  const handleRouteSaved = (e, result) => {
    setShowAddRoute(false);
    setEditingRoute(null);
    refreshRoutes();
  };

  const refreshRoutes = async () => {
    const routesResponse = await fetch(`${API_URL}/routes/guide/${currentUserId}`);
    if (routesResponse.ok) {
      setRoutes(await routesResponse.json());
    }
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    try {
      const response = await fetch(`${API_URL}/routes/${routeToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось удалить маршрут');
      }

      setRouteToDelete(null);
      refreshRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinSession = async (e, sessionId, routeId) => {
    e.stopPropagation();
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
      refreshGuideSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveSession = async (e, sessionId, routeId) => {
    e.stopPropagation();
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
      refreshGuideSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshGuideSessions = async () => {
    if (!guide) return;
    const sessionsResponse = await fetch(`${API_URL}/sessions/guide/${guide.id}`);
    if (sessionsResponse.ok) {
      setGuideSessions(await sessionsResponse.json());
    }
  };

  const startEditingRoute = (route) => {
    closeAllForms();
    setEditingRoute({
      id: route.id,
      title: route.title,
      description: route.description || ''
    });
  };

  const handleEditSession = async (sessionId, data) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: data.start_date,
          end_date: data.end_date || data.start_date,
          start_time: data.start_time,
          end_time: data.end_time,
          price: Number(data.price),
          min_people: Number(data.min_people),
          max_people: Number(data.max_people)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить сессию');
      }

      refreshGuideSessions();
    } catch (err) {
      console.error('Ошибка обновления сессии:', err.message);
    }
  };

  const handleStatusChange = async (sessionId, routeId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить статус');
      }

      refreshGuideSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось удалить сессию');
      }

      setSessionToDelete(null);
      refreshGuideSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }


  if (error || !guide) {
    return <div className="guide-page">Ошибка: {error || 'Загрузка...'}</div>;
  }

  return (
    <div className="guide-page">
      <div className="guide-header">
        <img
          src={avatarError || !guide.avatar ? defaultAvatar : guide.avatar}
          alt="Аватар"
          className="guide-avatar"
          onError={() => setAvatarError(true)}
        />

        <div className="guide-info">
          <h1>{guide.login}</h1>
          <p className="guide-email">{guide.email}</p>
        </div>
      </div>

      <div className="routes-section">
        <div className="routes-header-tabs">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('routes');
                closeAllForms();
              }}
            >
              <span>Маршруты</span>
              {routes.length > 0 && <span className="tab-count">{routes.length}</span>}
              {activeTab === 'routes'}
            </button>
            <button
              className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('sessions');
                closeAllForms();
              }}
            >
              <span>Прохождения</span>
              {guideSessions.length > 0 && <span className="tab-count">{guideSessions.length}</span>}
              {activeTab === 'sessions'}
            </button>
          </div>
          {currentUserId === guide.id && activeTab === 'routes' && (
            <button
              className="btn-add-route"
              onClick={() => {
                const newState = !showAddRoute;
                closeAllForms();
                setShowAddRoute(newState);
              }}
            >
              {showAddRoute ? 'Отмена' : 'Добавить маршрут'}
            </button>
          )}
        </div>

        {activeTab === 'routes' ? (
          <>
            {showAddRoute && currentUserId === guide.id && (
              <RouteForm
                initialValues={{
                  title: '',
                  description: ''
                }}
                onSubmit={handleRouteSaved}
                onCancel={() => setShowAddRoute(false)}
                submitLabel="Создать маршрут"
                guideId={currentUserId}
              />
            )}

            {routes.length === 0 ? (
              <p className="no-routes">У этого гида пока нет маршрутов</p>
            ) : (
              <div className="routes-list">
                {routes.map((route) => (
                  <div key={route.id} className="route-card">
                    {editingRoute?.id === route.id ? (
                      <div className="route-card-editing" onClick={(e) => e.stopPropagation()}>
                        <RouteForm
                          initialValues={editingRoute}
                          onSubmit={handleRouteSaved}
                          onCancel={() => setEditingRoute(null)}
                          submitLabel="Сохранить"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="route-header" onClick={() => navigate(`/route/${route.id}`)}>
                          <h3 className="route-title">{route.title}</h3>
                        </div>

                        <div className="route-body">
                          {route.description && (
                            <p className="route-description" onClick={() => navigate(`/route/${route.id}`)}>{route.description}</p>
                          )}
                        </div>
                        {currentUserId === guide.id && (
                          <div className="route-card-actions">
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingRoute(route);
                              }}
                            >
                              Редактировать
                            </button>
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/route/${route.id}/path`);
                              }}
                            >
                              Путь маршрута
                            </button>
                            <button
                              className="btn btn--secondary btn--small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRouteToDelete(route.id);
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="sessions-management">
            {guideSessions.length === 0 ? (
              <p className="no-routes">У этого гида пока нет запланированных прохождений</p>
            ) : (
              <div className="sessions-list" style={guideSessions.length < 5 ? { minHeight: 'auto' } : undefined}>
                {(() => {
                  const sorted = [...guideSessions].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
                  const totalPages = Math.ceil(sorted.length / SESSIONS_PER_PAGE);
                  const paginated = sorted.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE);

                  return (
                    <>
                      {paginated.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          currentUserId={currentUserId}
                          isRouteOwner={false} // На этой странице права определяются через guide_id
                          onJoin={(sid) => handleJoinSession({ stopPropagation: () => { } }, sid, session.route_id)}
                          onLeave={(sid) => handleLeaveSession({ stopPropagation: () => { } }, sid, session.route_id)}
                          onEdit={handleEditSession}
                          onDelete={(sid) => setSessionToDelete(session)}
                          onStatusChange={handleStatusChange}
                          isJoined={userJoinedSessions.has(session.id)}
                          statusLabels={STATUS_LABELS}
                          statusClasses={STATUS_CLASSES}
                          isLoggedIn={!!currentUserId}
                          showRouteTitle={true}
                          showOrganizer={false}
                          isEditing={activeSessionEditId === session.id}
                          onToggleEdit={(editing) => {
                            if (editing) {
                              closeAllForms();
                              setActiveSessionEditId(session.id);
                            } else {
                              setActiveSessionEditId(null);
                            }
                          }}
                        />
                      ))}

                      {totalPages > 1 && (
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
                            Страница {sessionPage} из {totalPages}
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
                            {sessionPage < totalPages && (
                              <button
                                className="btn btn--secondary btn--small"
                                onClick={() => setSessionPage(prev => Math.min(totalPages, prev + 1))}
                              >
                                Вперед
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!routeToDelete}
        title="Удаление маршрута"
        message="Вы уверены, что хотите удалить этот маршрут?"
        confirmLabel="Удалить"
        onConfirm={handleDeleteRoute}
        onCancel={() => setRouteToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Удаление прохождения"
        message="Вы уверены, что хотите удалить это прохождение? Все записи участников будут аннулированы."
        confirmLabel="Удалить"
        onConfirm={handleDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};

export default GuidePage;