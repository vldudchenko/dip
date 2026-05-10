import React from 'react';
import '../../styles/skeleton.css';

/**
 * Универсальный скелетон, использующий реальные классы страниц для идеального выравнивания
 */
export const MapPageSkeleton = ({ isRoutePath = false }) => {
  const containerClass = isRoutePath ? "route-path-page" : "interactive-map-page-v2";
  const headerClass = isRoutePath ? "route-path-header" : "map-page-header";
  const mainClass = isRoutePath ? "route-path-main" : "map-page-main";
  const sidebarClass = isRoutePath ? "route-path-sidebar" : "map-sidebar";
  const mapContainerClass = isRoutePath ? "route-path-map-container" : "map-container-wrapper";

  return (
    <div className={containerClass} style={{ pointerEvents: 'none' }}>
      <div className={headerClass}>
        <div className="header-info">
          <div className="skeleton-box shimmer" style={{ width: '250px', height: '24px', marginBottom: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '180px', height: '14px' }}></div>
        </div>
      </div>

      <div className={mainClass}>
        <div className={mapContainerClass}>
          <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%' }}></div>
        </div>

        <div className={sidebarClass}>
          <div className="sidebar-header">
            <div className="skeleton-box shimmer" style={{ width: '150px', height: '20px' }}></div>
          </div>
          <div className="sidebar-content">
            {[1, 2, 3].map(i => (
              <div key={i} className={isRoutePath ? "point-item" : "filter-section"} style={{ 
                border: isRoutePath ? '1px solid #eee' : 'none', 
                boxShadow: 'none',
                marginBottom: '1rem',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div className="skeleton-box shimmer" style={{ width: '100px', height: '12px', marginBottom: '12px' }}></div>
                <div className="skeleton-box shimmer" style={{ width: '100%', height: '40px', borderRadius: '10px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPageSkeleton;
