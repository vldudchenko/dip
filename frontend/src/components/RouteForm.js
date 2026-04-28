import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { API_URL } from '../utils/constants';

/**
 * Универсальный компонент формы создания/редактирования маршрута
 */
export const RouteForm = ({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Сохранить',
  showCancel = true,
  guideId: externalGuideId,
  Rows
}) => {
  const [formData, setFormData] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const textareaRef = useRef(null);
  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;

    // Сохраняем текущую анимацию и отключаем её для точного замера
    const prevTransition = el.style.transition;
    el.style.transition = "none";

    el.style.height = "auto";

    const styles = getComputedStyle(el);
    let lineHeight = parseFloat(styles.lineHeight);

    if (isNaN(lineHeight)) {
      const fontSize = parseFloat(styles.fontSize) || 16;
      lineHeight = fontSize * 1.2;
    }

    const maxHeight = lineHeight * 11;
    const contentHeight = el.scrollHeight;

    if (contentHeight > maxHeight) {
      el.style.height = maxHeight + "px";
      el.style.overflowY = "auto";
    } else {
      // Возвращаем + lineHeight для "+1 строка", как в оригинальном подходе
      el.style.height = contentHeight + lineHeight + "px";
      el.style.overflowY = "hidden";
    }

    // Вызываем принудительную перерисовку и возвращаем анимацию
    el.offsetHeight;
    el.style.transition = prevTransition;
  };

  useLayoutEffect(() => {
    resize();
  }, [formData.description, Rows]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('Пользователь не авторизован');
      }

      const routeData = {
        guide_id: externalGuideId || userId,
        title: formData.title,
        description: formData.description || ''
      };

      const url = initialValues.id
        ? `${API_URL}/routes/${initialValues.id}`
        : `${API_URL}/routes`;

      const method = initialValues.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Не удалось сохранить маршрут');
      }

      if (onSubmit) {
        onSubmit(e, result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-route-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-col">
          <label>Название *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="form-col">
          <label>Сложность *</label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            required
          >
            <option value="easy">Лёгкий</option>
            <option value="medium">Средний</option>
            <option value="hard">Сложный</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <label>Описание</label>
          <textarea
            ref={textareaRef}
            rows={1}
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание..."
            style={{
              resize: "none",
              overflow: "hidden",
              transition: "height 0.15s ease",
              minHeight: "unset", // Отменяем min-height из CSS, чтобы работал авто-ресайз
            }}
          />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}
      <div className="form-actions">
        {showCancel && onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Отмена
          </button>
        )}
        <p className="form-hint">После сохранения вы сможете нарисовать путь маршрута на карте и добавить контрольные точки.</p>
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Сохранение...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default RouteForm;
