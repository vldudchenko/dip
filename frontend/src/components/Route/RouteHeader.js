import React, { memo, useRef, useEffect } from 'react';

/**
 * Заголовок маршрута с названием и описанием. 
 * Переключается в режим редактирования внешним флагом isEditing.
 */
const RouteHeader = memo(({
  route,
  isEditing,
  draftTitle,
  setDraftTitle,
  draftDescription,
  setDraftDescription
}) => {
  const textareaRef = useRef(null);

  // Автоподбор высоты textarea под контент
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [draftDescription, isEditing]);

  if (isEditing) {
    return (
      <div className="route-detail-header">
        <div style={{ width: '100%', marginBottom: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
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
              autoFocus
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {draftTitle.length}/100
            </div>
          </div>

          <div>
            <textarea
              ref={textareaRef}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Описание маршрута"
              rows="1"
              maxLength={1000}
              className="route-edit-input"
              style={{
                width: '100%',
                fontSize: '1rem',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                resize: 'none',
                fontFamily: 'inherit',
                color: '#4b5563',
                lineHeight: '1.5',
                outline: 'none',
                overflow: 'hidden'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              {draftDescription.length}/1000
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-detail-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ marginBottom: '10px', fontSize: '2rem', fontWeight: 'bold', color: '#333', wordBreak: 'break-word' }}>
            {route?.title}
          </h1>
          {route?.description && (
            <div className="route-detail-description" style={{ marginBottom: '10px', width: '100%' }}>
              <p style={{ fontSize: '1rem', color: '#4b5563', lineHeight: '1.5', wordBreak: 'break-word' }}>
                {route.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default RouteHeader;
