import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/skeleton.css';
import '../../styles/routePage.css';

/**
 * Скелетон страницы маршрута, обновленный для соответствия стилю InteractiveMapPage
 */
export const SkeletonRoutePage = () => {
  const navigate = useNavigate();

  return (
    <div className="route-page-container skeleton-page" style={{ pointerEvents: 'none' }}>
      <div className="route-page-sidebar">
        <button className="back-button skeleton-box shimmer" style={{ color: 'transparent', width: '90px' }}>
          Назад
        </button>
      </div>

      <div className="route-detail-page">
        <div className="route-detail-content">
          <div className="route-detail-main">
            {/* Header Area */}
            <div className="route-detail-header" style={{ marginBottom: '2rem' }}>
              <div style={{ flex: 1 }}>
                <div className="skeleton-box shimmer" style={{ width: '70%', height: '36px', marginBottom: '12px' }}></div>
                <div className="skeleton-box shimmer" style={{ width: '100%', height: '18px', marginBottom: '8px' }}></div>
                <div className="skeleton-box shimmer" style={{ width: '90%', height: '18px' }}></div>
              </div>
            </div>

            {/* Summary / Breadcrumbs */}
            <div className="route-summary" style={{ marginBottom: '2rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem' }}>
              <div className="skeleton-box shimmer" style={{ width: '100%', height: '24px' }}></div>
            </div>

            {/* Gallery Section */}
            <div className="media-section" style={{ marginBottom: '2.5rem' }}>
              <div className="skeleton-box shimmer" style={{ width: '100%', height: '450px', borderRadius: '16px' }}></div>
            </div>

            {/* Map Section */}
            <div className="route-map-section" style={{ marginBottom: '2.5rem' }}>
              <div className="skeleton-box shimmer" style={{ width: '200px', height: '24px', marginBottom: '1rem' }}></div>
              <div className="skeleton-box shimmer" style={{ width: '100%', height: '400px', borderRadius: '16px' }}></div>
            </div>

            <div className="sessions-section">
              <div className="sessions-header" style={{ marginBottom: '1.5rem' }}>
                <div className="skeleton-box shimmer" style={{ width: '180px', height: '28px' }}></div>
              </div>
              <div className="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '743px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton-box shimmer" style={{ width: '100%', height: '120px', borderRadius: '16px' }}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="route-detail-sidebar">
            <div className="guide-card" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="skeleton-box shimmer" style={{ width: '60px', height: '60px', borderRadius: '50%' }}></div>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-box shimmer" style={{ width: '80%', height: '18px', marginBottom: '6px' }}></div>
                  <div className="skeleton-box shimmer" style={{ width: '50%', height: '14px' }}></div>
                </div>
              </div>

              <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                <div className="skeleton-box shimmer" style={{ width: '100%', height: '14px', marginBottom: '10px' }}></div>
                <div className="skeleton-box shimmer" style={{ width: '90%', height: '14px', marginBottom: '10px' }}></div>
                <div className="skeleton-box shimmer" style={{ width: '70%', height: '14px' }}></div>
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <div className="skeleton-box shimmer" style={{ width: '100%', height: '36px', borderRadius: '10px' }}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonRoutePage;
