import React from 'react';

/**
 * Кнопка переключения между провайдерами карты.
 * Отображается поверх карты в правом верхнем углу.
 *
 * @param {{ provider: string, onChange: function }} props
 */
export function MapProviderToggle({ provider, onChange }) {
  return (
    <div className="map-provider-toggle" title="Выбрать провайдер карты">
      <button
        className={`map-provider-btn ${provider === 'osm' ? 'map-provider-btn--active' : ''}`}
        onClick={() => onChange('osm')}
        aria-pressed={provider === 'osm'}
        title="OpenStreetMap (бесплатно)"
      >
        🗺 OSM
      </button>
      <button
        className={`map-provider-btn ${provider === 'yandex' ? 'map-provider-btn--active' : ''}`}
        onClick={() => onChange('yandex')}
        aria-pressed={provider === 'yandex'}
        title="Яндекс Карты"
      >
        Я Карты
      </button>
    </div>
  );
}

export default MapProviderToggle;
