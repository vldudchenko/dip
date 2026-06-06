import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Map } from '../components/Map';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import '../styles/postVideoPage.css';

export const PostVideoPage = ({ user, authLoading }) => {
  const navigate = useNavigate();
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(true); // Загружаем в фоне всегда
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
        const sessionsList = Array.isArray(data)
          ? data
            .map(s => ({
              ...s,
              route_title: s.route?.title || 'Без названия'
            }))
            .filter(s => s && (s.status === 'in_progress' || s.status === 'completed'))
          : [];

        // Сортируем сессии по дате начала (от новых к старым)
        const sortedSessions = sessionsList.sort((a, b) => {
          const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
          return dateB - dateA;
        });

        // Оставляем только самую новую сессию для каждого уникального маршрута (по route_id)
        const uniqueSessions = [];
        const seenRouteIds = new Set();
        for (const s of sortedSessions) {
          if (s.route_id) {
            if (!seenRouteIds.has(s.route_id)) {
              seenRouteIds.add(s.route_id);
              uniqueSessions.push(s);
            }
          } else {
            uniqueSessions.push(s);
          }
        }

        setSessions(uniqueSessions);
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

  const [isErrorExiting, setIsErrorExiting] = useState(false);

  useEffect(() => {
    if (error) {
      setIsErrorExiting(false);
      const timer = setTimeout(() => {
        setIsErrorExiting(true);
        setTimeout(() => {
          setError(null);
          setIsErrorExiting(false);
        }, 500);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
    const file = e.target.files[0];
    if (!file) {
      setVideoFile(null);
      return;
    }

    // 1. Проверка размера (100 МБ)
    const MAX_SIZE_MB = 100;
    const maxSizeInBytes = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setError(`Размер видео превышает ${MAX_SIZE_MB} МБ.\nПожалуйста, выберите файл меньшего размера.`);
      setVideoFile(null);
      e.target.value = '';
      return;
    }

    // 2. Проверка длительности (10 сек - 1 мин)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = video.duration;

      if (duration < 10) {
        setError('Видео слишком короткое.\nМинимальная длительность — 10 секунд.');
        setVideoFile(null);
        e.target.value = '';
      } else if (duration > 60) {
        setError('Видео слишком длинное.\nМаксимальная длительность — 1 минута.');
        setVideoFile(null);
        e.target.value = '';
      } else {
        setError(null);
        setVideoFile(file);
      }
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      setError('Не удалось прочитать видеофайл. Попробуйте другой формат.');
      setVideoFile(null);
      e.target.value = '';
    };
  };

  const handleMapClick = (coords) => {
    setPoint(coords);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSession || !videoFile || !point) {
      setError('Пожалуйста, заполните все поля\nи выберите точку на карте');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
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

  return (
    <div className="post-video-page">
      <div className="post-video-layout">
        {success ? (
          <div className="success-container">
            <div className="status-icon-wrapper">
              <svg viewBox="0 0 24 24" className="status-icon" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2>Видео успешно загружено!</h2>
            <p>Сейчас вы будете перенаправлены на главную страницу...</p>
          </div>
        ) : (loading || authLoading) ? (
          <div className="loading-container" style={{ minHeight: '400px' }}>
            <div className="loading-spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="no-sessions-container">
            <div className="status-icon-wrapper">
              <svg viewBox="0 0 24 24" className="status-icon" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2>У вас нет прохождений</h2>
            <p>Для публикации видео необходимо иметь активное или завершенное прохождение маршрута.</p>
            <Link to="/" className="btn btn--primary" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              Выбрать маршрут
            </Link>
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
                  routeId={selectedSession?.route_id}
                  ymapsReady={ymapsReady}
                  loadError={loadError}
                />
              </div>
            </div>

            <div className="post-video-form-section">
              <div className="form-header">
                <h1>Публикация видео</h1>
                <p className="subtitle">Поделитесь моментами вашего похода</p>
              </div>

              <form onSubmit={handleSubmit} className="video-upload-form">
                {error && (
                  <div className={`error-alert ${isErrorExiting ? 'exiting' : ''}`}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label id="session-selection-label">Прохождение</label>
                  <div className="route-selection-list" role="radiogroup" aria-labelledby="session-selection-label" style={{ minHeight: 'auto', maxHeight: '400px' }}>
                    {paginatedSessions.length === 0 ? (
                      <div className="no-routes">Нет прохождений</div>
                    ) : (
                      paginatedSessions.map(s => (
                        <label key={s.id} className="route-list-item" htmlFor={`session-${s.id}`}>
                          <input
                            id={`session-${s.id}`}
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
                  <label htmlFor="video-file">Видео</label>

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
                  <p className="form-help-text">
                    Максимальный размер файла: 100 МБ.<br />Длительность видео: от 10 секунд до 1 минуты. <br />
                    Загружая видео, вы подтверждаете, что обладаете необходимыми правами на данный контент, а также гарантируете отсутствие материалов, нарушающих законодательство, авторские права, права третьих лиц, правила платформы или содержащих запрещённый, оскорбительный либо вредоносный контент.
                  </p>
                </div>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting || !selectedSessionId || !videoFile || !point}
                >
                  {submitting ? 'Публикация...' : 'Опубликовать видео'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PostVideoPage;
