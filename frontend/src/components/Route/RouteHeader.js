import React, { useState, memo } from 'react';

/**
 * Заголовок маршрута с названием, описанием и режимом редактирования
 */
const RouteHeader = memo(({ route, isGuide, onSave, saving, isCreating, onCancel }) => {
  const [isEditing, setIsEditing] = useState(isCreating || false);
  const [editTitle, setEditTitle] = useState(route?.title || '');
  const [editDescription, setEditDescription] = useState(route?.description || '');

  const handleStartEdit = () => {
    setEditTitle(route.title);
    setEditDescription(route.description || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      alert('Название не может быть пустым');
      return;
    }
    try {
      await onSave(editTitle, editDescription);
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = () => {
    if (isCreating && onCancel) {
      onCancel();
    } else {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="route-detail-header">
        <div style={{ width: '100%', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Название маршрута"
              maxLength={100}
              className="route-edit-input"
              style={{
                width: '100%',
                fontSize: '2rem',
                fontWeight: 'bold',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontFamily: 'inherit',
                color: '#333',
                outline: 'none'
              }}
              autoFocus={isCreating}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {editTitle.length}/100
            </div>
          </div>

          <div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Краткое описание маршрута"
              rows="4"
              maxLength={1000}
              className="route-edit-input"
              style={{
                width: '100%',
                fontSize: '1rem',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                resize: 'vertical',
                fontFamily: 'inherit',
                color: '#4b5563',
                lineHeight: '1.5',
                outline: 'none'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {editDescription.length}/1000
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn btn--primary btn--small" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : (isCreating ? 'Создать' : 'Сохранить')}
            </button>
            <button className="btn btn--secondary btn--small" onClick={handleCancel}>
              {isCreating ? 'Отмена' : 'Отмена'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-detail-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: '10px', fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>{route?.title}</h1>
          {route?.description && (
            <div className="route-detail-description" style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: '1.5' }}>{route.description}</p>
            </div>
          )}
        </div>
        {isGuide && (
          <button
            className="btn btn--secondary btn--small"
            onClick={handleStartEdit}
            style={{ marginLeft: '20px' }}
          >
            Редактировать
          </button>
        )}
      </div>
    </div>
  );
});

export default RouteHeader;
