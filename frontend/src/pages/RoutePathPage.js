import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import { Map } from '../components/Map';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import { TRANSPORT_OPTIONS, STOP_TYPE_OPTIONS, TRANSPORT_MAP } from '../utils/routeConstants';
import ConfirmModal from '../components/ConfirmModal';

import '../styles/routePathPage.css';

export const RoutePathPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(provider === 'yandex');

  const [route, setRoute] = useState(null);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // История для отмены действий
  const [undoStack, setUndoStack] = useState([]);
  const pointsRef = useRef(points);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Состояние для следующей точки
  const [nextTransport, setNextTransport] = useState('walking');
  const [nextStopType, setNextStopType] = useState('none');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [pendingFinishIndex, setPendingFinishIndex] = useState(null);
  const [activePickerIndex, setActivePickerIndex] = useState(null);




  // Загрузка данных маршрута
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        // Сбрасываем историю отмен при загрузке нового маршрута
        setUndoStack([]);
        const response = await fetch(`${API_URL}/routes/${id}`);
        if (!response.ok) throw new Error('Не удалось загрузить маршрут');
        const data = await response.json();
        setRoute(data);

        if (data.path_data && Array.isArray(data.path_data)) {
          // Миграция старого массива координат в новый формат объектов
          const migratedPoints = data.path_data.map((item, index) => {
            if (Array.isArray(item)) {
              return {
                id: `point-${Date.now()}-${index}`,
                coords: item,
                type: index === 0 ? 'start' : 'waypoint',
                transport: index === 0 ? null : 'walking',
                stop_type: index === 0 ? 'start' : 'none'
              };
            }
            return item; // Уже новый формат
          });
          setPoints(migratedPoints);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [id]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousPoints = undoStack[undoStack.length - 1];
    setPoints(previousPoints);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints([]);
  };

  const handleMapClick = (coords) => {
    // Если уже есть финишная точка, не даем добавлять новые
    const hasFinish = points.some(p => p.stop_type === 'finish');
    if (hasFinish) return;

    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints(prev => {
      const isFirst = prev.length === 0;
      const newPoint = {
        id: `point-${Date.now()}`,
        coords,
        type: isFirst ? 'start' : 'waypoint',
        transport: isFirst ? null : nextTransport,
        stop_type: isFirst ? 'start' : nextStopType
      };
      return [...prev, newPoint];
    });
  };


  const handlePointChange = (index, field, value) => {
    // Если выбираем финиш и это не последняя точка — запрашиваем подтверждение удаления последующих
    if (field === 'stop_type' && value === 'finish' && index < points.length - 1) {
      setPendingFinishIndex(index);
      setShowFinishModal(true);
      return;
    }

    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints(prev => {
      const newPoints = [...prev];
      newPoints[index] = { ...newPoints[index], [field]: value };
      return newPoints;
    });
  };

  const applyFinishWithDelete = () => {
    if (pendingFinishIndex === null) return;

    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints(prev => {
      // Оставляем точки только до выбранной (включительно)
      const newPoints = prev.slice(0, pendingFinishIndex + 1);
      // Устанавливаем ей тип "финиш"
      newPoints[pendingFinishIndex] = { ...newPoints[pendingFinishIndex], stop_type: 'finish' };
      return newPoints;
    });

    setShowFinishModal(false);
    setPendingFinishIndex(null);
  };


  const handlePointDelete = (index) => {
    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints(prev => {
      const newPoints = prev.filter((_, i) => i !== index);
      // Переназначаем старт, если удалили первую точку (создаём новый объект, чтобы не мутировать историю)
      if (newPoints.length > 0 && newPoints[0].type !== 'start') {
        newPoints[0] = { ...newPoints[0], type: 'start', transport: null, stop_type: 'start' };
      }

      return newPoints;
    });
  };

  const handleInsertPoint = (index) => {
    const p1 = points[index];
    const p2 = points[index + 1];

    if (!p1 || !p2) return;

    const midCoords = [
      (p1.coords[0] + p2.coords[0]) / 2,
      (p1.coords[1] + p2.coords[1]) / 2
    ];

    const newPoint = {
      id: Date.now().toString(),
      coords: midCoords,
      transport: p1.transport || 'walking',
      stop_type: 'none'
    };

    setUndoStack(prev => [...prev, points]);
    setPoints(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, newPoint);
      return next;
    });
  };


  const handlePointDragEnd = (index, newCoords) => {
    setUndoStack(prev => [...prev, pointsRef.current]);
    setPoints(prev => {
      const newPoints = [...prev];
      newPoints[index] = { ...newPoints[index], coords: newCoords };
      return newPoints;
    });
  };

  const handleSave = () => {
    // Валидация перед сохранением
    if (points.length < 2) {
      alert('Маршрут должен содержать как минимум 2 точки: старт и финиш.');
      return;
    }

    const hasStart = points.some(p => p.stop_type === 'start');
    const hasFinish = points.some(p => p.stop_type === 'finish');

    if (!hasStart) {
      alert('Маршрут должен иметь стартовую точку.');
      return;
    }

    if (!hasFinish) {
      alert('Маршрут должен иметь финишную точку.');
      return;
    }

    const finishIndex = points.findIndex(p => p.stop_type === 'finish');
    if (finishIndex !== points.length - 1) {
      if (!window.confirm('Финишная точка находится не в конце маршрута. Вы уверены, что хотите сохранить путь в таком виде? Все точки после финиша будут считаться лишними.')) {
        return;
      }
    }

    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    setShowSaveModal(false);
    try {
      const response = await fetch(`${API_URL}/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path_data: points })
      });

      if (!response.ok) {
        throw new Error('Не удалось сохранить путь');
      }

      navigate(`/route/${id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };



  if (loading) return <div className="route-path-page"><p>Загрузка...</p></div>;
  if (error) return <div className="route-path-page"><p>Ошибка: {error}</p></div>;
  if (!route) return <div className="route-path-page"><p>Маршрут не найден</p></div>;

  return (
    <div className="route-path-page">
      <div className="route-path-header">
        <h1>{route.title}</h1>
        <div className="route-path-controls">
          <button className="btn btn--secondary btn--small" onClick={() => navigate(-1)}>Назад</button>
          <button className="btn btn--secondary btn--small" onClick={handleUndo} disabled={undoStack.length === 0}>Отменить</button>
          <button className="btn btn--secondary btn--small" onClick={handleClear} disabled={points.length === 0}>Очистить</button>
          <button className="btn btn--primary btn--small" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить путь'}
          </button>
        </div>
      </div>

      <div className="route-path-main">
        <div className="route-path-map-container">
          <Map
            mode="route-editor"
            routePoints={points}
            onMapClick={handleMapClick}
            onPointDragEnd={handlePointDragEnd}
            onPointClick={setActivePickerIndex}
            onPointChange={handlePointChange}
            activePointIndex={activePickerIndex}
            ymapsReady={ymapsReady}
            loadError={loadError}
            configLoaded={true}
          />

        </div>

        <div className="route-path-sidebar">
          <div className="sidebar-header">Управление точками</div>
          <div className="sidebar-content">
            {points.length === 0 ? (
              <div className="empty-points">Кликайте по карте, чтобы добавить стартовую точку маршрута</div>
            ) : (
              <div className="point-list">
                {points.map((point, index) => (
                  <React.Fragment key={point.id || index}>
                    <div className="point-item-container">
                      <div
                        className={`point-item ${index === 0 ? 'is-start' : ''} ${point.stop_type === 'finish' ? 'is-finish' : ''}`}
                      >
                        <div className="point-index">{index + 1}</div>
                        <div className="point-content">
                          <div className="point-form-row">
                            {index > 0 && point.stop_type !== 'finish' && (
                              <div className="point-form-group">
                                <label>Транспорт до точки</label>
                                <select
                                  value={point.transport || 'walking'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handlePointChange(index, 'transport', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {TRANSPORT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {index > 0 && point.stop_type !== 'none' && point.stop_type !== 'finish' && (
                              <div className="point-form-group">
                                <label>Остановка</label>
                                <select
                                  value={point.stop_type || 'none'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handlePointChange(index, 'stop_type', e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {STOP_TYPE_OPTIONS.filter(opt => opt.value !== 'start').map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="point-type-info">
                              {index === 0 ? (
                                <div className="point-static-label">
                                  Стартовая точка
                                </div>
                              ) : point.stop_type === 'finish' ? (
                                <div className="point-static-label is-finish">
                                  Финиш
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="point-actions">
                          <button
                            className="btn-delete-point"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePointDelete(index);
                            }}
                            title="Удалить точку"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    {index < points.length - 1 && (
                      <div className="point-inserter-wrapper">
                        <div
                          className="point-inserter"
                          onClick={() => handleInsertPoint(index)}
                          title="Добавить точку между"
                        >
                          <div className="inserter-line"></div>
                          <div className="inserter-plus">+</div>
                          <div className="inserter-line"></div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      <ConfirmModal
        isOpen={showSaveModal}
        title="Сохранение маршрута"
        message="Вы уверены, что хотите сохранить текущий путь маршрута? Это действие обновит данные для всех пользователей."
        confirmLabel="Сохранить"
        confirmVariant="save"
        onConfirm={confirmSave}
        onCancel={() => setShowSaveModal(false)}
      />

      <ConfirmModal
        isOpen={showFinishModal}
        title="Установка финиша"
        message="Вы устанавливаете финишную точку в середине пути. Это приведет к удалению всех последующих точек маршрута. Продолжить?"
        confirmLabel="Удалить последующие"
        confirmVariant="delete"
        onConfirm={applyFinishWithDelete}
        onCancel={() => setShowFinishModal(false)}
      />
    </div>
  );
};