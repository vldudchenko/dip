import { API_URL } from '../utils/constants';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import { SessionItem } from '../components/SessionItem';
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
  const { user: currentUser } = useAuth();
  const storedUserId = localStorage.getItem('user_id');
  const currentUserId = storedUserId && storedUserId !== 'undefined' ? storedUserId : null;

  const [guide, setGuide] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [guideSessions, setGuideSessions] = useState([]);
  const [userJoinedSessions, setUserJoinedSessions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  // Состояние для работы с маршрутами и прохождениями
  const [activeTab, setActiveTab] = useState('routes');
  const [activeSessionEditId, setActiveSessionEditId] = useState(null);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionSortBy, setSessionSortBy] = useState('date-desc');
  const [sessionFilterStatus, setSessionFilterStatus] = useState('all');
  const [sessionFilterRoute, setSessionFilterRoute] = useState('all');
  const [sessionFilterOwnership, setSessionFilterOwnership] = useState('all');
  const [sessionsPerPage, setSessionsPerPage] = useState(() =>
    Number(localStorage.getItem('sessionsPerPage')) || 5
  );

  const [routePage, setRoutePage] = useState(1);
  const [routesPerPage, setRoutesPerPage] = useState(() =>
    Number(localStorage.getItem('routesPerPage')) || 4
  );

  const closeAllForms = () => {
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

  const refreshRoutes = async () => {
    const routesResponse = await fetch(`${API_URL}/routes/guide/${guide?.id || currentUserId}`);
    if (routesResponse.ok) {
      setRoutes(await routesResponse.json());
    }
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    try {
      const response = await fetch(`${API_URL}/routes/${routeToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
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

  const handleEditSession = async (sessionId, data) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUserId
        },
        body: JSON.stringify({
          ...data,
          userId: currentUserId
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
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUserId
        },
        body: JSON.stringify({ status: newStatus, userId: currentUserId })
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
        <div className="avatar-container avatar-container--profile">
          <img
            src={avatarError || !guide.avatar ? defaultAvatar : guide.avatar}
            alt="Аватар"
            onError={() => setAvatarError(true)}
          />
        </div>

        <div className="guide-info">
          <h1>{guide.full_name || guide.login}</h1>
          <p className="guide-login" style={{ color: "#333" }}>@{guide.login}</p>
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
            </button>
          </div>
          {currentUserId === guide.id && currentUser?.is_guide && activeTab === 'routes' && (
            <button
              className="btn-add-route"
              onClick={() => navigate('/route/new')}
            >
              Добавить маршрут
            </button>
          )}
        </div>

        {activeTab === 'routes' ? (
          <>
            {routes.length === 0 ? (
              <p className="no-routes">У этого гида пока нет маршрутов</p>
            ) : (
              <>
                <div className="sessions-filters">
                  <div className="filters-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="filter-label" style={{ fontSize: '0.875rem', color: '#666' }}>На странице:</span>
                    <select
                      value={routesPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setRoutesPerPage(val);
                        localStorage.setItem('routesPerPage', val);
                        setRoutePage(1);
                      }}
                      className="sort-select"
                    >
                      <option value={4}>4</option>
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                </div>
                <div className="routes-list" style={routes.length < routesPerPage ? { minHeight: 'auto' } : { minHeight: `${routesPerPage * 150}px` }}>
                  {(() => {
                    const totalPages = Math.ceil(routes.length / routesPerPage);
                    const paginated = routes.slice((routePage - 1) * routesPerPage, routePage * routesPerPage);

                    return (
                      <>
                        {paginated.map((route) => (
                          <div key={route.id} className="route-card">
                            <div className="route-header" onClick={() => navigate(`/route/${route.id}`)}>
                              <h3 className="route-title">{route.title}</h3>
                            </div>

                            <div className="route-body">
                              {route.description && (
                                <p className="route-description" onClick={() => navigate(`/route/${route.id}`)}>{route.description}</p>
                              )}
                            </div>
                            {currentUserId === guide.id && currentUser?.is_guide && (
                              <div className="route-card-actions">
                                <button
                                  className="btn btn--secondary btn--small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/route/${route.id}`, { state: { isPreviewMode: false } });
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
                          </div>
                        ))}

                        {totalPages > 1 && (
                          <div className="pagination">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, paddingRight: '1rem' }}>
                              {routePage > 1 && (
                                <button
                                  className="btn btn--secondary btn--small"
                                  onClick={() => setRoutePage(prev => Math.max(1, prev - 1))}
                                >
                                  Назад
                                </button>
                              )}
                            </div>
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#666', whiteSpace: 'nowrap' }}>
                              Страница {routePage} из {totalPages}
                            </span>
                            <div style={{ display: 'flex', justifyContent: 'flex-start', flex: 1, paddingLeft: '1rem' }}>
                              {routePage < totalPages && (
                                <button
                                  className="btn btn--secondary btn--small"
                                  onClick={() => setRoutePage(prev => Math.min(totalPages, prev + 1))}
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
              </>
            )}
          </>
        ) : (
          <div className="sessions-management">
            {guideSessions.length === 0 ? (
              <p className="no-routes">У этого гида пока нет запланированных прохождений</p>
            ) : (
              <>
                <div className="sessions-filters">
                  <div className="filters-group">
                    {(() => {
                      const ownRouteIds = new Set(routes.map(r => r.id));
                      const hasOwn = guideSessions.some(s => ownRouteIds.has(s.route_id));
                      const hasOther = guideSessions.some(s => !ownRouteIds.has(s.route_id));

                      // Если есть и те, и другие, показываем селект. Если только один тип - может и не надо фильтр?
                      // Но пользователь просил именно условия на опции.
                      if (!hasOwn && !hasOther) return null;

                      return (
                        <select
                          value={sessionFilterOwnership}
                          onChange={(e) => {
                            setSessionFilterOwnership(e.target.value);
                            setSessionFilterRoute('all');
                            setSessionPage(1);
                          }}
                          className="sort-select"
                        >
                          <option value="all">Все маршруты</option>
                          {hasOwn && <option value="own">Свои маршруты</option>}
                          {hasOther && <option value="other">Чужие маршруты</option>}
                        </select>
                      );
                    })()}

                    <select
                      value={sessionFilterRoute}
                      onChange={(e) => {
                        const newRouteId = e.target.value;
                        setSessionFilterRoute(newRouteId);
                        setSessionPage(1);

                        // Если выбранный статус недоступен для нового маршрута, сбрасываем его
                        if (sessionFilterStatus !== 'all') {
                          const hasStatus = guideSessions.some(s =>
                            (newRouteId === 'all' || s.route_id === newRouteId) &&
                            s.status === sessionFilterStatus
                          );
                          if (!hasStatus) {
                            setSessionFilterStatus('all');
                          }
                        }
                      }}
                      className="sort-select"
                    >
                      <option value="all">Все маршруты</option>
                      {(() => {
                        const ownRouteIds = new Set(routes.map(r => r.id));
                        const availableRoutesMap = new Map();

                        guideSessions.forEach(s => {
                          const isOwn = ownRouteIds.has(s.route_id);
                          if (sessionFilterOwnership === 'all' ||
                            (sessionFilterOwnership === 'own' && isOwn) ||
                            (sessionFilterOwnership === 'other' && !isOwn)) {
                            if (!availableRoutesMap.has(s.route_id)) {
                              availableRoutesMap.set(s.route_id, s.route?.title || `Маршрут #${s.route_id}`);
                            }
                          }
                        });

                        return Array.from(availableRoutesMap.entries()).map(([id, title]) => (
                          <option key={id} value={id}>{title}</option>
                        ));
                      })()}
                    </select>

                    <select
                      value={sessionFilterStatus}
                      onChange={(e) => {
                        setSessionFilterStatus(e.target.value);
                        setSessionPage(1);
                      }}
                      className="sort-select"
                    >
                      <option value="all">Все статусы</option>
                      {Object.entries(STATUS_LABELS)
                        .filter(([value]) =>
                          guideSessions.some(s =>
                            (sessionFilterRoute === 'all' || s.route_id === sessionFilterRoute) &&
                            s.status === value
                          )
                        )
                        .map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                  </div>

                  <select
                    value={sessionSortBy}
                    onChange={(e) => {
                      setSessionSortBy(e.target.value);
                      setSessionPage(1);
                    }}
                    className="sort-select"
                  >
                    <option value="date-desc">Сначала новые</option>
                    <option value="date-asc">Сначала старые</option>
                    <option value="price-asc">Дешевле</option>
                    <option value="price-desc">Дороже</option>
                  </select>

                  <div className="filters-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="filter-label" style={{ fontSize: '0.875rem', color: '#666' }}>На странице:</span>
                    <select
                      value={sessionsPerPage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSessionsPerPage(val);
                        localStorage.setItem('sessionsPerPage', val);
                        setSessionPage(1);
                      }}
                      className="sort-select"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
                <div className="sessions-list" style={guideSessions.length < sessionsPerPage ? { minHeight: 'auto' } : undefined}>
                  {(() => {
                    const filtered = guideSessions.filter(s => {
                      const ownRouteIds = new Set(routes.map(r => r.id));
                      const isOwn = ownRouteIds.has(s.route_id);

                      const matchOwnership = sessionFilterOwnership === 'all' ||
                        (sessionFilterOwnership === 'own' && isOwn) ||
                        (sessionFilterOwnership === 'other' && !isOwn);
                      const matchStatus = sessionFilterStatus === 'all' || s.status === sessionFilterStatus;
                      const matchRoute = sessionFilterRoute === 'all' || s.route_id === sessionFilterRoute;
                      return matchOwnership && matchStatus && matchRoute;
                    });

                    const sorted = [...filtered].sort((a, b) => {
                      if (sessionSortBy === 'date-desc') {
                        return new Date(b.start_date) - new Date(a.start_date);
                      } else if (sessionSortBy === 'date-asc') {
                        return new Date(a.start_date) - new Date(b.start_date);
                      } else if (sessionSortBy === 'price-asc') {
                        return a.price - b.price;
                      } else if (sessionSortBy === 'price-desc') {
                        return b.price - a.price;
                      }
                      return 0;
                    });
                    const totalPages = Math.ceil(sorted.length / sessionsPerPage);
                    const paginated = sorted.slice((sessionPage - 1) * sessionsPerPage, sessionPage * sessionsPerPage);

                    return (
                      <>
                        {paginated.length > 0 ? (
                          paginated.map((session) => (
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
                              currentUserIsGuide={currentUser?.is_guide}
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
                          ))
                        ) : (
                          <p className="no-routes" style={{ margin: '40px 0' }}>Прохождений с такими параметрами не найдено</p>
                        )}

                        {totalPages > 1 && (
                          <div className="pagination">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, paddingRight: '1rem' }}>
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
                            <div style={{ display: 'flex', justifyContent: 'flex-start', flex: 1, paddingLeft: '1rem' }}>
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
              </>
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