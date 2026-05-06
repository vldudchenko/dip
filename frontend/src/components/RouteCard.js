import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';
import { SkeletonCard } from './SkeletonCard';
import '../styles/routeCard.css';

/**
 * Карточка маршрута для главной страницы
 */
export const RouteCard = ({ route, guide }) => {
  const [images, setImages] = useState([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCardData = async () => {
      try {
        // Загружаем изображения
        const imagesResp = await fetch(`${API_URL}/images/route/${route.id}`);
        if (imagesResp.ok) {
          const imagesData = await imagesResp.json();
          setImages(imagesData);
        }

        // Загружаем сессии для подсчета "ожидают набора"
        const sessionsResp = await fetch(`${API_URL}/sessions/route/${route.id}`);
        if (sessionsResp.ok) {
          const sessionsData = await sessionsResp.json();
          const active = sessionsData.filter(s =>
            s.status === 'waiting' || s.status === 'pending_date'
          ).length;
          setActiveSessionsCount(active);
        }
      } catch (err) {
        console.error(`Error fetching data for route ${route.id}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchCardData();
  }, [route.id]);

  const handlePrevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const avatarUrl = guide?.avatar ? (guide.avatar.startsWith('http') ? guide.avatar : `${API_URL}${guide.avatar}`) : defaultAvatar;

  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div
      className="route-card-premium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-media-section">
        {images.length > 0 ? (
          <>
            <img
              src={images[activeImageIndex].file_url}
              alt={route.title}
              className="card-image"
            />
            {images.length > 1 && isHovered && (
              <>
                <button className="slider-btn prev" onClick={handlePrevImage}>‹</button>
                <button className="slider-btn next" onClick={handleNextImage}>›</button>
                <div className="slider-dots">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`dot ${idx === activeImageIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="card-image-placeholder">
            <span>Нет фото</span>
          </div>
        )}

        {activeSessionsCount > 0 && (
          <div className="card-badge recruiting">
            Ожидают набора: {activeSessionsCount}
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{route.title}</h3>
        </div>

        <p className="card-description">{route.description}</p>
        <div className="card-footer">
          <Link to={`/route/${route.id}`} className="card-btn-more">
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  );
};
