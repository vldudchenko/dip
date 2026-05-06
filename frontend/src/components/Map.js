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
export function Map({ ymapsReady, loadError, configLoaded, ...props }) {
  const { provider, setProvider } = useMapProvider();

  const renderMap = () => {
    // Если конфиг еще не загружен (базовый API_URL), показываем лоадер
    if (!configLoaded) {
      return <div className="map-loading-placeholder">Загрузка конфигурации...</div>;
    }

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
      return <YandexMap {...props} />;
    }

    return <LeafletMap {...props} />;
  };

  return (
    <div className="map-with-toggle" style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapProviderToggle provider={provider} onChange={setProvider} />
      {renderMap()}
    </div>
  );
}

export default Map;
