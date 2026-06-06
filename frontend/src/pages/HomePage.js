import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { API_URL } from '../utils/constants';
import { api } from '../api';
import { RouteCard } from '../components/RouteCard';
import { SkeletonCard } from '../components/Skeletons/SkeletonCard';
import { DualRangeSlider } from '../components/common/DualRangeSlider';
import { GuideSelectionPanel } from '../components/common/GuideSelectionPanel';
import { useRouteFilters } from '../hooks/useRouteFilters';
import { useFilteredRoutes } from '../hooks/useFilteredRoutes';
import { useGuideSelection } from '../hooks/useGuideSelection';
import { formatDuration, calculateTotalDistance, calculateTotalDuration, getSnappedTime } from '../utils/routeHelpers';
import { TRANSPORT_OPTIONS } from '../utils/routeConstants';
import { RouteSearchPanel } from '../components/Route/RouteSearchPanel';
import '../styles/homePage.css';

/**
 * Главная страница
 * Отображает список всех маршрутов с расширенной фильтрацией и Hero-секцией
 */
export const HomePage = ({ user }) => {
  const [routes, setRoutes] = useState([]);
  const [guides, setGuides] = useState({});
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const routesSectionRef = useRef(null);

  // Состояние для динамических максимумов фильтров
  const [maxAvailableDistance, setMaxAvailableDistance] = useState(5);
  const [maxAvailableDuration, setMaxAvailableDuration] = useState(1440);

  const { filters, draftFilters, updateFilter, applyFilters, resetFilters } = useRouteFilters(maxAvailableDistance, maxAvailableDuration);

  // Загрузка данных
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [routesData, participantSessions, guideSessions] = await Promise.all([
          api.fetchRoutes(),
          user ? api.fetchUserSessions(user.id) : Promise.resolve([]),
          (user && user.is_guide) ? api.fetchGuideSessions(user.id) : Promise.resolve([])
        ]);

        if (!isMounted) return;
        setRoutes(routesData);
        // Объединяем сессии, где пользователь участник и где он гид
        setUserSessions([...participantSessions, ...guideSessions]);

        // Рассчитываем максимумы для фильтров
        if (routesData.length > 0) {
          const distances = routesData.map(r => r.calculatedDistance || 0);
          const durations = routesData.map(r => r.calculatedDuration || 0);
          setMaxAvailableDistance(Math.ceil(Math.max(...distances, 5)));
          setMaxAvailableDuration(Math.ceil(Math.max(...durations, 30)));
        }

        // Загрузка данных гидов (авторов маршрутов)
        const guideIds = [...new Set(routesData.map(r => r.guide_id))];
        const guidesMap = {};

        await Promise.all(guideIds.map(async (id) => {
          try {
            const g = await api.fetchUser(id);
            if (g && isMounted) guidesMap[id] = g;
          } catch (err) {
            console.error(`Error loading guide ${id}:`, err);
          }
        }));

        if (isMounted) setGuides(guidesMap);
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  // Список уникальных гидов для панели выбора
  const uniqueGuides = useMemo(() => {
    return Object.values(guides).sort((a, b) =>
      (a.full_name || a.login).localeCompare(b.full_name || b.login)
    );
  }, [guides]);

  // ID маршрутов, которые пользователь уже проходил (статус 'completed')
  const userCompletedRouteIds = useMemo(() => {
    return new Set(
      userSessions
        .filter(s => s.status === 'completed')
        .map(s => s.route_id)
    );
  }, [userSessions]);

  // Основная логика фильтрации и сортировки
  const filteredRoutes = useFilteredRoutes(routes, filters, userCompletedRouteIds);

  // Состояние выбора гида (поиск, пагинация)
  const guideSelection = useGuideSelection(uniqueGuides);

  const handleScrollToRoutes = () => {
    routesSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isFilterActive = useMemo(() => {
    return filters.sortBy !== 'newest' ||
      filters.selectedGuide !== 'all' ||
      filters.searchQuery !== '' ||
      filters.onlyActive ||
      filters.onlyCompleted ||
      filters.useDistance ||
      filters.useDuration ||
      (filters.transports && filters.transports.length < TRANSPORT_OPTIONS.length);
  }, [filters, maxAvailableDistance, maxAvailableDuration]);

  const isDraftDirty = useMemo(() => {
    return JSON.stringify(filters) !== JSON.stringify(draftFilters);
  }, [filters, draftFilters]);

  const searchPanelProps = {
    filters,
    draftFilters,
    updateFilter,
    applyFilters,
    resetFilters,
    maxAvailableDistance,
    maxAvailableDuration,
    uniqueGuides,
    guideSelection,
    user,
    isDraftDirty,
    isFilterActive
  };

  return (
    <div className="home-page">
      <div className="home-content-layout" ref={routesSectionRef}>
        {/* Спейсер для центрирования основного контента (только для десктопа) */}
        <div className="filters-spacer"></div>

        {/* Кнопка фильтров для мобильных устройств */}
        <button
          className="mobile-filter-btn"
          onClick={() => setIsDrawerOpen(true)}
        >
          <span>Параметры поиска</span>
          {isFilterActive && <span className="filter-dot"></span>}
        </button>

        <div className="routes-section">
          {error && <div className="error-container">Ошибка: {error}</div>}

          <div className="routes-grid">
            {loading ? (
              [...Array(9)].map((_, i) => <SkeletonCard key={i} />)
            ) : filteredRoutes.length === 0 ? (
              <div className="no-routes">
                <p>Маршруты не найдены. Попробуйте смягчить условия поиска.</p>
              </div>
            ) : (
              filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  guide={guides[route.guide_id]}
                />
              ))
            )}
          </div>
        </div>

        {/* Сайдбар с фильтрами для десктопа */}
        <aside className="filters-bar">
          <RouteSearchPanel {...searchPanelProps} />
        </aside>
      </div>

      {/* Drawer для мобильных фильтров */}
      {isDrawerOpen && (
        <div className="filters-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="filters-drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Параметры</h3>
              <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>&times;</button>
            </div>
            <div className="drawer-body">
              <RouteSearchPanel {...searchPanelProps} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;