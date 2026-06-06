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
  showMilestones = true,
  showVideos: showVideosProp,
  videoFilterMode = 'all',
  ...props
}) {
  const { provider, setProvider } = useMapProvider();
  const [resetKey, setResetKey] = React.useState(0);
  const [showPath, setShowPath] = React.useState(true);
  const [internalShowVideos, setInternalShowVideos] = React.useState(true);

  // Используем проп, если он передан, иначе внутреннее состояние
  const showVideos = showVideosProp !== undefined ? showVideosProp : internalShowVideos;

  const stabilizedRoutes = React.useMemo(() => routes, [routes]);

  const handleResetClick = () => {
    setResetKey(prev => prev + 1);
    if (onReset) onReset();
  };

  const renderMap = () => {
    if (!configLoaded) {
      return <div className="map-loading-placeholder">Загрузка конфигурации...</div>;
    }

    const mapProps = {
      ...props,
      routes: stabilizedRoutes,
      showPath,
      showVideos,
      allRoutes,
      selectedPoint,
      hoveredRouteId,
      onRouteHover,
      onRouteClick,
      showMilestones,
      resetKey,
      videoFilterMode
    };

    if (provider === 'yandex') {
      if (loadError) {
        return (
          <div className="map-error-placeholder">
            Ошибка загрузки Яндекс.Карт. Пожалуйста, проверьте API ключ или попробуйте OSM.
          </div>
        );
      }
      if (!ymapsReady) {
        return <div className="map-loading-placeholder">Загрузка Яндекс.Карт...</div>;
      }
      return <YandexMap {...mapProps} ymapsReady={ymapsReady} />;
    }

    return <LeafletMap {...mapProps} />;
  };

  return (
    <div className="map-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderMap()}

      <div className="map-controls-overlay">
        {!hideLeftControls && (
          <div className="map-left-controls">
            <button
              onClick={handleResetClick}
              className="map-reset-btn"
              title="Сбросить положение"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 27"
                fill="none"
              >
                <path
                  d="M12 5V2L7 7L12 12V9C15.3137 9 18 11.6863 18 15C18 18.3137 15.3137 21 12 21C8.68629 21 6 18.3137 6 15H4C4 19.4183 7.58172 23 12 23C16.4183 23 20 19.4183 20 15C20 10.5817 16.4183 7 12 7V5Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {!hideLayerControl && (
              <div className="map-layers-control">
                <label className="layer-toggle">
                  <input
                    type="checkbox"
                    checked={showPath}
                    onChange={(e) => setShowPath(e.target.checked)}
                  />
                  <span>Путь</span>
                </label>
                <label className="layer-toggle">
                  <input
                    type="checkbox"
                    checked={showVideos}
                    onChange={(e) => {
                      if (showVideosProp === undefined) {
                        setInternalShowVideos(e.target.checked);
                      }
                    }}
                    disabled={showVideosProp !== undefined}
                  />
                  <span>Видео</span>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="map-right-controls">
          <MapProviderToggle provider={provider} onChange={setProvider} />
        </div>
      </div>
    </div>
  );
}
