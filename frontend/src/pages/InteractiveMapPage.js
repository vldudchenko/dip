import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import { Map } from '../components/Map';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import { useVideos } from '../hooks/useVideos';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';
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

/**
 * Хелпер для расчета дистанции маршрута (в км)
 */
const calculateRouteDistance = (pathData) => {
  if (!pathData || pathData.length < 2) return 0;
  const R = 6371; // Радиус Земли в км
  let total = 0;
  for (let i = 1; i < pathData.length; i++) {
    const p1 = Array.isArray(pathData[i - 1]) ? pathData[i - 1] : pathData[i - 1].coords;
    const p2 = Array.isArray(pathData[i]) ? pathData[i] : pathData[i].coords;
    if (!p1 || !p2) continue;
    const dLat = (p2[1] - p1[1]) * Math.PI / 180;
    const dLon = (p2[0] - p1[0]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return total;
};

import { MapPageSkeleton } from '../components/Skeletons/MapPageSkeleton';

export const InteractiveMapPage = ({ user }) => {
  const navigate = useNavigate();
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(provider === 'yandex');
  const { videos, fetchVideos, loading: videosLoading } = useVideos();

  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Фильтры маршрутов
  const [showRoutes, setShowRoutes] = useState(true);
  const [routeSearch, setRouteSearch] = useState('');
  const [selectedTransports, setSelectedTransports] = useState(TRANSPORT_OPTIONS.map(o => o.value));
  const [distanceRange, setDistanceRange] = useState('all'); // all, short, medium, long

  // Фильтры видео
  const [showVideos, setShowVideos] = useState(true);
  const [videoFilterMode, setVideoFilterMode] = useState('all'); // all, by_route
  const [hoveredRouteId, setHoveredRouteId] = useState(null);

  // Список выбранных маршрутов
  const [selectedRouteIds, setSelectedRouteIds] = useState(new Set());
  const [routeListPage, setRouteListPage] = useState(1);
  const ROUTES_PER_PAGE = 5;

  // Загрузка маршрутов
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const res = await fetch(`${API_URL}/routes`);
        if (res.ok) {
          const data = await res.json();
          // Добавляем рассчитанную дистанцию к каждому маршруту для быстрой фильтрации
          const routesWithDist = data.map(r => ({
            ...r,
            calculatedDistance: calculateRouteDistance(r.path_data)
          }));
          setRoutes(routesWithDist);
        }
      } catch (err) {
        console.error('Error loading routes:', err);
      } finally {
        setRoutesLoading(false);
      }
    };
    loadRoutes();
  }, []);

  // Первоначальная загрузка видео
  useEffect(() => {
    fetchVideos(null, null);
    setConfigLoaded(true);
  }, [fetchVideos]);

  const availableRoutes = useMemo(() => {
    return routes.filter(route => {
      const matchesSearch = route.title.toLowerCase().includes(routeSearch.toLowerCase());

      const routeTransports = route.path_data
        ? [...new Set(route.path_data.map(p => p.transport).filter(Boolean))]
        : [];
      const matchesTransport = routeTransports.length === 0
        ? selectedTransports.includes('walking')
        : routeTransports.some(t => selectedTransports.includes(t));

      const dist = route.calculatedDistance;
      let matchesDistance = true;
      if (distanceRange === 'short') matchesDistance = dist < 5;
      else if (distanceRange === 'medium') matchesDistance = dist >= 5 && dist <= 15;
      else if (distanceRange === 'long') matchesDistance = dist > 15;

      const hasPath = route.path_data && route.path_data.length > 0;
      return matchesSearch && matchesTransport && matchesDistance && hasPath;
    });
  }, [routes, routeSearch, selectedTransports, distanceRange]);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setRouteListPage(1);
  }, [routeSearch, selectedTransports, distanceRange]);

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

  const handleTransportToggle = useCallback((value) => {
    setSelectedTransports(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }, []);

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

  if (routesLoading) return <MapPageSkeleton />;

  return (
    <div className="interactive-map-page-v2">
      <div className="map-page-header">
        <div className="header-info">
          <h1>Интерактивная карта</h1>
          <p>На карте: {mapRoutes.length} маршрутов, {filteredVideos.length} видео</p>
        </div>
      </div>

      <div className="map-page-main">
        <div className="map-container-wrapper">
          <Map
            user={user}
            videos={filteredVideos}
            routes={mapRoutes}
            allRoutes={routes}
            fetchVideos={fetchVideos}
            disableFetchOnMove={true}
            ymapsReady={ymapsReady}
            loadError={loadError}
            configLoaded={configLoaded}
            hideLeftControls={true}
            hoveredRouteId={hoveredRouteId}
            onRouteHover={setHoveredRouteId}
            onRouteClick={handleRouteClick}
          />
          {!user && (
            <div className="login-prompt">
              <p>Войдите через Яндекс, чтобы загружать видео на карту</p>
            </div>
          )}
        </div>

        <div className="map-sidebar">
          <div className="sidebar-header">Фильтры отображения</div>
          <div className="sidebar-content">

            {/* Секция маршрутов */}
            <div className="filter-section">
              <div className="filter-section-title">
                <span>Маршруты</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {showRoutes && (
                <div className="filter-controls">
                  <div className="filter-group">
                    <label>Поиск по названию</label>
                    <input
                      type="text"
                      placeholder="Название..."
                      value={routeSearch}
                      onChange={(e) => setRouteSearch(e.target.value)}
                      className="filter-input"
                    />
                  </div>

                  <div className="filter-group">
                    <label>Транспорт</label>
                    <div className="checkbox-grid">
                      {TRANSPORT_OPTIONS.map(opt => (
                        <label key={opt.value} className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedTransports.includes(opt.value)}
                            onChange={() => handleTransportToggle(opt.value)}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

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
                              <span className="route-item-dist">{r.calculatedDistance.toFixed(1)} км</span>
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
                </div>
              )}
            </div>

            {/* Секция видео */}
            <div className="filter-section">
              <div className="filter-section-title">
                <span>Видео маркеры</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={showVideos}
                    onChange={(e) => setShowVideos(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {showVideos && (
                <div className="filter-controls">

                  <div className="filter-group">
                    <label>Отображение</label>
                    <div className="radio-group">
                      <label className="radio-item">
                        <input
                          type="radio"
                          name="videoFilter"
                          value="all"
                          checked={videoFilterMode === 'all'}
                          onChange={() => setVideoFilterMode('all')}
                        />
                        <span>Все видео</span>
                      </label>
                      <label className="radio-item">
                        <input
                          type="radio"
                          name="videoFilter"
                          value="by_route"
                          checked={videoFilterMode === 'by_route'}
                          onChange={() => setVideoFilterMode('by_route')}
                        />
                        <span>Только по выбранным маршрутам</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMapPage;