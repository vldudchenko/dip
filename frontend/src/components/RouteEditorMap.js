import React, { useEffect, useRef, useState, useCallback } from 'react';
import { buildRoute } from '../utils/map/helpers';
import { createRouteMarkerElement } from '../utils/map/markers';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../utils/constants';
import {
  TRANSPORT_OPTIONS,
  STOP_TYPE_OPTIONS,
  TRANSPORT_MAP,
} from '../utils/routeConstants';

/**
 * Создаёт пустой объект контрольной точки
 */
const createEmptyCheckpoint = (index, coords, transport = 'walking') => ({
  id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
  title: `Точка ${index + 1}`,
  description: '',
  coords,
  transport,
  stop_type: 'sightseeing',
  duration_minutes: 30,
  photo_url: '',
  video_url: '',
  accommodation: '',
});

/**
 * Редактор маршрута на карте (Яндекс Карты v3)
 * Полная версия с геокодингом, расширенной формой и 6 типами транспорта
 */
export const RouteEditorMap = ({ initialPath, initialCheckpoints, onSave }) => {
  const [map, setMap] = useState(null);
  const [checkpoints, setCheckpoints] = useState(
    (initialCheckpoints || []).map(cp => ({
      ...createEmptyCheckpoint(0, cp.coords),
      ...cp,
    }))
  );
  const [pathGeometry, setPathGeometry] = useState(initialPath || []);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [transportMode, setTransportMode] = useState('walking');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [pathBuilding, setPathBuilding] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const featuresLayerRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRefs = useRef([]);
  const checkpointsRef = useRef(checkpoints);

  // Синхронизируем ref с состоянием для использования в колбэках карты
  useEffect(() => {
    checkpointsRef.current = checkpoints;
  }, [checkpoints]);

  // ─── Инициализация карты ──────────────────────────────────────────────────
  useEffect(() => {
    if (!window.ymaps3) return;

    const init = async () => {
      await window.ymaps3.ready;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = window.ymaps3;

      const center = initialCheckpoints?.length > 0
        ? initialCheckpoints[0].coords
        : MAP_DEFAULT_CENTER;

      const mapInstance = new YMap(mapContainerRef.current, {
        location: { center, zoom: 12 },
        mode: 'vector',
      });

      mapInstance.addChild(new YMapDefaultSchemeLayer());
      const featuresLayer = new YMapDefaultFeaturesLayer();
      mapInstance.addChild(featuresLayer);
      featuresLayerRef.current = featuresLayer;

      const clickListener = new YMapListener({
        onClick: (_, event) => {
          if (event?.coordinates) {
            addNewPoint(event.coordinates);
          }
        },
      });
      mapInstance.addChild(clickListener);

      mapInstanceRef.current = mapInstance;
      setMap(mapInstance);
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, []);

  // ─── Геокодинг / поиск ───────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setSearchLoading(true);
    setSearchError('');

    try {
      // Используем Nominatim (OpenStreetMap) — бесплатный, без ключа
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=ru`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'ru' }
      });
      const data = await res.json();

      if (!data || data.length === 0) {
        setSearchError('Место не найдено. Попробуйте изменить запрос.');
        return;
      }

      const { lon, lat, display_name } = data[0];
      const coords = [parseFloat(lon), parseFloat(lat)];

      // Центрируем карту на найденное место
      mapInstanceRef.current.setLocation({ center: coords, zoom: 14, duration: 500 });

      // Добавляем точку автоматически
      addNewPoint(coords, display_name.split(',')[0].trim());
    } catch (err) {
      setSearchError('Ошибка поиска. Проверьте соединение.');
    } finally {
      setSearchLoading(false);
    }
  };

  // ─── Добавление новой точки ───────────────────────────────────────────────
  const addNewPoint = useCallback((coords, suggestedTitle = null) => {
    const current = checkpointsRef.current;
    const newPoint = createEmptyCheckpoint(current.length, coords, transportMode);
    if (suggestedTitle) newPoint.title = suggestedTitle;

    const newCheckpoints = [...current, newPoint];
    setCheckpoints(newCheckpoints);
    setSelectedPointIndex(newCheckpoints.length - 1);

    if (newCheckpoints.length > 1) {
      updatePath(newCheckpoints);
    }
  }, [transportMode]);

  // ─── Обновление линии маршрута ────────────────────────────────────────────
  const updatePath = async (currentPoints) => {
    if (currentPoints.length < 2) {
      setPathGeometry([]);
      return;
    }

    setPathBuilding(true);
    try {
      let fullGeometry = [];
      for (let i = 0; i < currentPoints.length - 1; i++) {
        const start = { lng: currentPoints[i].coords[0], lat: currentPoints[i].coords[1] };
        const end = { lng: currentPoints[i + 1].coords[0], lat: currentPoints[i + 1].coords[1] };
        const mode = currentPoints[i + 1].transport || 'walking';
        const osrmMode = ['walking', 'bicycle'].includes(mode) ? 'walking' : 'driving';

        try {
          const route = await buildRoute(start, end, osrmMode);
          fullGeometry = [...fullGeometry, ...route.geometry];
        } catch {
          // Если OSRM недоступен — прямая линия между точками
          fullGeometry = [...fullGeometry, currentPoints[i].coords, currentPoints[i + 1].coords];
        }
      }
      setPathGeometry(fullGeometry);
    } finally {
      setPathBuilding(false);
    }
  };

  // ─── Отрисовка элементов на карте ────────────────────────────────────────
  useEffect(() => {
    if (!map || !featuresLayerRef.current) return;

    const { YMapFeature, YMapMarker } = window.ymaps3;

    // Очистка
    if (polylineRef.current) {
      try { featuresLayerRef.current.removeChild(polylineRef.current); } catch {}
    }
    markerRefs.current.forEach(m => {
      try { map.removeChild(m); } catch {}
    });
    markerRefs.current = [];

    // Линия маршрута
    if (pathGeometry.length > 1) {
      const polyline = new YMapFeature({
        id: 'route-path',
        geometry: { type: 'LineString', coordinates: pathGeometry },
        style: { stroke: [{ color: '#7c3aed', width: 5, opacity: 0.75 }] },
      });
      featuresLayerRef.current.addChild(polyline);
      polylineRef.current = polyline;
    }

    // Маркеры
    checkpoints.forEach((cp, index) => {
      const isActive = selectedPointIndex === index;
      const element = createRouteMarkerElement({ index, transport: cp.transport, isActive });

      element.onclick = (e) => {
        e.stopPropagation();
        setSelectedPointIndex(index);
      };

      const marker = new YMapMarker({
        coordinates: cp.coords,
        draggable: true,
        onDragMove: (newCoords) => {
          const updated = [...checkpointsRef.current];
          updated[index] = { ...updated[index], coords: newCoords };
          setCheckpoints(updated);
        },
        onDragEnd: () => {
          updatePath(checkpointsRef.current);
        },
      }, element);

      map.addChild(marker);
      markerRefs.current.push(marker);
    });
  }, [map, checkpoints, pathGeometry, selectedPointIndex]);

  // ─── Обновление поля выбранной точки ─────────────────────────────────────
  const handlePointUpdate = (field, value) => {
    if (selectedPointIndex === null) return;
    const updated = [...checkpoints];
    updated[selectedPointIndex] = { ...updated[selectedPointIndex], [field]: value };
    setCheckpoints(updated);

    if (field === 'transport') {
      updatePath(updated);
    }
  };

  const removePoint = (index) => {
    const updated = checkpoints.filter((_, i) => i !== index);
    setCheckpoints(updated);
    setSelectedPointIndex(null);
    updatePath(updated);
  };

  const movePoint = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === checkpoints.length - 1) return;
    const updated = [...checkpoints];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
    setCheckpoints(updated);
    setSelectedPointIndex(swapIdx);
    updatePath(updated);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(pathGeometry, checkpoints);
    }
  };

  // Суммарное время маршрута
  const totalMinutes = checkpoints.reduce((sum, cp) => sum + (Number(cp.duration_minutes) || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;

  const selectedCp = selectedPointIndex !== null ? checkpoints[selectedPointIndex] : null;

  return (
    <div className="route-editor-container">
      {/* ── Левая панель ─────────────────────────────────────────────── */}
      <div className="editor-sidebar">

        {/* Поиск по адресу */}
        <form className="editor-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="editor-search-input"
            placeholder="🔍 Поиск места или адреса..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="editor-search-btn"
            disabled={searchLoading}
          >
            {searchLoading ? '⌛' : 'Найти'}
          </button>
        </form>
        {searchError && <p className="editor-search-error">{searchError}</p>}

        {/* Список точек */}
        <div className="editor-section-title">
          <span>Точки маршрута</span>
          {checkpoints.length > 0 && (
            <span className="editor-total-time">
              ⏱ {totalHours > 0 ? `${totalHours}ч ` : ''}{restMinutes > 0 ? `${restMinutes}мин` : ''}
            </span>
          )}
        </div>

        <div className="points-list">
          {checkpoints.map((cp, index) => (
            <div
              key={cp.id}
              className={`point-item ${selectedPointIndex === index ? 'selected' : ''}`}
              onClick={() => setSelectedPointIndex(index)}
            >
              <span className="point-badge">{index + 1}</span>
              <div className="point-item-info">
                <span className="point-name">{cp.title}</span>
                {cp.transport && index > 0 && (
                  <span className={`point-transport-mini transport-${cp.transport}`}>
                    {TRANSPORT_MAP[cp.transport]?.label || cp.transport}
                  </span>
                )}
              </div>
              <div className="point-item-actions">
                <button
                  className="btn-move-point"
                  title="Вверх"
                  onClick={e => { e.stopPropagation(); movePoint(index, 'up'); }}
                  disabled={index === 0}
                >▲</button>
                <button
                  className="btn-move-point"
                  title="Вниз"
                  onClick={e => { e.stopPropagation(); movePoint(index, 'down'); }}
                  disabled={index === checkpoints.length - 1}
                >▼</button>
                <button
                  className="btn-remove-point"
                  title="Удалить точку"
                  onClick={e => { e.stopPropagation(); removePoint(index); }}
                >×</button>
              </div>
            </div>
          ))}
          {checkpoints.length === 0 && (
            <p className="empty-hint">Кликните на карту или воспользуйтесь поиском, чтобы добавить первую точку</p>
          )}
        </div>

        {/* Форма редактирования выбранной точки */}
        {selectedCp && (
          <div className="point-details-form">
            <h4>📍 Точка {selectedPointIndex + 1}</h4>

            <div className="form-group">
              <label>Название</label>
              <input
                type="text"
                value={selectedCp.title}
                onChange={e => handlePointUpdate('title', e.target.value)}
                placeholder="Например: ЖД Симферополь"
              />
            </div>

            <div className="form-group">
              <label>Тип остановки</label>
              <select
                value={selectedCp.stop_type || 'sightseeing'}
                onChange={e => handlePointUpdate('stop_type', e.target.value)}
              >
                {STOP_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Описание / Комментарий</label>
              <textarea
                value={selectedCp.description}
                onChange={e => handlePointUpdate('description', e.target.value)}
                placeholder="Что интересного, как добраться, советы..."
                rows="3"
              />
            </div>

            <div className="form-row-two">
              <div className="form-group">
                <label>Время на точке (мин.)</label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={selectedCp.duration_minutes || 30}
                  onChange={e => handlePointUpdate('duration_minutes', e.target.value)}
                />
              </div>
            </div>

            {/* Транспорт (не показывается для первой точки) */}
            {selectedPointIndex > 0 && (
              <div className="form-group">
                <label>Транспорт от предыдущей точки</label>
                <div className="transport-grid">
                  {TRANSPORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`transport-chip ${selectedCp.transport === opt.value ? 'active' : ''}`}
                      style={selectedCp.transport === opt.value ? { background: opt.color, borderColor: opt.color, color: 'white' } : {}}
                      onClick={() => handlePointUpdate('transport', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Поля для ночёвки */}
            {selectedCp.stop_type === 'accommodation' || selectedCp.stop_type === 'camp' ? (
              <div className="form-group">
                <label>Название места ночёвки</label>
                <input
                  type="text"
                  value={selectedCp.accommodation || ''}
                  onChange={e => handlePointUpdate('accommodation', e.target.value)}
                  placeholder="Отель «Горный», лагерь у реки..."
                />
              </div>
            ) : null}

            <div className="form-group">
              <label>📸 Фото (URL)</label>
              <input
                type="url"
                placeholder="https://..."
                value={selectedCp.photo_url || ''}
                onChange={e => handlePointUpdate('photo_url', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>🎥 Видео от гида (URL)</label>
              <input
                type="url"
                placeholder="https://youtube.com/..."
                value={selectedCp.video_url || ''}
                onChange={e => handlePointUpdate('video_url', e.target.value)}
              />
            </div>

            <div className="point-coords-display">
              📍 {selectedCp.coords[1].toFixed(5)}, {selectedCp.coords[0].toFixed(5)}
            </div>
          </div>
        )}

        {/* Скрытая кнопка для сохранения (вызывается из EditRoutePathPage) */}
        <button
          id="save-trigger"
          style={{ display: 'none' }}
          onClick={handleSave}
        />
      </div>

      {/* ── Правая часть — карта ─────────────────────────────────────── */}
      <div className="editor-map-wrapper">
        <div ref={mapContainerRef} className="editor-map" />

        {/* Тулбар над картой */}
        <div className="map-toolbar">
          <div className="toolbar-hint">
            {pathBuilding
              ? '⌛ Строим маршрут...'
              : 'Клик — добавить точку · Тяните маркер — переместить'}
          </div>
          <div className="transport-selector">
            <span className="transport-selector-label">Новая точка:</span>
            {TRANSPORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={transportMode === opt.value ? 'active' : ''}
                style={transportMode === opt.value ? { background: opt.color, borderColor: opt.color } : {}}
                onClick={() => setTransportMode(opt.value)}
                title={opt.label}
              >
                {opt.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Счётчик точек */}
        {checkpoints.length > 0 && (
          <div className="editor-points-counter">
            {checkpoints.length} {checkpoints.length === 1 ? 'точка' : checkpoints.length < 5 ? 'точки' : 'точек'}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteEditorMap;
