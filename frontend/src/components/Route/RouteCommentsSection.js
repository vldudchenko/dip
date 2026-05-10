import React, { useState, useCallback, memo } from 'react';
import CommentItem from './CommentItem';

/**
 * Секция комментариев с вкладками отзывов и вопросов, формами добавления и списком
 */
const RouteCommentsSection = memo(({ 
  comments, 
  currentUserId, 
  isGuide, 
  routeGuideId,
  onAdd, 
  onReply, 
  onEdit, 
  onDelete 
}) => {
  const [commentType, setCommentType] = useState('review');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);

  // Рекурсивный подсчет комментариев для вкладок
  const countCommentsRecursive = useCallback((list) => {
    if (!list) return 0;
    return list.reduce((acc, c) => acc + 1 + countCommentsRecursive(c.replies), 0);
  }, []);

  const handleToggleMainForm = () => {
    const newState = !showCommentForm;
    setShowCommentForm(newState);
    if (newState) {
      setActiveReplyId(null);
      setActiveEditId(null);
    }
  };

  const handleToggleReply = useCallback((id) => {
    if (activeReplyId === id) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(id);
      setShowCommentForm(false);
      setActiveEditId(null);
    }
  }, [activeReplyId]);

  const handleToggleEdit = useCallback((id) => {
    if (activeEditId === id) {
      setActiveEditId(null);
    } else {
      setActiveEditId(id);
      setShowCommentForm(false);
      setActiveReplyId(null);
    }
  }, [activeEditId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await onAdd(newComment, commentType);
      setNewComment('');
      setShowCommentForm(false);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="comments-section" style={{ marginTop: '10px' }}>
      <div className="comments-tabs" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '10px' }}>
        <button
          className={`tab-btn ${commentType === 'review' ? 'active' : ''}`}
          onClick={() => setCommentType('review')}
          style={{ padding: '10px 0', border: 'none', background: 'none', outline: 'none', color: commentType === 'review' ? '#7c3aed' : '#666', fontWeight: commentType === 'review' ? '600' : '400', cursor: 'pointer', position: 'relative' }}
        >
          Отзывы
          {(() => {
            const count = countCommentsRecursive(comments.filter(c => c.type === 'review'));
            return count > 0 ? <span className="tab-count" style={{ marginLeft: '6px' }}>{count}</span> : null;
          })()}
        </button>
        <button
          className={`tab-btn ${commentType === 'question' ? 'active' : ''}`}
          onClick={() => setCommentType('question')}
          style={{ padding: '10px 0', border: 'none', background: 'none', outline: 'none', color: commentType === 'question' ? '#7c3aed' : '#666', fontWeight: commentType === 'question' ? '600' : '400', cursor: 'pointer', position: 'relative' }}
        >
          Вопросы
          {(() => {
            const count = comments.filter(c => c.type === 'question').length;
            return count > 0 ? <span className="tab-count" style={{ marginLeft: '6px' }}>{count}</span> : null;
          })()}
        </button>

        {currentUserId && !isGuide && (
          <button
            className="btn btn--primary btn--small"
            onClick={handleToggleMainForm}
            style={{ marginLeft: 'auto', marginBottom: '8px' }}
          >
            {showCommentForm ? 'Отмена' : 'Написать'}
          </button>
        )}
      </div>

      {currentUserId ? (
        showCommentForm && (
          <form onSubmit={handleSubmitComment} className="comment-form" style={{ marginBottom: '1.5rem' }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Добавить комментарий..."
              className="comment-input"
              rows="3"
              maxLength={500}
            />
            <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right' }}>
              {newComment?.length || 0}/500
            </div>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!newComment.trim()}
              style={{ alignSelf: 'flex-start' }}
            >
              Отправить
            </button>
          </form>
        )
      ) : (
        <div className="login-prompt">
          <p>Пожалуйста, войдите в систему, чтобы оставлять комментарии.</p>
        </div>
      )}

      <div className="comments-list">
        {comments
          .filter(c => c.type === commentType)
          .map(comment => (
            <CommentItem
              key={comment.id}
              comment={{
                ...comment,
                canDelete: isGuide,
                guide_id: routeGuideId
              }}
              user={{ id: currentUserId, is_guide: isGuide }}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              activeReplyId={activeReplyId}
              onToggleReply={handleToggleReply}
              activeEditId={activeEditId}
              onToggleEdit={handleToggleEdit}
            />
          ))}
        {comments.filter(c => c.type === commentType).length === 0 && (
          <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>
            {commentType === 'review' ? 'Пока нет отзывов' : 'Пока нет вопросов'}
          </p>
        )}
      </div>
    </div>
  );
});

export default RouteCommentsSection;
