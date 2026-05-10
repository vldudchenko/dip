import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Map } from '../components/Map';
import '../styles/postVideoPage.css';

export const PostVideoPage = ({ user, authLoading }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [point, setPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [videos, setVideos] = useState([]);
  const [sessionListPage, setSessionListPage] = useState(1);
  const SESSIONS_PER_PAGE = 4;

  // Карта
  const mapRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    const fetchSessions = async () => {
      try {
        const data = await api.fetchUserSessions(user.id);
        // Обрабатываем вложенную структуру { session: { ... } }
        const sessionsList = Array.isArray(data)
          ? data
            .map(item => ({
              ...item.session,
              route_title: item.session?.route?.title || 'Без названия'
            }))
            .filter(s => s && (s.status === 'in_progress' || s.status === 'completed'))
          : [];

        setSessions(sessionsList);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Не удалось загрузить ваши прохождения');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find(s => s.id === selectedSessionId);
      setSelectedSession(session);
      // При выборе сессии загружаем видео этого маршрута
      if (session?.route_id) {
        loadRouteVideos(session.route_id);
      }
    } else {
      setSelectedSession(null);
      setVideos([]);
    }
  }, [selectedSessionId, sessions]);

  const paginatedSessions = React.useMemo(() => {
    const start = (sessionListPage - 1) * SESSIONS_PER_PAGE;
    return sessions.slice(start, start + SESSIONS_PER_PAGE);
  }, [sessions, sessionListPage]);

  const totalPages = Math.ceil(sessions.length / SESSIONS_PER_PAGE);

  const loadRouteVideos = async (routeId) => {
    try {
      // Передаем routeId как 4-й аргумент (для fetchVideos в api/index.js это lat, lng, radius, routeId)
      const data = await api.fetchVideos(null, null, null, routeId);
      setVideos(data);
    } catch (err) {
      console.error('Error fetching route videos:', err);
    }
  };

  const handleReset = () => {
    if (selectedSession?.route_id) {
      loadRouteVideos(selectedSession.route_id);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleMapClick = (coords) => {
    setPoint(coords);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSession || !videoFile || !point) {
      setError('Пожалуйста, заполните все поля и выберите точку на карте');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // point теперь массив [lng, lat]
      // Аргументы uploadVideo: file, userId, lat, lng, isLive, routeData, duration, routeId
      await api.uploadVideo(videoFile, user.id, point[1], point[0], false, null, 0, selectedSession.route_id);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError('Ошибка при загрузке видео');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // if (loading) return <div className="post-video-loading">Загрузка...</div>;

  return (
    <div className="post-video-page">
      <div className="post-video-layout">
        {success ? (
          <div className="form-container success-container" style={{ width: '100%' }}>
            <div className="success-message">
              <h2>Видео успешно загружено!</h2>
              <p>Сейчас вы будете перенаправлены на главную...</p>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="form-container no-sessions-container" style={{ width: '100%' }}>
            <div className="no-sessions-message">
              <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: '#4b5563', fontWeight: '500' }}>
                У вас нет активных или завершенных прохождений
              </p>
              <Link to="/" className="btn btn--primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Выбрать маршрут
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="post-video-map-section">
              <div className="mini-map-container">
                <Map
                  configLoaded={true}
                  onMapClick={handleMapClick}
                  videos={videos}
                  onReset={handleReset}
                  mode="point-selector"
                  selectedPoint={point}
                  routePoints={selectedSession?.route?.path_data || []}
                />
              </div>
            </div>

            <div className="post-video-form-section">
              <div className="form-header">
                <h1>Публикация видео</h1>
                <p className="subtitle">Поделитесь моментами вашего похода</p>
              </div>

              <form onSubmit={handleSubmit} className="video-upload-form">
                {error && <div className="error-alert">{error}</div>}

                <div className="form-group">
                  <label>Прохождение</label>
                  <div className="route-selection-list" style={{ minHeight: 'auto', maxHeight: '400px' }}>
                    {paginatedSessions.length === 0 ? (
                      <div className="no-routes">Нет прохождений</div>
                    ) : (
                      paginatedSessions.map(s => (
                        <label key={s.id} className="route-list-item">
                          <input
                            type="radio"
                            name="session"
                            checked={selectedSessionId === s.id}
                            onChange={() => setSelectedSessionId(s.id)}
                          />
                          <div className="route-item-info">
                            <span className="route-item-title">{s.route_title}</span>
                            <span className="route-item-dist">
                              {new Date(s.start_date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <div className="page-btn-placeholder">
                        {sessionListPage > 1 && (
                          <button
                            type="button"
                            onClick={() => setSessionListPage(p => p - 1)}
                            className="page-btn"
                          >
                            &lt;
                          </button>
                        )}
                      </div>
                      <span>{sessionListPage} / {totalPages}</span>
                      <div className="page-btn-placeholder">
                        {sessionListPage < totalPages && (
                          <button
                            type="button"
                            onClick={() => setSessionListPage(p => p + 1)}
                            className="page-btn"
                          >
                            &gt;
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Видео</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="video-file"
                      accept="video/*"
                      onChange={handleFileChange}
                      required
                    />
                    <label htmlFor="video-file" className="file-label">
                      {videoFile ? 'Видео выбрано' : 'Выберите файл...'}
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting || !selectedSessionId || !videoFile || !point}
                >
                  {submitting ? 'Публикация...' : 'Опубликовать видео'}
                </button>

                {!point && selectedSessionId && (
                  <p className="hint-text animate-pulse">
                    Нажмите на карту слева, чтобы выбрать точку
                  </p>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostVideoPage;
