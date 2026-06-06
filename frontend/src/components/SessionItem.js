import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from './ConfirmModal';

export const SessionItem = ({
  session,
  currentUserId,
  isRouteOwner,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  isJoined,
  statusLabels,
  statusClasses,
  isLoggedIn,
  onStatusChange,
  showRouteTitle = false,
  showOrganizer = true,
  initialGuide = null,
  isEditing = false,
  onToggleEdit = () => { },
  currentUserIsGuide = false
}) => {
  const navigate = useNavigate();
   const [guide, setGuide] = useState(initialGuide);
  const [editData, setEditData] = useState({ ...session });
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [editError, setEditError] = useState(null);

  const handleNumericKeyDown = (e) => {
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (initialGuide) {
      setGuide(initialGuide);
      return;
    }

    const fetchSessionGuide = async () => {
      try {
        const response = await fetch(`${API_URL}/users/${session.guide_id}`);
        if (response.ok) {
          setGuide(await response.json());
        }
      } catch (err) {
        console.error('Error fetching session guide:', err);
      }
    };
    fetchSessionGuide();
  }, [session.guide_id, initialGuide]);

  const isFull = session.participants_count >= session.max_people;
  const canJoin = (session.status === 'waiting' || session.status === 'pending_date') && !isFull && !isJoined;
  const canLeave = isJoined && (session.status === 'waiting' || session.status === 'pending_date');

  const sessionDateTime = new Date(`${session.start_date}T${session.start_time}`);
  const now = new Date();
  const hoursUntilStart = (sessionDateTime - now) / (1000 * 60 * 60);
  const isTooLate = hoursUntilStart < 24;

  const isJoinDisabled = !isLoggedIn || isFull || (session.status !== 'waiting' && session.status !== 'pending_date') || isTooLate;
  const joinDisabledReason = !isLoggedIn
    ? 'Пользователь не авторизован'
    : isFull
      ? 'Группа набрана'
      : (session.status !== 'waiting' && session.status !== 'pending_date')
        ? `Статус: ${statusLabels[session.status]}`
        : 'Запись на прохождение возможна не позднее чем за 24 часа до начала';

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditError(null);

    const sessionStart = new Date(`${editData.start_date}T${editData.start_time}`);
    const now = new Date();
    const diffHours = (sessionStart - now) / (1000 * 60 * 60);

    if (diffHours < 48) {
      setEditError('Прохождение должно начинаться не ранее чем через 48 часов от текущего времени по МСК.');
      return;
    }

    const minP = Number(editData.min_people);
    const maxP = Number(editData.max_people);

    if (minP < 1 || minP > 50 || maxP < 1 || maxP > 50) {
      setEditError('Количество участников должно быть от 1 до 50');
      return;
    }

    if (minP > maxP) {
      setEditError('Минимальное количество участников не может быть больше максимального');
      return;
    }

    const isSameDay = !editData.end_date || editData.end_date === editData.start_date;
    if (isSameDay && editData.start_time >= editData.end_time) {
      setEditError('Время окончания должно быть позже времени начала для однодневного прохождения');
      return;
    }

    setShowEditConfirmModal(true);
  };

  const handleFinalEditConfirm = () => {
    setShowEditConfirmModal(false);
    onEdit(session.id, {
      ...editData,
      price: Math.floor(Number(editData.price)),
      min_people: Math.floor(Number(editData.min_people)),
      max_people: Math.floor(Number(editData.max_people))
    });
    onToggleEdit(false);
  };

  return (
    <div className="session-card">
      <div className="session-header">
        <div className="session-main-info">
          {showRouteTitle && session.route && (
            <h4 className="session-route-title" onClick={() => navigate(`/route/${session.route_id}`)}>
              {session.route.title}
            </h4>
          )}
          <div className="session-info-row">
            <span className="session-info-item">
              {new Date(session.start_date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
              {' '}{session.start_time.substring(0, 5)}
              {' — '}
              {session.end_date && session.end_date !== session.start_date && (
                <>
                  {new Date(session.end_date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                  {' '}
                </>
              )}
              {session.end_time.substring(0, 5)}
            </span>
            <span className="session-info-item price">
              {session.price} ₽
            </span>
            <span className="session-info-item participants">
              {session.participants_count} / {session.max_people}
            </span>
          </div>
        </div>

        <div className={`session-status-badge ${statusClasses[session.status]}`}>
          {statusLabels[session.status]}
        </div>
      </div>

      <div className="session-footer-info">
        {showOrganizer && guide && (
          <div className="session-guide">
            <span className="session-info-label">Организатор:</span>
            <Link to={`/guide/${guide.login}`} className="session-guide-link">
              <img
                src={guide.avatar || defaultAvatar}
                alt={guide.login}
                className="session-guide-avatar"
              />
              <span className="session-guide-login" style={{ color: "#333" }}>@{guide.login}</span>
            </Link>
          </div>
        )}

        {session.participants && session.participants.length > 0 && (
          <div className="session-participants-list">
            <span>Участники:</span>
            <div className="participants-avatars">
              {session.participants.slice(0, 5).map((p, idx) => (
                <img
                  key={idx}
                  src={p.avatar || defaultAvatar}
                  alt={p.full_name || p.login || 'User'}
                  className="participant-avatar"
                  title={p.full_name || p.login || 'User'}
                  onClick={() => p.login && navigate(`/user/${p.login}`)}
                  style={{ cursor: p.login ? 'pointer' : 'default' }}
                />
              ))}
              {session.participants.length > 5 && (
                <span className="participants-more">+{session.participants.length - 5}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="session-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {currentUserId && String(currentUserId) === String(session.guide_id) && currentUserIsGuide && (
          <div className="management-actions" style={{ width: '100%' }}>
            {isEditing ? (
              <form className="add-session-form edit-mode" onSubmit={handleEditSubmit} style={{ padding: '1rem', background: '#fff', border: '1px solid #eee' }}>
                <div className="form-row" style={{ marginBottom: '1rem' }}>
                  <div className="form-col">
                    <label>Дата начала</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Дата окончания</label>
                    <input
                      type="date"
                      value={editData.end_date || editData.start_date}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                      required
                      min={editData.start_date}
                    />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: '1rem' }}>
                  <div className="form-col">
                    <label>Время начала</label>
                    <input
                      type="time"
                      value={editData.start_time}
                      onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Время окончания</label>
                    <input
                      type="time"
                      value={editData.end_time}
                      onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row" style={{ marginBottom: '1rem' }}>
                  <div className="form-col">
                    <label>Цена (₽)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editData.price}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Мин. чел</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editData.min_people}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => setEditData({ ...editData, min_people: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Макс. чел</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editData.max_people}
                      onKeyDown={handleNumericKeyDown}
                      onChange={(e) => setEditData({ ...editData, max_people: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label>Статус</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '1rem' }}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {editError && <div className="form-error" style={{ marginBottom: '1rem' }}>{editError}</div>}
                <div className="session-form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => { onToggleEdit(false); setEditError(null); }}>Отмена</button>
                </div>

                <ConfirmModal
                  isOpen={showEditConfirmModal}
                  title="Изменение прохождения"
                  message="Вы уверены, что хотите сохранить изменения в этом прохождении?"
                  confirmLabel="Сохранить"
                  confirmVariant="primary"
                  onConfirm={handleFinalEditConfirm}
                  onCancel={() => setShowEditConfirmModal(false)}
                />
              </form>
            ) : (
              <div className="guide-session-actions">
                <button className="btn btn--secondary btn--small" onClick={() => onToggleEdit(true)}>Редактировать</button>
                <button className="btn btn--secondary btn--small" onClick={() => onDelete(session.id)}>Удалить</button>
              </div>
            )}
          </div>
        )}

        {currentUserId !== session.guide_id && (
          <div className="participant-actions">
            {!isJoined && session.status === 'waiting' && (
              <button
                className="btn btn--primary"
                onClick={() => onJoin(session.id)}
                disabled={isJoinDisabled}
                title={isJoinDisabled ? joinDisabledReason : ""}
              >
                Записаться
              </button>
            )}
            {canLeave && <button className="btn btn--secondary" onClick={() => onLeave(session.id)} >Отписаться</button>}
          </div>
        )}
      </div>
    </div>
  );
};
