import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

// Хуки
import { useAuth } from '../hooks/useAuth';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import { useRouteData } from '../hooks/useRouteData';
import { useRouteSessions } from '../hooks/useRouteSessions';
import { useRouteComments } from '../hooks/useRouteComments';
import { useGeocoding } from '../hooks/useGeocoding';

// Компоненты
import { SkeletonRoutePage } from '../components/Skeletons/SkeletonRoutePage';
import RouteHeader from '../components/Route/RouteHeader';
import RouteSummary from '../components/Route/RouteSummary';
import RouteGallery from '../components/Route/RouteGallery';
import RouteMapSection from '../components/Route/RouteMapSection';
import RouteSessionsSection from '../components/Route/RouteSessionsSection';
import RouteSidebar from '../components/Route/RouteSidebar';
import RouteCommentsSection from '../components/Route/RouteCommentsSection';

// Утилиты
import { API_URL } from '../utils/constants';

/**
 * Страница просмотра и редактирования маршрута.
 */
export const RoutePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const storedUserId = localStorage.getItem('user_id');
  const currentUserId = storedUserId && storedUserId !== 'undefined' ? storedUserId : null;
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(provider === 'yandex');

  const isCreating = id === 'new';

  // Состояние режима предпросмотра (по умолчанию true, если не передано обратное в state)
  const [isPreviewMode, setIsPreviewMode] = useState(() => {
    if (isCreating) return false;
    if (location.state && location.state.isPreviewMode !== undefined) {
      return location.state.isPreviewMode;
    }
    return true;
  });

  // Использование кастомных хуков
  const {
    route,
    guide,
    routeStats,
    routeVideos,
    routeImages,
    loading,
    mediaLoading,
    error,
    createRoute,
    updateRouteInfo,
    uploadMedia,
    deleteMedia
  } = useRouteData(id, currentUserId);

  const {
    sessions,
    userJoinedSessions,
    sessionGuides,
    joinSession,
    leaveSession,
    updateSession,
    deleteSession,
    refreshSessions
  } = useRouteSessions(id, currentUserId);

  const {
    comments,
    addComment,
    replyComment,
    editComment,
    deleteComment
  } = useRouteComments(id, currentUserId);

  // Хук для фонового получения адресов точек маршрута
  const routeAddresses = useGeocoding(route?.path_data);

  // Обработчик создания маршрута
  const handleSaveRoute = useCallback(async (title, description) => {
    try {
      if (isCreating) {
        const newRoute = await createRoute(title, description);
        navigate(`/route/${newRoute.id}`, { replace: true, state: { isPreviewMode: false } });
      } else {
        await updateRouteInfo(title, description);
      }
    } catch (err) {
      alert(err.message);
    }
  }, [isCreating, createRoute, updateRouteInfo, navigate]);

  // Обработчик удаления маршрута
  const handleDeleteRoute = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/routes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Не удалось удалить маршрут');
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  }, [id, currentUserId, navigate]);

  // Вычисляемые права доступа
  const isRouteOwner = currentUserId === route?.guide_id && currentUser?.is_guide && !isPreviewMode;
  const isAnyGuide = currentUser?.is_guide;
  const realIsGuide = currentUserId === route?.guide_id && currentUser?.is_guide;

  // Если мы только что создаем маршрут, то владельцем является текущий пользователь-гид
  const effectiveIsRouteOwner = isCreating ? (currentUser?.is_guide && !isPreviewMode) : isRouteOwner;
  const effectiveRealIsGuide = isCreating ? currentUser?.is_guide : realIsGuide;

  if (loading) return <SkeletonRoutePage />;
  if (error && !isCreating) return <div className="route-detail-page">Ошибка: {error}</div>;
  if (!route && !isCreating) return <div className="route-detail-page">Маршрут не найден</div>;

  return (
    <div className="route-page-container">
      <div className="route-page-sidebar">
        <button className="back-button" onClick={() => navigate(-1)}>
          Назад
        </button>
      </div>

      <div className="route-detail-page">
        <div className="route-detail-content">
          <div className="route-detail-main">
            {/* Секция заголовка и редактирования основной инфо */}
            <RouteHeader
              route={route}
              isGuide={effectiveIsRouteOwner}
              onSave={handleSaveRoute}
              saving={loading}
              isCreating={isCreating}
              onCancel={() => navigate(-1)}
            />

            {!isCreating && (
              <>
                {/* Текстовое резюме пути */}
                <RouteSummary
                  pathData={route?.path_data}
                  addresses={routeAddresses}
                />

                {/* Галерея изображений и видео */}
                <RouteGallery
                  images={routeImages.filter(img => img.user_id === route?.guide_id)}
                  videos={routeVideos.filter(vid => vid.user_id === route?.guide_id)}
                  isGuide={effectiveIsRouteOwner}
                  onUpload={uploadMedia}
                  onDelete={deleteMedia}
                  loading={mediaLoading}
                />

                {/* Карта маршрута */}
                <RouteMapSection
                  routeId={id}
                  pathData={route?.path_data}
                  videos={routeVideos}
                  ymapsReady={ymapsReady}
                  loadError={loadError}
                  isGuide={effectiveIsRouteOwner}
                />

                {/* Управление прохождениями (сессиями) */}
                <RouteSessionsSection
                  routeId={id}
                  sessions={sessions}
                  currentUserId={currentUserId}
                  isRouteOwner={effectiveIsRouteOwner}
                  isAnyGuide={isAnyGuide}
                  userJoinedSessions={userJoinedSessions}
                  sessionGuides={sessionGuides}
                  onJoin={joinSession}
                  onLeave={leaveSession}
                  onEdit={updateSession}
                  onDelete={deleteSession}
                  onStatusChange={(sessionId, _, newStatus) => updateSession(sessionId, { status: newStatus })}
                  refreshSessions={refreshSessions}
                />

                {/* Комментарии (отзывы и вопросы) */}
                <RouteCommentsSection
                  comments={comments}
                  currentUserId={currentUserId}
                  isGuide={effectiveRealIsGuide}
                  routeGuideId={route?.guide_id}
                  onAdd={addComment}
                  onReply={replyComment}
                  onEdit={editComment}
                  onDelete={deleteComment}
                />
              </>
            )}
          </div>

          {/* Боковая панель с информацией о гиде и статистикой */}
          <RouteSidebar
            guide={isCreating ? currentUser : guide}
            route={route}
            stats={routeStats}
            realIsGuide={effectiveRealIsGuide}
            isPreviewMode={isPreviewMode}
            onTogglePreview={setIsPreviewMode}
            onDeleteRoute={handleDeleteRoute}
          />
        </div>
      </div>
    </div>
  );
};

export default RoutePage;