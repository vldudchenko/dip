import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import { api } from '../api';
import { Map } from '../components/Map';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import { useVideos } from '../hooks/useVideos';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';
import {
  formatDuration,
  getSnappedTime,
  calculateTotalDistance,
  calculateTotalDuration
} from '../utils/routeHelpers';
import { useRouteFilters } from '../hooks/useRouteFilters';
import { RouteSearchPanel } from '../components/Route/RouteSearchPanel';
import '../styles/interactiveMapPage.css';

// CSS fix for focus outline on map elements
const style = document.createElement('style');
style.textContent = `
  .leaflet-interactive:focus, 
  .leaflet-container :focus,
  .ymaps3x0--map :focus,
  .ymaps3x0--marker:focus {
    outline: none !important;
  }
`;
document.head.appendChild(style);


import { InteractiveMapSkeleton } from '../components/Skeletons/MapPageSkeleton';

export const InteractiveMapPage = ({ user }) => {
  const navigate = useNavigate();
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(true); // Загружаем в фоне всегда
  const { videos, fetchVideos, loading: videosLoading } = useVideos();

  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Фильтры маршрутов
  const [showRoutes, setShowRoutes] = useState(true);
  const [maxAvailableDistance, setMaxAvailableDistance] = useState(50);
  const [maxAvailableTime, setMaxAvailableTime] = useState(180);

  const {
    filters,
    draftFilters,
    updateFilter,
    applyFilters,
    resetFilters
  } = useRouteFilters(maxAvailableDistance, maxAvailableTime);

  // Фильтры видео
  const [showVideos, setShowVideos] = useState(true);
  const [videoFilterMode, setVideoFilterMode] = useState('by_route'); // all, by_route
  const [hoveredRouteId, setHoveredRouteId] = useState(null);
  const [showMilestones, setShowMilestones] = useState(true);

  // Список выбранных маршрутов
  const [selectedRouteIds, setSelectedRouteIds] = useState(new Set());
  const [routeListPage, setRouteListPage] = useState(1);
  const ROUTES_PER_PAGE = 5;

  // Загрузка маршрутов с учетом фильтров (серверная фильтрация)
  useEffect(() => {
    const loadFilteredRoutes = async () => {
      setRoutesLoading(true);
      try {
        const data = await api.searchRoutes({ ...filters, onlyWithPaths: true });

        // Добавляем рассчитанную дистанцию и время к каждому маршруту (если сервер их еще не прислал)
        const routesWithStats = data.map(r => ({
          ...r,
          calculatedDistance: r.calculatedDistance || calculateTotalDistance(r.path_data),
          calculatedDuration: r.calculatedDuration || calculateTotalDuration(r.path_data)
        }));

        setRoutes(routesWithStats);

        // Обновляем максимумы только при первой загрузке (если нужно)
        if (!configLoaded && routesWithStats.length > 0) {
          const maxDist = Math.ceil(Math.max(...routesWithStats.map(r => r.calculatedDistance), 5));
          const maxDur = Math.ceil(Math.max(...routesWithStats.map(r => r.calculatedDuration), 30));
          setMaxAvailableDistance(maxDist);
          setMaxAvailableTime(maxDur);
          setConfigLoaded(true);
        }
      } catch (err) {
        console.error('Error loading routes:', err);
      } finally {
        setRoutesLoading(false);
      }
    };

    loadFilteredRoutes();
  }, [filters, configLoaded]);

  // Первоначальная загрузка видео
  useEffect(() => {
    fetchVideos(null, null);
  }, [fetchVideos]);

  const availableRoutes = useMemo(() => {
    // Дополнительные клиентские фильтры, которых может не быть в API (напр. транспорт)
    return routes.filter(r => {
      const routeTransports = r.path_data ? r.path_data.map(p => p.transport || 'walking') : ['walking'];
      const matchesTransport = routeTransports.some(t => filters.transports.includes(t));
      return matchesTransport;
    });
  }, [routes, filters.transports]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setRouteListPage(1);
  }, [availableRoutes]);

  // Маршруты, которые реально отображаются на карте
  const mapRoutes = useMemo(() => {
    if (!showRoutes) return [];
    return routes.filter(r => selectedRouteIds.has(r.id));
  }, [routes, showRoutes, selectedRouteIds]);

  // Фильтрация видео
  const filteredVideos = useMemo(() => {
    if (!showVideos) return [];
    return videos.filter(video => {
      const vRouteId = video.routeId || video.route_id;
      if (videoFilterMode === 'by_route') {
        return vRouteId && selectedRouteIds.has(vRouteId);
      }
      return true;
    });
  }, [videos, showVideos, videoFilterMode, selectedRouteIds]);

  const isDraftDirty = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(draftFilters);
  }, [filters, draftFilters]);

  const isFilterActive = useMemo(() => {
    return filters.sortBy !== 'popular' || // В карте по умолчанию popular
      filters.searchQuery !== '' ||
      filters.useDistance ||
      filters.useDuration ||
      (filters.transports && filters.transports.length < TRANSPORT_OPTIONS.length);
  }, [filters, maxAvailableDistance, maxAvailableTime]);

  const searchPanelProps = {
    filters,
    draftFilters,
    updateFilter,
    applyFilters,
    resetFilters,
    maxAvailableDistance,
    maxAvailableDuration: maxAvailableTime,
    user,
    isDraftDirty,
    isFilterActive,
    showGuide: false, // На карте пока не фильтруем по гиду в поиске
    showAdvanced: false // Скрываем "скрыть пройденные" для карты
  };

  const handleRouteToggle = useCallback((id) => {
    setSelectedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRouteClick = useCallback((id) => {
    navigate(`/route/${id}`);
  }, [navigate]);

  const paginatedAvailableRoutes = useMemo(() => {
    const start = (routeListPage - 1) * ROUTES_PER_PAGE;
    return availableRoutes.slice(start, start + ROUTES_PER_PAGE);
  }, [availableRoutes, routeListPage]);

  const totalPages = Math.ceil(availableRoutes.length / ROUTES_PER_PAGE);

  if (routesLoading) return <InteractiveMapSkeleton />;

  return (
    <div className="interactive-map-page-v2">
      <div className="map-page-main">
        <div className="map-container-wrapper">
          <Map
            user={user}
            videos={filteredVideos}
            routes={mapRoutes}
            allRoutes={routes}
            fetchVideos={fetchVideos}
            disableFetchOnMove={false}
            ymapsReady={ymapsReady}
            loadError={loadError}
            configLoaded={configLoaded}
            hideLeftControls={true}
            hoveredRouteId={hoveredRouteId}
            onRouteHover={setHoveredRouteId}
            onRouteClick={handleRouteClick}
            showMilestones={showMilestones}
            showVideos={showVideos}
            videoFilterMode={videoFilterMode}
          />
        </div>

        <div className="map-sidebar">
          <div className="sidebar-header">Фильтры отображения</div>
          <div className="sidebar-content">

            {/* Секция маршрутов */}
            <div className="filter-section">
              <div className="filter-section-title filter-section-title--active">
                <span>Маршруты</span>
              </div>

              <div className="filter-controls">
                <RouteSearchPanel
                  {...searchPanelProps}
                  showSort={false}
                  showMilestonesToggle={true}
                  showMilestones={showMilestones}
                  onMilestonesToggle={setShowMilestones}
                  showVideosToggle={true}
                  showVideos={showVideos}
                  videoFilterMode={videoFilterMode}
                  onVideoModeChange={(show, mode) => {
                    setShowVideos(show);
                    setVideoFilterMode(mode);
                  }}
                  mapAdditions={(
                    <div className="filter-group">
                      <label>Добавить на карту</label>
                      <div className="route-selection-list">
                        {paginatedAvailableRoutes.length === 0 ? (
                          <div className="no-routes">Нет маршрутов</div>
                        ) : (
                          paginatedAvailableRoutes.map(r => (
                            <label
                              key={r.id}
                              className="route-list-item"
                              onMouseEnter={() => setHoveredRouteId(r.id)}
                              onMouseLeave={() => setHoveredRouteId(null)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRouteIds.has(r.id)}
                                onChange={() => handleRouteToggle(r.id)}
                              />
                              <div className="route-item-info">
                                <span className="route-item-title">{r.title}</span>
                                <div className="route-item-stats">
                                  <span className="route-item-dist">{r.calculatedDistance.toFixed(1)} км</span>
                                  <span className="route-item-dur">
                                    {formatDuration(r.calculatedDuration)}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      {totalPages > 1 && (
                        <div className="pagination-controls">
                          <div className="page-btn-placeholder">
                            {routeListPage > 1 && (
                              <button
                                onClick={() => setRouteListPage(p => p - 1)}
                                className="page-btn"
                              >
                                &lt;
                              </button>
                            )}
                          </div>
                          <span>{routeListPage} / {totalPages}</span>
                          <div className="page-btn-placeholder">
                            {routeListPage < totalPages && (
                              <button
                                onClick={() => setRouteListPage(p => p + 1)}
                                className="page-btn"
                              >
                                &gt;
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMapPage;