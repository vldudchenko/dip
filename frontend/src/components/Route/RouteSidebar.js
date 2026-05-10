import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import defaultAvatar from '../../static/Avatar.png';
import { ConfirmModal } from '../ConfirmModal';

/**
 * Боковая панель страницы маршрута: карточка гида, статистика, управление
 */
const RouteSidebar = memo(({ 
  guide, 
  route, 
  stats, 
  realIsGuide, 
  isPreviewMode, 
  onTogglePreview, 
  onDeleteRoute 
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="route-detail-sidebar">
      <div className="guide-card">
        {guide && guide.login && (
          <>
            <Link to={`/guide/${guide.login}`} className="guide-card-link">
              <img
                src={avatarError || !guide?.avatar ? defaultAvatar : guide.avatar}
                alt={guide.login}
                className="guide-card-avatar"
                onError={() => setAvatarError(true)}
              />

              <div className="guide-card-info">
                <span className="guide-card-name">{guide.full_name || guide.login}</span>
                <span className="guide-card-login">@{guide.login}</span>
              </div>
            </Link>
            {route && route.created_at && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                  <span><strong>Создан:</strong> {new Date(route.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                {stats && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                      <span><strong>Просмотров:</strong> {stats.views || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                      <span><strong>Пройдено:</strong> {stats.completed_sessions || 0} раз(а)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {realIsGuide && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  className={`btn ${isPreviewMode ? 'btn--primary' : 'btn--secondary'} btn--small`}
                  onClick={() => onTogglePreview(!isPreviewMode)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isPreviewMode ? 'Редактирование' : 'Просмотр'}
                </button>

                {!isPreviewMode && (
                  <button 
                    className="btn btn--secondary btn--small"
                    onClick={() => setShowDeleteModal(true)}
                    style={{ width: '100%', color: '#ef4444' }}
                  >
                    Удалить маршрут
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Удаление маршрута"
        message="Вы уверены, что хотите полностью удалить этот маршрут? Это действие необратимо."
        confirmLabel="Удалить"
        onConfirm={() => {
          setShowDeleteModal(false);
          onDeleteRoute();
        }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
});

export default RouteSidebar;
