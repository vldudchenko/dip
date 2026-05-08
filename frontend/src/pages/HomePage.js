import React, { useState, useEffect } from 'react';
import { API_URL } from '../utils/constants';
import { api } from '../api';
import { RouteCard } from '../components/RouteCard';
import { SkeletonCard } from '../components/Skeletons/SkeletonCard';
import '../styles/homePage.css';

/**
 * Главная страница
 * Отображает список всех маршрутов
 */
export const HomePage = () => {
  const [routes, setRoutes] = useState([]);
  const [guides, setGuides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRoutes = async () => {
      // Сбрасываем ошибку и ставим загрузку перед новым запросом
      setError(null);
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/routes`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить маршруты');
        }
        const data = await response.json();
        
        if (!isMounted) return;
        setRoutes(data);

        // Загружаем информацию о гидах для каждого маршрута, используя кэшированный API
        const guideIds = [...new Set(data.map(route => route.guide_id))];
        const guidesData = {};

        await Promise.all(
          guideIds.map(async (guideId) => {
            try {
              // Используем api.fetchUser, который умеет кэшировать данные
              const userData = await api.fetchUser(guideId);
              if (userData && isMounted) {
                guidesData[guideId] = userData;
              }
            } catch (err) {
              console.error(`Не удалось загрузить гида ${guideId}:`, err);
            }
          })
        );

        if (isMounted) {
          setGuides(prev => ({ ...prev, ...guidesData }));
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRoutes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      {error && <div className="error-container" style={{ marginBottom: '1rem' }}>Ошибка: {error}</div>}
      <div className="home-header">
        <h1>Исследуйте новые горизонты</h1>
        <h1>Загружайте свои впечетления от походов</h1>
      </div>

      <div className="routes-grid skeleton-grid-fix">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : routes.length === 0 ? (
          <div className="no-routes">
            <p>Пока нет доступных маршрутов</p>
          </div>
        ) : (
          routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              guide={guides[route.guide_id]}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default HomePage;