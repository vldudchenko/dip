import React from 'react';
import { useMapProvider } from '../hooks/useMapProvider';
import { YandexMap } from './YandexMap';
import { LeafletMap } from './LeafletMap';
import { MapProviderToggle } from './MapProviderToggle';

/**
 * Компонент-роутер карты.
 * Автоматически выбирает нужную реализацию карты (OSM/Leaflet или Яндекс)
 * в зависимости от выбранного провайдера и показывает переключатель поверх карты.
 */
export function Map({ 
  ymapsReady, 
  loadError, 
  configLoaded, 
  selectedPoint, 
  onReset, 
  routes = [], 
  hideLayerControl = false, 
  hideLeftControls = false, 
  hoveredRouteId,
  onRouteHover,
  onRouteClick,
  allRoutes,
  ...props 
}) {
  const { provider, setProvider } = useMapProvider();
  const [resetKey, setResetKey] = React.useState(0);
  const [showPath, setShowPath] = React.useState(true);
  const [showVideos, setShowVideos] = React.useState(true);

  const handleResetClick = () => {
    setResetKey(prev => prev + 1);
    if (onReset) onReset();
  };

  const renderMap = () => {
    // Если конфиг еще не загружен (базовый API_URL), показываем лоадер
    if (!configLoaded) {
      return <div className="map-loading-placeholder">Загрузка конфигурации...</div>;
    }

    const mapProps = {
      ...props,
      showPath,
      showVideos,
      routes,
      allRoutes,
      selectedPoint,
      hoveredRouteId,
      onRouteHover,
      onRouteClick,
      key: resetKey
    };

    if (provider === 'yandex') {
      if (loadError) {
        return (
          <div className="map-loading-placeholder map-error">
            <p>Ошибка загрузки Яндекс Карт (возможно исчерпан лимит API)</p>
            <button
              className="btn btn--primary btn--small"
              onClick={() => setProvider('osm')}
              style={{ marginTop: '10px' }}
            >
              Переключиться на OpenStreetMap
            </button>
          </div>
        );
      }
      if (!ymapsReady) {
        return <div className="map-loading-placeholder">Загрузка Яндекс Карт...</div>;
      }
      return <YandexMap {...mapProps} />;
    }

    return <LeafletMap {...mapProps} />;
  };

  return (
    <div className="map-with-toggle" style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapProviderToggle provider={provider} onChange={setProvider} />

      {!hideLeftControls && (
        <div className="map-controls-left" style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Кнопка сброса положения */}
          {onReset && (
            <button
              onClick={handleResetClick}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '10px 14px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
                border: '1px solid #eee',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                width: 'fit-content',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.backgroundColor = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              }}
              className="map-reset-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}

          {/* Управление слоями */}
          {!hideLayerControl && (
            <div className="map-layers-control" style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '8px',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
              border: '1px solid #eee',
              backdropFilter: 'blur(10px)',
              width: 'fit-content'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#4b5563', padding: '4px 8px', borderRadius: '6px', userSelect: 'none' }} className="map-layer-label">
                <input
                  type="checkbox"
                  checked={showPath}
                  onChange={(e) => setShowPath(e.target.checked)}
                  style={{ accentColor: '#7c3aed', cursor: 'pointer', outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                />
                Путь
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#4b5563', padding: '4px 8px', borderRadius: '6px', userSelect: 'none' }} className="map-layer-label">
                <input
                  type="checkbox"
                  checked={showVideos}
                  onChange={(e) => setShowVideos(e.target.checked)}
                  style={{ accentColor: '#7c3aed', cursor: 'pointer', outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent' }}
                />
                Видео
              </label>
            </div>
          )}
        </div>
      )}

      {renderMap()}
    </div>
  );
}

export default Map;
