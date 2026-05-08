import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/routePage.css';

export const SkeletonRoutePage = () => {
  const navigate = useNavigate();

  return (
    <div className="route-page-container">
      <div className="route-page-sidebar">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          style={{
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-loading 1.5s infinite',
            borderColor: '#e5e7eb',
            color: 'transparent'
          }}
        >
          Назад
        </button>
      </div>
      <div className="route-detail-page">
        <div className="route-detail-content">
          <div className="route-detail-main">
            {/* Header */}
            <div className="route-detail-header">
              <div className="skeleton-box" style={{ width: '60%', height: '34px' }}></div>
            </div>

            {/* Description */}
            <div className="route-detail-description">
              <div style={{ margin: '16px 0' }}>
                <div className="skeleton-box" style={{ width: '100%', height: '20px', marginBottom: '10px' }}></div>
                <div className="skeleton-box" style={{ width: '90%', height: '20px', marginBottom: '10px' }}></div>
                <div className="skeleton-box" style={{ width: '95%', height: '20px' }}></div>
              </div>
            </div>

            {/* Route Summary (Breadcrumbs) */}
            <div className="route-summary" style={{ padding: '12px' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
            </div>

            {/* Gallery */}
            <div className="route-detail-gallery" style={{ marginBottom: '20px' }}>
              <div className="skeleton-box" style={{ width: '100%', height: '500px' }}></div>
            </div>

            {/* Map */}
            <div className="route-detail-map" style={{ marginBottom: '40px' }}>
              <div className="skeleton-box" style={{ height: '400px', width: '100%', borderRadius: '8px' }}></div>
            </div>

            {/* Sessions Header */}
            <div className="sessions-header">
              <div className="skeleton-box" style={{ width: '30%', height: '32px' }}></div>
            </div>

            {/* Sessions List */}
            <div className="sessions-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="session-card" style={{ borderLeft: '4px solid #eee', padding: '16px' }}>
                  <div className="skeleton-box" style={{ width: '100%', height: '100px', borderRadius: '8px' }}></div>
                </div>
              ))}
            </div>

            {/* Comments Tabs */}
            <div className="comments-section" style={{ marginTop: '10px' }}>
              <div className="comments-tabs" style={{ display: 'flex', gap: '24px', marginBottom: '10px' }}>
                <div className="skeleton-box" style={{ width: '100px', height: '30px', borderRadius: '4px' }}></div>
                <div className="skeleton-box" style={{ width: '100px', height: '30px', borderRadius: '4px' }}></div>
              </div>
              <div className="skeleton-box" style={{ width: '100%', height: '100px', borderRadius: '8px' }}></div>
            </div>
          </div>

          <div className="route-detail-sidebar">
            {/* Guide Info Card */}
            <div className="guide-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="skeleton-box" style={{ width: '60px', height: '60px', borderRadius: '50%' }}></div>
                <div className="skeleton-box" style={{ width: '120px', height: '24px', borderRadius: '6px' }}></div>
              </div>
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                <div className="skeleton-box" style={{ width: '100%', height: '16px', marginBottom: '10px', borderRadius: '4px' }}></div>
                <div className="skeleton-box" style={{ width: '85%', height: '16px', marginBottom: '10px', borderRadius: '4px' }}></div>
                <div className="skeleton-box" style={{ width: '95%', height: '15px', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
