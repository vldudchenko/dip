import React, { useState } from 'react';
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
  guideId: externalGuideId 
}) => {
  const [formData, setFormData] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
        difficulty: formData.difficulty,
        price: Number(formData.price),
        min_people: Number(formData.min_people),
        max_people: Number(formData.max_people),
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сохранить маршрут');
      }

      if (onSubmit) {
        onSubmit(e, formData);
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
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="3"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <label>Цена (₽) *</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
            min="0"
          />
        </div>
        <div className="form-col">
          <label>Мин. участников *</label>
          <input
            type="number"
            value={formData.min_people}
            onChange={(e) => setFormData({ ...formData, min_people: e.target.value })}
            required
            min="1"
          />
        </div>
        <div className="form-col">
          <label>Макс. участников *</label>
          <input
            type="number"
            value={formData.max_people}
            onChange={(e) => setFormData({ ...formData, max_people: e.target.value })}
            required
            min="1"
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
        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? 'Сохранение...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default RouteForm;
