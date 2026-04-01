import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../utils/constants';

const DIFFICULTY_LABELS = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный'
};

const DIFFICULTY_CLASSES = {
  easy: 'difficulty-easy',
  medium: 'difficulty-medium',
  hard: 'difficulty-hard'
};

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
    const fetchRoutes = async () => {
      try {
        const response = await fetch(`${API_URL}/routes`);
        if (!response.ok) {
          throw new Error('Не удалось загрузить маршруты');
        }
        const data = await response.json();
        setRoutes(data);

        // Загружаем информацию о гидах для каждого маршрута
        const guideIds = [...new Set(data.map(route => route.guide_id))];
        const guidesData = {};
        
        await Promise.all(
          guideIds.map(async (guideId) => {
            try {
              const guideResponse = await fetch(`${API_URL}/users/${guideId}`);
              if (guideResponse.ok) {
                guidesData[guideId] = await guideResponse.json();
              }
            } catch (err) {
              console.error(`Не удалось загрузить гида ${guideId}:`, err);
            }
          })
        );
        
        setGuides(guidesData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  if (loading) {
    return <div className="home-page">Загрузка маршрутов...</div>;
  }

  if (error) {
    return <div className="home-page">Ошибка: {error}</div>;
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Все маршруты</h1>
        <p className="routes-count">Найдено маршрутов: {routes.length}</p>
      </div>

      {routes.length === 0 ? (
        <div className="no-routes">
          <p>Пока нет доступных маршрутов</p>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map((route) => {
            const guide = guides[route.guide_id];
            return (
              <div key={route.id} className="route-card-main">
                <div className="route-card-header">
                  <h3 className="route-card-title">{route.title}</h3>
                  <span className={`route-card-difficulty ${DIFFICULTY_CLASSES[route.difficulty]}`}>
                    {DIFFICULTY_LABELS[route.difficulty]}
                  </span>
                </div>

                {route.description && (
                  <p className="route-card-description">{route.description}</p>
                )}

                <div className="route-card-info">
                  <div className="route-card-detail">
                    <span className="label">💰 Цена:</span>
                    <span className="value">{route.price} ₽</span>
                  </div>
                  <div className="route-card-detail">
                    <span className="label">👥 Мин. группа:</span>
                    <span className="value">от {route.min_people} чел.</span>
                  </div>
                </div>

                {guide && guide.login && (
                  <div className="route-card-guide">
                    <span className="label">Гид:</span>
                    <Link to={`/guide/${guide.login}`} className="guide-link">
                      {guide.login}
                    </Link>
                  </div>
                )}

                <div className="route-card-footer">
                  <Link 
                    to={`/route/${route.id}`} 
                    className="btn-view-route"
                  >
                    Подробнее
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomePage;
