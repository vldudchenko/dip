import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';

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
  const canJoin = session.status === 'waiting' && !isFull && !isJoined;
  const canLeave = isJoined && session.status === 'waiting';

  const sessionDateTime = new Date(`${session.start_date}T${session.start_time}`);
  const now = new Date();
  const hoursUntilStart = (sessionDateTime - now) / (1000 * 60 * 60);
  const isTooLate = hoursUntilStart < 24;

  const isJoinDisabled = !isLoggedIn || isFull || session.status !== 'waiting' || isTooLate;
  const joinDisabledReason = !isLoggedIn
    ? 'Пользователь не авторизован'
    : isFull
      ? 'Группа набрана'
      : session.status !== 'waiting'
        ? `Статус: ${statusLabels[session.status]}`
        : 'Запись на прохождение возможна не позднее чем за 24 часа до начала';

  const handleEditSubmit = (e) => {
    e.preventDefault();
    onEdit(session.id, editData);
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
            </span>
            <span className="session-info-item">
              {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
            </span>
            <span className="session-info-item price">
              {session.price} ₽
            </span>
            <span className="session-info-item participants">
              {session.participants_count} / {session.max_people}
            </span>
          </div>
        </div>

        <select
          className={`session-status-badge ${statusClasses[session.status]}`}
          value={session.status}
          disabled={!(onStatusChange && currentUserId === session.guide_id && currentUserIsGuide)}
          onChange={(e) =>
            onStatusChange?.(session.id, session.route_id, e.target.value)
          }
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
                  src={p.users?.avatar || defaultAvatar}
                  alt={p.users?.full_name || p.users?.login || 'User'}
                  className="participant-avatar"
                  title={p.users?.full_name || p.users?.login || 'User'}
                  onClick={() => p.users?.login && navigate(`/user/${p.users.login}`)}
                  style={{ cursor: p.users?.login ? 'pointer' : 'default' }}
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
              <form className="edit-session-form" onSubmit={handleEditSubmit}>
                <div className="form-row-small" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Дата начала</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      required
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Начало</label>
                    <input
                      type="time"
                      value={editData.start_time}
                      onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                      required
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Окончание</label>
                    <input
                      type="time"
                      value={editData.end_time}
                      onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                      required
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>
                <div className="form-row-small" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Цена (₽)</label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                      required
                      min="0"
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Мин. чел</label>
                    <input
                      type="number"
                      value={editData.min_people}
                      onChange={(e) => setEditData({ ...editData, min_people: e.target.value })}
                      required
                      min="1"
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div className="form-col-small" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>Макс. чел</label>
                    <input
                      type="number"
                      value={editData.max_people}
                      onChange={(e) => setEditData({ ...editData, max_people: e.target.value })}
                      required
                      min="1"
                      style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>
                <div className="session-form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => onToggleEdit(false)}>Отмена</button>
                </div>
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
