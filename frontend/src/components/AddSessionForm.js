import React, { useState } from 'react';
import { API_URL } from '../utils/constants';
import { ConfirmModal } from './ConfirmModal';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Ограничение: 48 часов от текущего момента
  const minAllowedDate = new Date();
  minAllowedDate.setHours(minAllowedDate.getHours() + 48);
  const minDateString = minAllowedDate.toISOString().split('T')[0];

  const handleNumericKeyDown = (e) => {
    // Блокируем 'e', '+', '-', '.', ','
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSessionError(null);

    // Дополнительная проверка на 48 часов (с учетом времени)
    const sessionStart = new Date(`${newSession.start_date}T${newSession.start_time}`);
    const now = new Date();
    const diffHours = (sessionStart - now) / (1000 * 60 * 60);

    if (diffHours < 48) {
      setSessionError('Прохождение должно начинаться не ранее чем через 48 часов от текущего времени по МСК.');
      return;
    }

    const minP = Number(newSession.min_people);
    const maxP = Number(newSession.max_people);

    if (minP < 1 || minP > 50 || maxP < 1 || maxP > 50) {
      setSessionError('Количество участников должно быть от 1 до 50');
      return;
    }

    if (minP > maxP) {
      setSessionError('Минимальное количество участников не может быть больше максимального');
      return;
    }

    const isSameDay = !newSession.end_date || newSession.end_date === newSession.start_date;
    if (isSameDay && newSession.start_time >= newSession.end_time) {
      setSessionError('Время окончания должно быть позже времени начала для однодневного прохождения');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUserId
        },
        body: JSON.stringify({
          route_id: routeId,
          guide_id: currentUserId,
          userId: currentUserId,
          start_date: newSession.start_date,
          end_date: newSession.end_date || newSession.start_date,
          start_time: newSession.start_time,
          end_time: newSession.end_time,
          price: Math.floor(Number(newSession.price)),
          min_people: Math.floor(Number(newSession.min_people)),
          max_people: Math.floor(Number(newSession.max_people))
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
            min={minDateString}
          />
        </div>
        <div className="form-col">
          <label>Дата окончания *</label>
          <input
            type="date"
            value={newSession.end_date}
            onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
            required
            min={newSession.start_date || minDateString}
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
            type="text"
            inputMode="numeric"
            value={newSession.price}
            onKeyDown={handleNumericKeyDown}
            onChange={(e) => setNewSession({ ...newSession, price: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
        <div className="form-col">
          <label>Мин. человек *</label>
          <input
            type="text"
            inputMode="numeric"
            value={newSession.min_people}
            onKeyDown={handleNumericKeyDown}
            onChange={(e) => setNewSession({ ...newSession, min_people: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
        <div className="form-col">
          <label>Макс. человек *</label>
          <input
            type="text"
            inputMode="numeric"
            value={newSession.max_people}
            onKeyDown={handleNumericKeyDown}
            onChange={(e) => setNewSession({ ...newSession, max_people: e.target.value.replace(/\D/g, '') })}
            required
          />
        </div>
      </div>
      <p className="form-tip">Запись закрывается за 24 часа до старта. Ближайшая доступная дата — через 48 часов.</p>
      {sessionError && <div className="form-error">{sessionError}</div>}
      <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Создание...' : 'Создать прохождение'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={loading}>
          Отмена
        </button>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Создание прохождения"
        message={`Вы уверены, что хотите создать прохождение: ${new Date(newSession.start_date).toLocaleDateString()} в ${newSession.start_time}?`}
        confirmLabel="Создать"
        confirmVariant="primary"
        onConfirm={handleFinalConfirm}
        onCancel={() => setShowConfirmModal(false)}
      />
    </form>
  );
};
