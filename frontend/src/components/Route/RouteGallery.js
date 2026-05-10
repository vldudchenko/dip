import React, { useState, useEffect, memo } from 'react';
import { ConfirmModal } from '../ConfirmModal';

/**
 * Галерея медиа-файлов маршрута (фото и видео) со слайдером
 */
const RouteGallery = memo(({ images, videos, isGuide, onUpload, onDelete, loading }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isMediaHovered, setIsMediaHovered] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);

  const allMedia = [
    ...images.map(img => ({ type: 'image', url: img.file_url, id: img.id, raw: img })),
    ...videos.map(vid => ({ type: 'video', url: vid.file_url, id: vid.id, raw: vid }))
  ];

  useEffect(() => {
    if (allMedia.length > 0 && activeMediaIndex >= allMedia.length) {
      setActiveMediaIndex(Math.max(0, allMedia.length - 1));
    }
  }, [allMedia.length, activeMediaIndex]);

  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  if (allMedia.length === 0) {
    if (isGuide) {
      return (
        <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '15px' }}>Загрузите фото или видео для маршрута.</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <label className="btn btn--secondary btn--small" style={{ cursor: 'pointer' }}>
              Загрузить медиа
              <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaUpload} disabled={loading} />
            </label>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="route-detail-gallery" style={{ marginBottom: isGuide ? '0' : '20px' }}>
      <div
        style={{ width: '100%', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: '#000', borderRadius: '12px' }}
        onMouseEnter={() => setIsMediaHovered(true)}
        onMouseLeave={() => setIsMediaHovered(false)}
      >
        {/* Области навигации */}
        <div
          onClick={() => {
            if (activeMediaIndex > 0) setActiveMediaIndex(prev => prev - 1);
          }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s',
            background: isMediaHovered && activeMediaIndex > 0 ? '' : 'transparent',
            paddingBottom: '10px',
            paddingRight: '5px'
          }}
        >
          {activeMediaIndex > 0 && (
            <div style={{
              fontSize: '3rem',
              color: 'rgba(255, 255, 255, 0.8)',
              textShadow: '0 0 10px rgba(0,0,0,0.5)',
              userSelect: 'none',
              opacity: isMediaHovered ? 1 : 0,
              transition: 'opacity 0.2s'
            }}>
              ‹
            </div>
          )}
        </div>
        <div
          onClick={() => {
            if (activeMediaIndex < allMedia.length - 1) setActiveMediaIndex(prev => prev + 1);
          }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s',
            background: isMediaHovered && activeMediaIndex < allMedia.length - 1 ? '' : 'transparent',
            paddingBottom: '10px',
            paddingLeft: '5px'
          }}
        >
          {activeMediaIndex < allMedia.length - 1 && (
            <div style={{
              fontSize: '3rem',
              color: 'rgba(255, 255, 255, 0.8)',
              textShadow: '0 0 10px rgba(0,0,0,0.5)',
              userSelect: 'none',
              opacity: isMediaHovered ? 1 : 0,
              transition: 'opacity 0.2s'
            }}>
              ›
            </div>
          )}
        </div>

        {allMedia[activeMediaIndex]?.type === 'image' ? (
          <img src={allMedia[activeMediaIndex].url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : allMedia[activeMediaIndex]?.type === 'video' ? (
          <video src={allMedia[activeMediaIndex]?.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }} />
        ) : null}

        {/* Точки индикации */}
        {isMediaHovered && allMedia.length > 1 && (
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 20, pointerEvents: 'none' }}>
            {allMedia.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: activeMediaIndex === idx ? '#7c3aed' : 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        )}

        {isGuide && allMedia[activeMediaIndex] && (
          <button
            onClick={() => {
              const m = allMedia[activeMediaIndex];
              if (m.type === 'image') setImageToDelete(m.raw);
              else setVideoToDelete(m.raw);
            }}
            style={{ position: 'absolute', top: '10px', right: '0px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', zIndex: 30 }}
          >
            Удалить
          </button>
        )}
      </div>

      {isGuide && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginBottom: '20px' }}>
          <label className="btn btn--secondary btn--small" style={{ cursor: 'pointer' }}>
            Загрузить медиа
            <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleMediaUpload} disabled={loading} />
          </label>
        </div>
      )}

      <ConfirmModal
        isOpen={!!imageToDelete}
        title="Удаление изображения"
        message="Вы уверены, что хотите удалить это изображение?"
        confirmLabel="Удалить"
        onConfirm={() => {
          onDelete(imageToDelete.id, 'image');
          setImageToDelete(null);
        }}
        onCancel={() => setImageToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!videoToDelete}
        title="Удаление видео"
        message="Вы уверены, что хотите удалить это видео?"
        confirmLabel="Удалить"
        onConfirm={() => {
          onDelete(videoToDelete.id, 'video');
          setVideoToDelete(null);
        }}
        onCancel={() => setVideoToDelete(null)}
      />
    </div>
  );
});

export default RouteGallery;
