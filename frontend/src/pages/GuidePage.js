import { API_URL } from '../utils/constants';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import defaultAvatar from '../static/Avatar.png';
import { RouteForm } from '../components/RouteForm';
import { ConfirmModal } from '../components/ConfirmModal';
import { 
  getDifficultyLabel, 
  getDifficultyClass, 
  getStatusLabel, 
  getStatusClass 
} from '../utils/routeConstants';

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
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  
  // Состояние для работы с маршрутами
  const [editingRoute, setEditingRoute] = useState(null);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);

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

          const sessionsMap = {};
          for (const route of routesData) {
            const sessionsResponse = await fetch(`${API_URL}/sessions/route/${route.id}`);
            if (sessionsResponse.ok) {
              sessionsMap[route.id] = await sessionsResponse.json();
            }
          }
          setSessions(sessionsMap);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [login, navigate]);

  const handleRouteSaved = () => {
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

  const startEditingRoute = (route) => {
    setEditingRoute({
      id: route.id,
      title: route.title,
      description: route.description || '',
      difficulty: route.difficulty,
      price: String(route.price),
      min_people: String(route.min_people),
      max_people: String(route.max_people)
    });
  };

  if (loading) {
    return <div className="guide-page">Загрузка...</div>;
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
          <p className="guide-email"><strong>Email:</strong> {guide.email || 'Не указан'}</p>
          <p className="guide-status">✓ Сертифицированный гид</p>
        </div>
      </div>

      <div className="routes-section">
        <div className="routes-header">
          <h2>Маршруты гида</h2>
          {currentUserId === guide.id && (
            <button
              className="btn-add-route"
              onClick={() => {
                setShowAddRoute(!showAddRoute);
                setEditingRoute(null);
              }}
            >
              {showAddRoute ? 'Отмена' : '+ Добавить маршрут'}
            </button>
          )}
        </div>

        {showAddRoute && currentUserId === guide.id && (
          <RouteForm
            initialValues={{
              title: '',
              description: '',
              difficulty: 'easy',
              price: '',
              min_people: '',
              max_people: ''
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
                    <div className="route-header" onClick={() => navigate(`/route/${route.id}`)} style={{ cursor: 'pointer' }}>
                      <h3 className="route-title">{route.title}</h3>
                      <span className={`route-difficulty ${getDifficultyClass(route.difficulty)}`}>
                        {getDifficultyLabel(route.difficulty)}
                      </span>
                    </div>

                    <div className="route-body" onClick={(e) => e.stopPropagation()}>
                      {route.description && (
                        <p className="route-description">{route.description}</p>
                      )}

                      <div className="route-details">
                        <span className="route-price">💰 {route.price} ₽</span>
                        <span className="route-people">👥 {route.min_people}-{route.max_people} чел.</span>
                      </div>

                      {sessions[route.id] && sessions[route.id].length > 0 && (
                        <div className="route-sessions-preview">
                          <span className="sessions-label">📅 Запланировано прохождений: {sessions[route.id].length}</span>
                          <div className="sessions-mini-list">
                            {sessions[route.id].slice(0, 3).map((session, idx) => (
                              <div key={idx} className="session-mini-item">
                                <span className={`session-mini-status ${getStatusClass(session.status)}`}>
                                  {getStatusLabel(session.status)}
                                </span>
                                <span className="session-mini-date">
                                  {new Date(session.start_date).toLocaleDateString('ru-RU')}
                                </span>
                                <span className="session-mini-participants">
                                  👥 {session.participants_count}/{route.max_people}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
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
                          ✏️ Редактировать
                        </button>
                        <button
                          className="btn btn--danger btn--small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRouteToDelete(route.id);
                          }}
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
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
    </div>
  );
};

export default GuidePage;