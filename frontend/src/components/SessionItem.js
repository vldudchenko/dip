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
  showOrganizer = true
}) => {
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...session });

  useEffect(() => {
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
  }, [session.guide_id]);

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
    setIsEditing(false);
  };

  return (
    <div className="session-card">
      <div className="session-header">
        <div className="session-datetime">
          {showRouteTitle && session.route && (
            <h4 className="session-route-title" onClick={() => navigate(`/route/${session.route_id}`)} style={{ cursor: 'pointer', marginBottom: '4px' }}>
              {session.route.title}
            </h4>
          )}
          <span className="session-date">
            {new Date(session.start_date).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </span>
          <span className="session-time">
            {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
          </span>
        </div>

        <div className="session-stats">
          <div className="session-stat-item price">
            <span className="stat-label">Цена</span>
            <span className="stat-value">{session.price} ₽</span>
          </div>
          <div className="session-stat-item participants">
            <span className="stat-label">Места</span>
            <span className="stat-value">{session.participants_count} / {session.max_people}</span>
          </div>
        </div>

        {onStatusChange && currentUserId === session.guide_id ? (
          <select
            className={`session-status-select ${statusClasses[session.status]}`}
            value={session.status}
            onChange={(e) => onStatusChange(session.id, session.route_id, e.target.value)}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <span className={`session-status ${statusClasses[session.status]}`}>
            {statusLabels[session.status]}
          </span>
        )}
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
              <span className="session-guide-name">{guide.login}</span>
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
                  alt={p.users?.login || 'User'}
                  className="participant-avatar"
                  title={p.users?.login || 'User'}
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
        {currentUserId === session.guide_id && (
          <div className="management-actions">
            {isEditing ? (
              <form className="edit-session-form" onSubmit={handleEditSubmit}>
                <div className="form-row-small">
                  <div className="form-col-small">
                    <label>Дата начала</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-col-small">
                    <label>Начало</label>
                    <input
                      type="time"
                      value={editData.start_time}
                      onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-col-small">
                    <label>Окончание</label>
                    <input
                      type="time"
                      value={editData.end_time}
                      onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row-small" style={{ marginTop: '10px' }}>
                  <div className="form-col-small">
                    <label>Цена (₽)</label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                  <div className="form-col-small">
                    <label>Мин. чел</label>
                    <input
                      type="number"
                      value={editData.min_people}
                      onChange={(e) => setEditData({ ...editData, min_people: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-col-small">
                    <label>Макс. чел</label>
                    <input
                      type="number"
                      value={editData.max_people}
                      onChange={(e) => setEditData({ ...editData, max_people: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                </div>
                <div className="session-form-actions" style={{ marginTop: '15px' }}>
                  <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
                  <button type="button" className="btn btn--secondary btn--small" onClick={() => setIsEditing(false)}>Отмена</button>
                </div>
              </form>
            ) : (
              <div className="guide-session-actions">
                <button className="btn btn--secondary btn--small" onClick={() => setIsEditing(true)}>Редактировать</button>
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
            {canLeave && <button className="btn btn--secondary" onClick={() => onLeave(session.id)}>Отписаться</button>}
            {isJoined && !canLeave && <span className="joined-label">✓ Вы записаны</span>}
            {session.status !== 'waiting' && !isJoined && (
              <span className="join-disabled">Статус: {statusLabels[session.status]}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
