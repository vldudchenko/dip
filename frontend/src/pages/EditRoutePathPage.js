import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { RouteEditorMap } from '../components/RouteEditorMap';
import { API_URL } from '../utils/constants';

/**
 * Страница редактирования пути и контрольных точек маршрута
 */
export const EditRoutePathPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveResult, setSaveResult] = useState(null); // 'success' | 'error'

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(`${API_URL}/routes/${id}`);
        if (!res.ok) throw new Error('Маршрут не найден');
        const data = await res.json();
        setRoute(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [id]);

  const handleSave = async (pathGeometry, checkpoints) => {
    setSaving(true);
    setSaveResult(null);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/routes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path_geometry: pathGeometry,
          checkpoints: checkpoints
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ошибка при сохранении');
      }

      setSaveResult('success');
      // Автоматически переходим на страницу маршрута через 1.5 сек
      setTimeout(() => navigate(`/route/${id}`), 1500);
    } catch (err) {
      setError(err.message);
      setSaveResult('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="edit-route-path-page">
      <div className="edit-path-loading">
        <div className="spinner" />
        <span>Загрузка маршрута...</span>
      </div>
    </div>
  );

  if (error && !route) return (
    <div className="edit-route-path-page">
      <div className="edit-path-error">
        <span>⚠️ {error}</span>
        <button onClick={() => navigate(-1)} className="btn-back-inline">← Назад</button>
      </div>
    </div>
  );

  return (
    <div className="edit-route-path-page">
      <div className="edit-path-header">
        <div className="header-info">
          <button className="btn-back" onClick={() => navigate(-1)} title="Назад">←</button>
          <div className="header-title-group">
            <span className="header-subtitle">Редактор маршрута</span>
            <h1>{route.title}</h1>
          </div>
        </div>

        <div className="header-actions">
          {/* Уведомления о сохранении */}
          {saveResult === 'success' && (
            <div className="save-status save-status--success">
              ✅ Маршрут сохранён! <Link to={`/route/${id}`}>Перейти →</Link>
            </div>
          )}
          {saveResult === 'error' && (
            <div className="save-status save-status--error">
              ⚠️ {error}
            </div>
          )}

          <Link to={`/route/${id}`} className="btn-view-route">
            👁 Просмотр
          </Link>
          <button
            className="btn-save-path"
            onClick={() => document.getElementById('save-trigger').click()}
            disabled={saving}
          >
            {saving ? (
              <><span className="btn-spinner" /> Сохранение...</>
            ) : (
              '💾 Сохранить маршрут'
            )}
          </button>
        </div>
      </div>

      <RouteEditorMap
        initialPath={route.path_geometry || []}
        initialCheckpoints={route.checkpoints || []}
        onSave={handleSave}
      />
    </div>
  );
};

export default EditRoutePathPage;
