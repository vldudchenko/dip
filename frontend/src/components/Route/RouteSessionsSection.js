import React, { useState, memo } from 'react';
import { AddSessionForm } from '../AddSessionForm';
import { SessionItem } from '../SessionItem';
import { ConfirmModal } from '../ConfirmModal';
import { STATUS_LABELS, STATUS_CLASSES } from '../../utils/routeConstants';

/**
 * Секция управления сессиями (прохождениями) маршрута: список, пагинация, формы
 */
const RouteSessionsSection = memo(({
  routeId,
  sessions,
  currentUserId,
  isRouteOwner,
  isAnyGuide,
  userJoinedSessions,
  sessionGuides,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  onStatusChange,
  refreshSessions
}) => {
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [sessionToJoin, setSessionToJoin] = useState(null);
  const [sessionToLeave, setSessionToLeave] = useState(null);
  const [sessionPage, setSessionPage] = useState(1);
  const [activeSessionEditId, setActiveSessionEditId] = useState(null);
  const SESSIONS_PER_PAGE = 4;

  const activeSessions = sessions.filter(s => s.status === 'waiting');
  const totalPages = Math.ceil(activeSessions.length / SESSIONS_PER_PAGE);
  const currentSessions = activeSessions.slice((sessionPage - 1) * SESSIONS_PER_PAGE, sessionPage * SESSIONS_PER_PAGE);

  const handleDeleteConfirm = async () => {
    if (sessionToDelete) {
      await onDelete(sessionToDelete);
      setSessionToDelete(null);
    }
  };

  const handleJoinConfirm = async () => {
    if (sessionToJoin) {
      await onJoin(sessionToJoin);
      setSessionToJoin(null);
    }
  };

  const handleLeaveConfirm = async () => {
    if (sessionToLeave) {
      await onLeave(sessionToLeave);
      setSessionToLeave(null);
    }
  };

  return (
    <>
      {activeSessions.length > 0 || (isAnyGuide && showAddSession) ? (
        <div className="sessions-header">
          <h2>Прохождения маршрута {activeSessions.length > 0 && <span className="tab-count">{activeSessions.length}</span>}</h2>
          {isAnyGuide && (
            <button
              className="btn btn--primary btn--small"
              onClick={() => {
                const newState = !showAddSession;
                setShowAddSession(newState);
                if (newState) setActiveSessionEditId(null);
              }}
            >
              {showAddSession ? 'Отмена' : 'Добавить прохождение'}
            </button>
          )}
        </div>
      ) : isAnyGuide ? (
        <div className="sessions-header" style={{ justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button
            className="btn btn--primary btn--small"
            onClick={() => setShowAddSession(true)}
          >
            Добавить прохождение
          </button>
        </div>
      ) : null}

      {activeSessions.length === 0 && !showAddSession && (
        <div className="no-sessions-container" style={{ marginBottom: '20px' }}>
          <p className="no-sessions">Пока нет запланированных прохождений</p>
        </div>
      )}

      {showAddSession && (
        <AddSessionForm
          routeId={routeId}
          currentUserId={currentUserId}
          onSessionCreated={() => {
            setShowAddSession(false);
            refreshSessions();
          }}
          onCancel={() => setShowAddSession(false)}
        />
      )}

      {activeSessions.length > 0 && (
        <div className="sessions-list" style={activeSessions.length < 4 ? { minHeight: 'auto' } : undefined}>
          {currentSessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              currentUserId={currentUserId}
              isRouteOwner={isRouteOwner}
              onJoin={setSessionToJoin}
              onLeave={setSessionToLeave}
              onEdit={onEdit}
              onDelete={setSessionToDelete}
              onStatusChange={onStatusChange}
              currentUserIsGuide={isAnyGuide}
              isJoined={userJoinedSessions.has(session.id)}
              statusLabels={STATUS_LABELS}
              statusClasses={STATUS_CLASSES}
              isLoggedIn={currentUserId !== null}
              initialGuide={sessionGuides[session.guide_id]}
              isEditing={activeSessionEditId === session.id}
              onToggleEdit={(editing) => {
                if (editing) {
                  setShowAddSession(false);
                  setActiveSessionEditId(session.id);
                } else {
                  setActiveSessionEditId(null);
                }
              }}
            />
          ))}

          {totalPages > 1 && (
            <div className="pagination">
              <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, paddingRight: '1rem' }}>
                {sessionPage > 1 && (
                  <button
                    className="btn btn--secondary btn--small"
                    onClick={() => setSessionPage(prev => Math.max(1, prev - 1))}
                  >
                    Назад
                  </button>
                )}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#666', whiteSpace: 'nowrap' }}>
                Страница {sessionPage} из {totalPages}
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-start', flex: 1, paddingLeft: '1rem' }}>
                {sessionPage < totalPages && (
                  <button
                    className="btn btn--secondary btn--small"
                    onClick={() => setSessionPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Вперед
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Удаление прохождения"
        message="Вы уверены, что хотите удалить это прохождение? Все записи участников будут аннулированы."
        confirmLabel="Удалить"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSessionToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!sessionToJoin}
        title="Запись на прохождение"
        message="Вы уверены, что хотите записаться на это прохождение?"
        confirmLabel="Записаться"
        confirmVariant="primary"
        onConfirm={handleJoinConfirm}
        onCancel={() => setSessionToJoin(null)}
      />

      <ConfirmModal
        isOpen={!!sessionToLeave}
        title="Отмена записи"
        message="Вы уверены, что хотите отменить свою запись на это прохождение?"
        confirmLabel="Отписаться"
        confirmVariant="delete"
        onConfirm={handleLeaveConfirm}
        onCancel={() => setSessionToLeave(null)}
      />
    </>
  );
});

export default RouteSessionsSection;
