import '../styles/routeCard.css';
import '../styles/skeleton.css';

/**
 * Скелетон (заглушка) для карточки маршрута
 */
export const SkeletonCard = () => {
  return (
    <div className="route-card-premium skeleton-card-override">
      <div className="card-media-section shimmer"></div>
      <div className="card-content">
        <div className="card-header">
          <div className="card-title" style={{ width: '100%' }}>
            <div className="skeleton-title shimmer"></div>
          </div>
        </div>

        <p className="card-description">
          <span className="skeleton-line shimmer"></span>
          <span className="skeleton-line shimmer w-80"></span>
          <span className="skeleton-line shimmer w-60"></span>
        </p>

        <div className="card-footer">
          <div className="card-btn-more skeleton-btn shimmer"></div>
        </div>
      </div>
    </div>
  );
};