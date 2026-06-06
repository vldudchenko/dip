import React from 'react';
import '../../styles/skeleton.css';

/**
 * Скелетон для страницы пользователя (UserPage)
 */
export const UserPageSkeleton = () => {
  return (
    <div className="user-page" style={{ pointerEvents: 'none' }} aria-busy="true" role="status">
      {/* Шапка профиля */}
      <div className="user-header">
        <div className="avatar-container avatar-container--profile">
          <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%', borderRadius: '50%' }}></div>
        </div>
        <div className="user-header-info">
          <div className="skeleton-box shimmer" style={{ width: '250px', height: '38px', marginBottom: '4px', borderRadius: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '150px', height: '20px', borderRadius: '6px' }}></div>
        </div>
      </div>

      {/* Табы */}
      <div className="user-content-section">
        <div className="routes-header-tabs">
          <div className="tabs-container">
            <button className="tab-btn active" style={{ border: 'none', background: 'transparent' }}>
              <div className="skeleton-box shimmer" style={{ width: '70px', height: '24px', borderRadius: '6px' }}></div>
            </button>
            <button className="tab-btn" style={{ border: 'none', background: 'transparent' }}>
              <div className="skeleton-box shimmer" style={{ width: '120px', height: '24px', borderRadius: '6px' }}></div>
            </button>
          </div>
        </div>

        {/* Сетка видео */}
        <div className="user-videos-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
            <div key={i} className="user-video-card">
              <div className="user-video-thumbnail skeleton-box shimmer"></div>
              <div className="user-video-info">
                <div className="user-video-meta">
                  <div className="skeleton-box shimmer" style={{ width: '40px', height: '14px', borderRadius: '4px' }}></div>
                  <div className="skeleton-box shimmer" style={{ width: '60px', height: '14px', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Скелетон для страницы гида (GuidePage)
 */
export const GuidePageSkeleton = () => {
  return (
    <div className="guide-page" style={{ pointerEvents: 'none' }} aria-busy="true" role="status">
      {/* Шапка гида */}
      <div className="guide-header">
        <div className="avatar-container avatar-container--profile">
          <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%', borderRadius: '50%' }}></div>
        </div>
        <div className="guide-info">
          <div className="skeleton-box shimmer" style={{ width: '250px', height: '38px', marginBottom: '4px', borderRadius: '8px' }}></div>
          <div className="skeleton-box shimmer" style={{ width: '150px', height: '20px', borderRadius: '6px' }}></div>
        </div>
      </div>

      {/* Табы и контент */}
      <div className="routes-section">
        <div className="routes-header-tabs">
          <div className="tabs-container">
            <button className="tab-btn active">
              <div className="skeleton-box shimmer" style={{ width: '90px', height: '24px', borderRadius: '6px' }}></div>
            </button>
            <button className="tab-btn">
              <div className="skeleton-box shimmer" style={{ width: '120px', height: '24px', borderRadius: '6px' }}></div>
            </button>
          </div>
        </div>

        {/* Список маршрутов (построчно) */}
        <div className="routes-list" style={{ minHeight: '750px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="route-card">
              <div className="route-header">
                <h3 className="route-title" style={{ color: 'transparent', userSelect: 'none', width: '40%' }}>
                  <div className="skeleton-box shimmer" style={{ width: '100%', height: '100%', borderRadius: '4px', display: 'inline-block' }}></div>
                </h3>
              </div>

              <div className="route-body">
                <p className="route-description" style={{ color: 'transparent', userSelect: 'none' }}>
                  <span className="skeleton-box shimmer" style={{ width: '100%', height: '16px', borderRadius: '4px', marginBottom: '6px', display: 'inline-block' }}></span>
                  <span className="skeleton-box shimmer" style={{ width: '100%', height: '16px', borderRadius: '4px', marginBottom: '6px', display: 'inline-block' }}></span>
                  <span className="skeleton-box shimmer" style={{ width: '80%', height: '16px', borderRadius: '4px', display: 'inline-block' }}></span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Экспорт по умолчанию для совместимости
export const ProfileSkeleton = UserPageSkeleton;
export default ProfileSkeleton;
