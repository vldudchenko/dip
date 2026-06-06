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
  const [sessionFilterStatuses, setSessionFilterStatuses] = useState(new Set(['waiting', 'pending_date']));

  // Custom dropdown open states
  const [sessionStatusDropdownOpen, setSessionStatusDropdownOpen] = useState(false);
  const [sessionOwnershipDropdownOpen, setSessionOwnershipDropdownOpen] = useState(false);
  const [sessionRouteDropdownOpen, setSessionRouteDropdownOpen] = useState(false);
  const [sessionSortDropdownOpen, setSessionSortDropdownOpen] = useState(false);
  const [sessionsPerPageDropdownOpen, setSessionsPerPageDropdownOpen] = useState(false);
  const [routesPerPageDropdownOpen, setRoutesPerPageDropdownOpen] = useState(false);

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

  const closeAllDropdowns = () => {
    setSessionStatusDropdownOpen(false);
    setSessionOwnershipDropdownOpen(false);
    setSessionRouteDropdownOpen(false);
    setSessionSortDropdownOpen(false);
    setSessionsPerPageDropdownOpen(false);
    setRoutesPerPageDropdownOpen(false);
  };

  useEffect(() => {
    if (
      !sessionStatusDropdownOpen &&
      !sessionOwnershipDropdownOpen &&
      !sessionRouteDropdownOpen &&
      !sessionSortDropdownOpen &&
      !sessionsPerPageDropdownOpen &&
      !routesPerPageDropdownOpen
    ) return;
    document.addEventListener('click', closeAllDropdowns);
    return () => document.removeEventListener('click', closeAllDropdowns);
  }, [
    sessionStatusDropdownOpen,
    sessionOwnershipDropdownOpen,
    sessionRouteDropdownOpen,
    sessionSortDropdownOpen,
    sessionsPerPageDropdownOpen,
    routesPerPageDropdownOpen
  ]);

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
                    <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className={`sort-select sort-select--small status-filter-trigger${routesPerPageDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextState = !routesPerPageDropdownOpen;
                          closeAllDropdowns();
                          setRoutesPerPageDropdownOpen(nextState);
                        }}
                      >
                        {routesPerPage}
                      </button>
                      {routesPerPageDropdownOpen && (
                        <div className="status-filter-menu status-filter-menu--small" onClick={e => e.stopPropagation()}>
                          {[4, 6, 8, 10].map((val) => (
                            <button
                              key={val}
                              type="button"
                              className={`status-filter-option-btn${routesPerPage === val ? ' active' : ''}`}
                              onClick={() => {
                                setRoutesPerPage(val);
                                localStorage.setItem('routesPerPage', val);
                                setRoutePage(1);
                                closeAllDropdowns();
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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

                      if (!hasOwn && !hasOther) return null;

                      const labels = {
                        all: 'Все маршруты',
                        own: 'Свои маршруты',
                        other: 'Чужие маршруты'
                      };

                      return (
                        <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className={`sort-select status-filter-trigger${sessionOwnershipDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextState = !sessionOwnershipDropdownOpen;
                              closeAllDropdowns();
                              setSessionOwnershipDropdownOpen(nextState);
                            }}
                          >
                            {labels[sessionFilterOwnership] || 'Все маршруты'}
                          </button>
                          {sessionOwnershipDropdownOpen && (
                            <div className="status-filter-menu" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`status-filter-option-btn${sessionFilterOwnership === 'all' ? ' active' : ''}`}
                                onClick={() => {
                                  setSessionFilterOwnership('all');
                                  setSessionFilterRoute('all');
                                  setSessionPage(1);
                                  closeAllDropdowns();
                                }}
                              >
                                Все маршруты
                              </button>
                              {hasOwn && (
                                <button
                                  type="button"
                                  className={`status-filter-option-btn${sessionFilterOwnership === 'own' ? ' active' : ''}`}
                                  onClick={() => {
                                    setSessionFilterOwnership('own');
                                    setSessionFilterRoute('all');
                                    setSessionPage(1);
                                    closeAllDropdowns();
                                  }}
                                >
                                  Свои маршруты
                                </button>
                              )}
                              {hasOther && (
                                <button
                                  type="button"
                                  className={`status-filter-option-btn${sessionFilterOwnership === 'other' ? ' active' : ''}`}
                                  onClick={() => {
                                    setSessionFilterOwnership('other');
                                    setSessionFilterRoute('all');
                                    setSessionPage(1);
                                    closeAllDropdowns();
                                  }}
                                >
                                  Чужие маршруты
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

                      const currentRouteLabel = sessionFilterRoute === 'all'
                        ? 'Все маршруты'
                        : availableRoutesMap.get(Number(sessionFilterRoute)) || availableRoutesMap.get(sessionFilterRoute) || 'Выбран маршрут';

                      return (
                        <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className={`sort-select status-filter-trigger${sessionRouteDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextState = !sessionRouteDropdownOpen;
                              closeAllDropdowns();
                              setSessionRouteDropdownOpen(nextState);
                            }}
                          >
                            {currentRouteLabel}
                          </button>
                          {sessionRouteDropdownOpen && (
                            <div className="status-filter-menu" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`status-filter-option-btn${sessionFilterRoute === 'all' ? ' active' : ''}`}
                                onClick={() => {
                                  setSessionFilterRoute('all');
                                  setSessionPage(1);
                                  closeAllDropdowns();
                                }}
                              >
                                Все маршруты
                              </button>
                              {Array.from(availableRoutesMap.entries()).map(([id, title]) => (
                                <button
                                  key={id}
                                  type="button"
                                  className={`status-filter-option-btn${String(sessionFilterRoute) === String(id) ? ' active' : ''}`}
                                  onClick={() => {
                                    setSessionFilterRoute(id);
                                    setSessionPage(1);
                                    closeAllDropdowns();
                                  }}
                                >
                                  {title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {(() => {
                      const activeLabels = Object.entries(STATUS_LABELS)
                        .filter(([val]) => sessionFilterStatuses.has(val))
                        .map(([_, label]) => label);

                      let triggerElement;
                      if (activeLabels.length === Object.keys(STATUS_LABELS).length) {
                        triggerElement = <span>Все статусы</span>;
                      } else if (activeLabels.length === 1) {
                        triggerElement = <span>{activeLabels[0]}</span>;
                      } else if (activeLabels.length === 0) {
                        triggerElement = <span>Ничего не выбрано</span>;
                      } else {
                        triggerElement = (
                          <span>
                            Статус <span className="tab-count">{activeLabels.length}</span>
                          </span>
                        );
                      }

                      return (
                        <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className={`sort-select status-filter-trigger${sessionStatusDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextState = !sessionStatusDropdownOpen;
                              closeAllDropdowns();
                              setSessionStatusDropdownOpen(nextState);
                            }}
                          >
                            {triggerElement}
                          </button>
                          {sessionStatusDropdownOpen && (
                            <div className="status-filter-menu" onClick={e => e.stopPropagation()}>
                              {Object.entries(STATUS_LABELS).map(([value, label]) => {
                                const isChecked = sessionFilterStatuses.has(value);
                                return (
                                  <label key={value} className="status-filter-item">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const newStatuses = new Set(sessionFilterStatuses);
                                        if (isChecked) {
                                          newStatuses.delete(value);
                                        } else {
                                          newStatuses.add(value);
                                        }
                                        setSessionFilterStatuses(newStatuses);
                                        setSessionPage(1);
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {(() => {
                    const sortLabels = {
                      'date-desc': 'Сначала новые',
                      'date-asc': 'Сначала старые',
                      'price-asc': 'Дешевле',
                      'price-desc': 'Дороже'
                    };

                    return (
                      <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className={`sort-select status-filter-trigger${sessionSortDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextState = !sessionSortDropdownOpen;
                            closeAllDropdowns();
                            setSessionSortDropdownOpen(nextState);
                          }}
                        >
                          {sortLabels[sessionSortBy] || 'Сортировка'}
                        </button>
                        {sessionSortDropdownOpen && (
                          <div className="status-filter-menu" onClick={e => e.stopPropagation()}>
                            {Object.entries(sortLabels).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                className={`status-filter-option-btn${sessionSortBy === value ? ' active' : ''}`}
                                onClick={() => {
                                  setSessionSortBy(value);
                                  setSessionPage(1);
                                  closeAllDropdowns();
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="filters-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="filter-label" style={{ fontSize: '0.875rem', color: '#666' }}>На странице:</span>
                    <div className="status-filter-dropdown" style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className={`sort-select sort-select--small status-filter-trigger${sessionsPerPageDropdownOpen ? ' status-filter-trigger--open' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextState = !sessionsPerPageDropdownOpen;
                          closeAllDropdowns();
                          setSessionsPerPageDropdownOpen(nextState);
                        }}
                      >
                        {sessionsPerPage}
                      </button>
                      {sessionsPerPageDropdownOpen && (
                        <div className="status-filter-menu status-filter-menu--small" onClick={e => e.stopPropagation()}>
                          {[5, 10, 15, 20].map((val) => (
                            <button
                              key={val}
                              type="button"
                              className={`status-filter-option-btn${sessionsPerPage === val ? ' active' : ''}`}
                              onClick={() => {
                                setSessionsPerPage(val);
                                localStorage.setItem('sessionsPerPage', val);
                                setSessionPage(1);
                                closeAllDropdowns();
                              }}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                      const matchStatus = sessionFilterStatuses.has(s.status);
                      const matchRoute = sessionFilterRoute === 'all' || String(s.route_id) === String(sessionFilterRoute);
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