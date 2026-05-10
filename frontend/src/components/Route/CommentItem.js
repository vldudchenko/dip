import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import defaultAvatar from '../../static/Avatar.png';
import { ConfirmModal } from '../ConfirmModal';

/**
 * Компонент комментария с поддержкой вложенности и мемоизацией
 */
const CommentItem = memo(({ 
  comment, 
  user, 
  onReply, 
  onEdit, 
  onDelete, 
  activeReplyId, 
  onToggleReply, 
  activeEditId, 
  onToggleEdit, 
  isReply = false 
}) => {
  const [showReplies, setShowReplies] = useState(comment.type === 'question');
  const [avatarError, setAvatarError] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const isEditing = activeEditId === comment.id;
  const [editContent, setEditContent] = useState(comment.content);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isGuideOfRoute = user?.id === comment.guide_id && user?.is_guide;
  const showReplyForm = activeReplyId === comment.id;

  const canReply = comment.type === 'question' && isGuideOfRoute && !isReply && (!comment.replies || comment.replies.length === 0);
  const isReview = comment.type === 'review';

  const isOwner = user?.id === comment.user_id;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent);
    setReplyContent('');
    onToggleReply(comment.id);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    await onEdit(comment.id, editContent);
    onToggleEdit(null);
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    await onDelete(comment.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="comment-item">
      <div className="comment-header">
        <Link to={`/user/${comment.users?.login}`} className="comment-header-user">
          <div className="avatar-container avatar-container--small">
            <img
              src={avatarError || !comment.users?.avatar ? defaultAvatar : comment.users.avatar}
              alt={comment.users?.login}
              onError={() => setAvatarError(true)}
            />
          </div>
          <div className="comment-info">
            <span className="comment-author">{comment.users?.login}</span>
            <span className="comment-date">{formatDate(comment.created_at)}</span>
          </div>
        </Link>

        {comment.replies && comment.replies.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            style={{
              background: 'none',
              border: 'none',
              color: '#7c3aed',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginLeft: '8px',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
          >
            {showReplies ? 'Скрыть ответ' : 'Ответ'}
          </button>
        )}
        {(isOwner || comment.canDelete) && (
          <div className="comment-actions">
            {isOwner && (
              <button className="btn btn--secondary btn--small" onClick={() => {
                onToggleEdit(comment.id);
                setEditContent(comment.content);
              }}>
                Редактировать
              </button>
            )}
            <button className="btn btn--secondary btn--small" onClick={handleDeleteClick}>
              Удалить
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleEdit} className="comment-edit-form">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="comment-input"
            rows="2"
            maxLength={500}
          />
          <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right', marginTop: '2px' }}>
            {editContent?.length || 0}/500
          </div>
          <div className="comment-edit-actions">
            <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => onToggleEdit(null)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="comment-content">
          {comment.content.replace(/^@[^,]+, /, '')}
        </div>
      )}

      {user && !isEditing && !isReview && canReply && (
        <button
          className="comment-reply-btn"
          onClick={() => onToggleReply(comment.id)}
        >
          {showReplyForm ? 'Отмена' : 'Ответить'}
        </button>
      )}

      {showReplyForm && (
        <form onSubmit={handleReply} className="comment-reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Ответ пользователю..."
            className="comment-input"
            rows="2"
            maxLength={500}
          />
          <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right', marginTop: '2px' }}>
            {replyContent?.length || 0}/500
          </div>
          <button type="submit" className="btn btn--primary btn--small" disabled={!replyContent.trim()}>
            Отправить
          </button>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies-wrapper">
          {showReplies && (
            <div className="comment-replies">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  isReply={true}
                  comment={{
                    ...reply,
                    canDelete: comment.canDelete,
                    guide_id: comment.guide_id
                  }}
                  user={user}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  activeReplyId={activeReplyId}
                  onToggleReply={onToggleReply}
                  activeEditId={activeEditId}
                  onToggleEdit={onToggleEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Удаление комментария"
        message="Вы уверены, что хотите удалить этот комментарий?"
        confirmLabel="Удалить"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
});

export default CommentItem;
