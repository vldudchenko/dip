import React from 'react';
import '../../styles/skeleton.css';

/**
 * Общий скелетон для страниц профиля (UserPage и GuidePage)
 */
export const ProfileSkeleton = () => {
  return (
    <div className="user-page" style={{ pointerEvents: 'none' }}>
      {/* Шапка профиля */}
      <div className="user-header">
        <div className="skeleton-avatar shimmer" style={{ width: '120px', height: '120px', flexShrink: 0 }}></div>

        <div className="user-header-info" style={{ flex: 1 }}>
          <div className="skeleton-text shimmer" style={{ width: '250px', height: '2.5rem', marginBottom: '1rem' }}></div>
          <div className="skeleton-text shimmer" style={{ width: '180px', height: '1rem', marginBottom: '1.5rem' }}></div>
        </div>
      </div>

      {/* Секция контента (вкладки) */}
      <div className="user-content-section" style={{ marginTop: '1rem' }}>
        <div className="routes-header-tabs" style={{ marginBottom: '2rem' }}>
          <div className="tabs-container" style={{ display: 'flex', gap: '1rem' }}>
            <div className="skeleton-box shimmer" style={{ width: '120px', height: '40px' }}></div>
            <div className="skeleton-box shimmer" style={{ width: '120px', height: '40px' }}></div>
          </div>
        </div>

        {/* Список контента (сетка/список) */}
        <div className="user-videos-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="user-video-card">
              <div className="skeleton-box shimmer" style={{ width: '100%', aspectRatio: '16/9' }}></div>
              <div className="user-video-info">
                <div className="skeleton-text shimmer" style={{ width: '40%', height: '0.9rem' }}></div>
                <div className="skeleton-text shimmer" style={{ width: '30%', height: '0.9rem' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
