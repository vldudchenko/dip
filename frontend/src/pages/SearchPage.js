import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { RouteCard } from '../components/RouteCard';
import { SkeletonCard } from '../components/Skeletons/SkeletonCard';
import '../styles/searchPage.css';

export const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('query') || '';

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const routesData = await api.searchRoutes(query);
        setRoutes(routesData);
      } catch (err) {
        setError('Произошла ошибка при поиске');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Результаты поиска для: "{query}"</h1>
      </div>

      {loading ? (
        <div className="search-loading">
          <div className="results-section">
            <h2>Маршруты</h2>
            <div className="routes-grid">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="error-container">{error}</div>
      ) : (
        <>
          <section className="results-section">
            <h2>Маршруты</h2>
            {routes.length === 0 ? (
              <p className="no-results">Маршруты не найдены</p>
            ) : (
              <div className="routes-grid">
                {routes.map(route => (
                  <RouteCard key={route.id} route={route} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default SearchPage;
