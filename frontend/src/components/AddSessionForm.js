import React, { useState } from 'react';
import { API_URL } from '../utils/constants';

export const AddSessionForm = ({ routeId, currentUserId, onSessionCreated, onCancel }) => {
  const [newSession, setNewSession] = useState({
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    price: '',
    min_people: '',
    max_people: ''
  });
  const [sessionError, setSessionError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSessionError(null);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_id: routeId,
          guide_id: currentUserId,
          start_date: newSession.start_date,
          end_date: newSession.end_date || newSession.start_date,
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          price: Number(newSession.price),
          min_people: Number(newSession.min_people),
          max_people: Number(newSession.max_people)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось создать сессию');
      }

      onSessionCreated();
    } catch (err) {
      setSessionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-session-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-col">
          <label>Дата начала *</label>
          <input
            type="date"
            value={newSession.start_date}
            onChange={(e) => setNewSession({ ...newSession, start_date: e.target.value, end_date: newSession.end_date < e.target.value ? e.target.value : newSession.end_date })}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="form-col">
          <label>Дата окончания *</label>
          <input
            type="date"
            value={newSession.end_date}
            onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
            required
            min={newSession.start_date || new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <label>Время начала *</label>
          <input
            type="time"
            value={newSession.start_time}
            onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
            required
          />
        </div>
        <div className="form-col">
          <label>Время окончания *</label>
          <input
            type="time"
            value={newSession.end_time}
            onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-col">
          <label>Цена (₽) *</label>
          <input
            type="number"
            value={newSession.price}
            onChange={(e) => setNewSession({ ...newSession, price: e.target.value })}
            required
            min="0"
          />
        </div>
        <div className="form-col">
          <label>Мин. человек *</label>
          <input
            type="number"
            value={newSession.min_people}
            onChange={(e) => setNewSession({ ...newSession, min_people: e.target.value })}
            required
            min="1"
          />
        </div>
        <div className="form-col">
          <label>Макс. человек *</label>
          <input
            type="number"
            value={newSession.max_people}
            onChange={(e) => setNewSession({ ...newSession, max_people: e.target.value })}
            required
            min="1"
          />
        </div>
      </div>
      {sessionError && <div className="form-error">{sessionError}</div>}
      <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Создание...' : 'Создать прохождение'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </button>
      </div>
    </form>
  );
};
