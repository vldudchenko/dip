import React from 'react';
import '../../styles/skeleton.css';

/**
 * Скелетон для страницы Интерактивной карты (InteractiveMapPage).
 * Использует динамическую высоту на основе вьюпорта.
 */
export const InteractiveMapSkeleton = () => {
  return (
    <div className="interactive-map-page-v2" style={{ pointerEvents: 'none' }}>
      <div className="map-page-main" style={{ minHeight: '1138px' }}>
        {/* Map Area */}
        <div className="map-container-wrapper" style={{ height: '1138px' }}>
          <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%', borderRadius: '16px' }}></div>
        </div>

        {/* Sidebar */}
        <div className="map-sidebar" style={{ minHeight: '1138px' }}>
          <div className="sidebar-header">
            <div className="skeleton-box shimmer" style={{ width: '150px', height: '22px' }}></div>
          </div>
          <div className="sidebar-content">
            <div className="filter-section">

              <div className="skeleton-box shimmer" style={{ width: '100%', height: '930px', borderRadius: '12px' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Скелетон для страницы редактора пути (RoutePathPage).
 * Использует фиксированную высоту 1122px.
 */
export const RoutePathSkeleton = () => {
  return (
    <div className="route-path-page" style={{ pointerEvents: 'none' }}>
      <div className="route-path-header">
        <div className="header-info">
          <div className="skeleton-box shimmer" style={{ width: '280px', height: '28px', marginBottom: '4px' }}></div>
        </div>
        <div className="route-path-controls" style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="skeleton-box shimmer" style={{ width: '80px', height: '32px', borderRadius: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '90px', height: '32px', borderRadius: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '90px', height: '32px', borderRadius: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '130px', height: '32px', borderRadius: '8px' }}></div>
        </div>
      </div>

      <div className="route-path-main" style={{ minHeight: '1122px' }}>
        <div className="route-path-map-container" style={{ height: '1122px' }}>
          <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%', borderRadius: '16px' }}></div>
        </div>

        <div className="route-path-sidebar" style={{ minHeight: '1122px' }}>
          <div className="sidebar-header">
            <div className="skeleton-box shimmer" style={{ width: '150px', height: '22px' }}></div>
          </div>
          <div className="sidebar-content">
            <div className="filter-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div className="skeleton-box shimmer" style={{ width: '110px', height: '18px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                  <div key={i} className="skeleton-box shimmer" style={{ width: '100%', height: '56px', borderRadius: '12px' }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Экспортируем по умолчанию для обратной совместимости, если нужно
export default InteractiveMapSkeleton;
