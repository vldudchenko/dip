import React, { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../utils/constants';
import { Map } from '../components/Map';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import { useVideos } from '../hooks/useVideos';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';
import '../styles/interactiveMapPage.css';

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

export const InteractiveMapPage = ({ user }) => {
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
  const [videoType, setVideoType] = useState('all'); // all, regular, live
  const [videoDuration, setVideoDuration] = useState('all'); // all, short, medium, long

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

  // Фильтрация маршрутов
  const filteredRoutes = useMemo(() => {
    if (!showRoutes) return [];
    return routes.filter(route => {
      const matchesSearch = route.title.toLowerCase().includes(routeSearch.toLowerCase());
      
      // Проверка транспорта (хотя бы один сегмент должен соответствовать)
      const routeTransports = route.path_data 
        ? [...new Set(route.path_data.map(p => p.transport).filter(Boolean))] 
        : [];
      // Если у маршрута нет инфы о транспорте, считаем его "walking" по умолчанию или просто показываем
      const matchesTransport = routeTransports.length === 0 
        ? selectedTransports.includes('walking')
        : routeTransports.some(t => selectedTransports.includes(t));

      const dist = route.calculatedDistance;
      let matchesDistance = true;
      if (distanceRange === 'short') matchesDistance = dist < 5;
      else if (distanceRange === 'medium') matchesDistance = dist >= 5 && dist <= 15;
      else if (distanceRange === 'long') matchesDistance = dist > 15;

      return matchesSearch && matchesTransport && matchesDistance;
    });
  }, [routes, showRoutes, routeSearch, selectedTransports, distanceRange]);

  // Фильтрация видео
  const filteredVideos = useMemo(() => {
    if (!showVideos) return [];
    return videos.filter(video => {
      let matchesType = true;
      if (videoType === 'live') matchesType = video.isLive;
      else if (videoType === 'regular') matchesType = !video.isLive;

      let matchesDuration = true;
      const duration = video.videoDuration || 0;
      if (videoDuration === 'short') matchesDuration = duration < 60;
      else if (videoDuration === 'medium') matchesDuration = duration >= 60 && duration <= 300;
      else if (videoDuration === 'long') matchesDuration = duration > 300;

      return matchesType && matchesDuration;
    });
  }, [videos, showVideos, videoType, videoDuration]);

  const handleTransportToggle = (value) => {
    setSelectedTransports(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="interactive-map-page-v2">
      <div className="map-page-header">
        <div className="header-info">
          <h1>Интерактивная карта</h1>
          <p>Найдено: {filteredRoutes.length} маршрутов, {filteredVideos.length} видео</p>
        </div>
      </div>

      <div className="map-page-main">
        <div className="map-container-wrapper">
          <Map
            user={user}
            videos={filteredVideos}
            routes={filteredRoutes}
            fetchVideos={fetchVideos}
            disableFetchOnMove={true}
            ymapsReady={ymapsReady}
            loadError={loadError}
            configLoaded={configLoaded}
            hideLeftControls={true}
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
                    <label>Дистанция</label>
                    <select 
                      value={distanceRange} 
                      onChange={(e) => setDistanceRange(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Все</option>
                      <option value="short">До 5 км</option>
                      <option value="medium">5 - 15 км</option>
                      <option value="long">Более 15 км</option>
                    </select>
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
                    <label>Тип видео</label>
                    <div className="radio-group">
                      <label className="radio-item">
                        <input 
                          type="radio" 
                          name="videoType" 
                          value="all" 
                          checked={videoType === 'all'} 
                          onChange={(e) => setVideoType(e.target.value)}
                        />
                        <span>Все</span>
                      </label>
                      <label className="radio-item">
                        <input 
                          type="radio" 
                          name="videoType" 
                          value="regular" 
                          checked={videoType === 'regular'} 
                          onChange={(e) => setVideoType(e.target.value)}
                        />
                        <span>Обычные</span>
                      </label>
                      <label className="radio-item">
                        <input 
                          type="radio" 
                          name="videoType" 
                          value="live" 
                          checked={videoType === 'live'} 
                          onChange={(e) => setVideoType(e.target.value)}
                        />
                        <span>Live</span>
                      </label>
                    </div>
                  </div>

                  <div className="filter-group">
                    <label>Длительность</label>
                    <select 
                      value={videoDuration} 
                      onChange={(e) => setVideoDuration(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Любая</option>
                      <option value="short">До 1 мин</option>
                      <option value="medium">1 - 5 мин</option>
                      <option value="long">Более 5 мин</option>
                    </select>
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
