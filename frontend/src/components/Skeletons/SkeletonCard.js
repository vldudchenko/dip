import '../../styles/routeCard.css';
import '../../styles/skeleton.css';

/**
 * Скелетон (заглушка) для карточки маршрута
 */
export const SkeletonCard = () => {
  return (
    <div className="route-card-premium skeleton-card-override">
      <div className="card-media-section shimmer"></div>
      <div className="card-content">
        <div className="card-header">
          <div className="skeleton-title shimmer" style={{ height: '25px', width: '85%', borderRadius: '6px', margin: '0' }}></div>
        </div>

        <div className="card-description" style={{ minHeight: '4.8em', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '4px' }}>
          <div className="skeleton-line shimmer" style={{ height: '14px', marginBottom: '10px', borderRadius: '4px' }}></div>
          <div className="skeleton-line shimmer w-80" style={{ height: '14px', marginBottom: '10px', borderRadius: '4px' }}></div>
          <div className="skeleton-line shimmer w-60" style={{ height: '14px', borderRadius: '4px' }}></div>
        </div>

        <div className="card-footer">
          <div className="card-btn-more shimmer" style={{ background: '#e5e7eb', color: 'transparent', borderColor: 'transparent', pointerEvents: 'none' }}>
            Подробнее
          </div>
        </div>
      </div>
    </div>
  );
};