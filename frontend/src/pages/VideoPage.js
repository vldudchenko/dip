import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import FormattedDate from '../components/FormattedDate';

// Компонент комментария с поддержкой вложенности
function CommentItem({ comment, user, onReply, onEdit, onDelete, activeReplyId, onToggleReply, activeEditId, onToggleEdit }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const isEditing = activeEditId === comment.id;
  const [editContent, setEditContent] = useState(comment.content);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const showReplyForm = activeReplyId === comment.id;
  const isOwner = user?.id === comment.user_id;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent);
    setReplyContent('');
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


  return (
    <div className="comment-item">
      <div className="comment-header">
        <Link to={`/user/${comment.users?.login}`} className="comment-header-user">
          <div className="avatar-container avatar-container--header">
            <img
              src={avatarError || !comment.users?.avatar ? defaultAvatar : comment.users.avatar}
              alt={comment.users?.login}
              onError={() => setAvatarError(true)}
            />
          </div>
          <div className="comment-info">
            <span className="comment-author">{comment.users?.full_name || comment.users?.login}</span>
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
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            {showReplies ? 'Скрыть ответы' : `Ответы (${comment.replies.length})`}
          </button>
        )}

        {comment.replyToUser && comment.replyToUser.id !== comment.users?.id && (
          <>
            <span className="comment-reply-arrow">→</span>
            <Link to={`/user/${comment.replyToUser.login}`} className="comment-header-user">
              <div className="avatar-container avatar-container--mini">
                <img
                  src={comment.replyToUser.avatar || defaultAvatar}
                  alt={comment.replyToUser.login}
                />
              </div>
              <span className="comment-author" style={{ fontSize: '0.85rem' }}>{comment.replyToUser.full_name || comment.replyToUser.login}</span>
            </Link>
          </>
        )}

        {isOwner && (
          <div className="comment-actions">
            <button className="btn btn--secondary btn--small" onClick={() => {
              onToggleEdit(comment.id);
              setEditContent(comment.content);
            }}>
              Редактировать
            </button>
            <button className="btn btn--secondary btn--small" onClick={handleDeleteClick}>
              Удалить
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form className="comment-edit-form" onSubmit={handleEdit}>
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
          <div className="comment-edit-actions" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button type="submit" className="btn btn--primary btn--small">Сохранить</button>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => onToggleEdit(null)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="comment-content">
          {comment.content.replace(/^@[^,]+, /, '')}
        </div>
      )}

      {!isEditing && (
        <div className="comment-footer" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <span className="comment-date" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            <FormattedDate date={comment.created_at} />
          </span>
          
          {user && (
            <button className="comment-reply-btn" onClick={() => {
              onToggleReply(comment.id);
              setReplyContent('');
            }}>
              {showReplyForm ? 'Отмена' : 'Ответить'}
            </button>
          )}
        </div>
      )}

      {showReplyForm && (
        <form className="comment-reply-form" onSubmit={handleReply}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Ваш ответ..."
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
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
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
}

export function VideoPage() {
  const { login, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Статистика и лайки
  const [stats, setStats] = useState({ viewCount: 0, likeCount: 0, commentCount: 0 });
  const [isLiked, setIsLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Комментарии
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [activeEditId, setActiveEditId] = useState(null);

  const handleToggleMainForm = () => {
    const newState = !showCommentForm;
    setShowCommentForm(newState);
    if (newState) {
      setActiveReplyId(null);
      setActiveEditId(null);
    }
  };

  const handleToggleReply = (id) => {
    if (activeReplyId === id) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(id);
      setShowCommentForm(false);
      setActiveEditId(null);
    }
  };

  const handleToggleEdit = (id) => {
    if (activeEditId === id) {
      setActiveEditId(null);
    } else {
      setActiveEditId(id);
      setShowCommentForm(false);
      setActiveReplyId(null);
    }
  };


  // Загрузка видео
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const data = await api.fetchVideoById(id);
        if (data) {
          setVideo(data);
          if (data.video_duration) {
            setVideoDuration(data.video_duration);
          }
        } else {
          setError('Видео не найдено');
        }
      } catch (err) {
        console.error('Ошибка получения видео:', err);
        setError('Ошибка загрузки видео');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  // Загрузка статистики, лайка и комментариев (объединено)
  useEffect(() => {
    if (!video) return;

    const fetchAllData = async () => {
      setLoadingComments(true);
      try {
        // Хелпер для подсчета общего количества комментариев (включая ответы)
        const countAll = (list) => {
          if (!list) return 0;
          return list.reduce((acc, c) => acc + 1 + countAll(c.replies), 0);
        };

        // Параллельные запросы
        const [statsData, likeData, commentsData] = await Promise.all([
          api.getVideoStats(id),
          user?.id ? api.checkLike(id, user.id) : Promise.resolve({ liked: false }),
          api.getComments(id)
        ]);

        const totalComments = countAll(commentsData);
        setStats({ ...statsData, commentCount: totalComments });
        setIsLiked(likeData.liked);
        setComments(commentsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchAllData();
  }, [id, video, user?.id]);

  // Засчитывание просмотра (только для авторизованных)
  useEffect(() => {
    if (!video || !user?.id) return;

    const recordView = async () => {
      try {
        await api.addView(id, user.id);
      } catch (err) {
        console.error('Error recording view:', err);
      }
    };

    recordView();
  }, [id, video, user?.id]);

  const isOwner = user?.id && video?.user_id === user.id;

  const handleDeleteClick = () => {
    setShowModal(true);
  };

  const handleDeleteConfirm = async () => {
    setShowModal(false);
    setDeleting(true);
    try {
      const result = await api.deleteVideo(id, user.id);
      if (result.success) {
        navigate('/');
      } else {
        alert(result.error || 'Ошибка при удалении');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Ошибка при удалении видео');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowModal(false);
  };

  // Обработчик лайка
  const handleLikeToggle = async () => {
    if (!user?.id) {
      alert('Для лайка необходимо авторизоваться');
      return;
    }

    setLoadingLike(true);
    try {
      const result = await api.toggleLike(id, user.id);
      if (result.success) {
        setIsLiked(result.liked);
        setStats(prev => ({
          ...prev,
          likeCount: prev.likeCount + (result.liked ? 1 : -1)
        }));
      }
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLoadingLike(false);
    }
  };

  // Добавление комментария
  const handleAddComment = useCallback(async (parentId = null, content = null) => {
    const commentText = content !== null ? content : newComment;
    if (!commentText.trim()) return;

    if (!user?.id) {
      alert('Для комментария необходимо авторизоваться');
      return;
    }

    setSubmittingComment(true);
    try {
      const result = await api.addComment(id, user.id, commentText, parentId);
      if (result.success) {
        if (parentId) {
          setComments(prev => prev.map(c => {
            if (c.id === parentId) {
              return { ...c, replies: [result.comment, ...c.replies] };
            }
            return c;
          }));
        } else {
          setComments(prev => [result.comment, ...prev]);
        }
        setStats(prev => ({ ...prev, commentCount: prev.commentCount + 1 }));
        setNewComment('');
        setShowCommentForm(false);
        setActiveReplyId(null);
        setActiveEditId(null);
      }
    } catch (err) {
      console.error('Add comment error:', err);
      alert('Ошибка при добавлении комментария');
    } finally {
      setSubmittingComment(false);
    }
  }, [id, user?.id, newComment]);

  // Редактирование комментария
  const handleEditComment = async (commentId, content) => {
    if (!user?.id) return;

    try {
      const result = await api.updateComment(commentId, user.id, content);
      if (result.success) {
        setComments(prev => prev.map(c => {
          if (c.id === commentId) {
            return { ...c, content: result.comment.content, updated_at: result.comment.updated_at };
          }
          if (c.replies && c.replies.some(r => r.id === commentId)) {
            return {
              ...c,
              replies: c.replies.map(r =>
                r.id === commentId ? { ...r, content: result.comment.content, updated_at: result.comment.updated_at } : r
              )
            };
          }
          return c;
        }));
        setActiveEditId(null);
      }
    } catch (err) {
      console.error('Update comment error:', err);
      alert('Ошибка при редактировании комментария');
    }
  };

  // Удаление комментария
  const handleDeleteComment = async (commentId) => {
    if (!user?.id) return;

    try {
      const result = await api.deleteComment(commentId, user.id);
      if (result.success) {
        const removeComment = (commentsList, commentIdToDelete) => {
          return commentsList
            .filter(c => c.id !== commentIdToDelete)
            .map(c => ({
              ...c,
              replies: c.replies ? removeComment(c.replies, commentIdToDelete) : []
            }));
        };
        setComments(prev => removeComment(prev, commentId));
        setStats(prev => ({ ...prev, commentCount: Math.max(0, prev.commentCount - 1) }));
      }
    } catch (err) {
      console.error('Delete comment error:', err);
      alert('Ошибка при удалении комментария');
    }
  };

  const handleReply = (parentId, content) => {
    handleAddComment(parentId, content);
  };


  if (loading) {
    return (
      <div className="route-detail-page">
        <p>Загрузка видео...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="route-detail-page">
        <p>{error || 'Видео не найдено'}</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  const author = video.users?.login;

  return (
    <div className="route-page-container video-page-container">
      <div className="route-page-sidebar">
        <button className="back-button" onClick={() => navigate(-1)}>
          Назад
        </button>
      </div>

      <div className="route-detail-page">
        <div className="route-detail-content">
          <div className="route-detail-main">
            <div className="video-playback-section">

              <div className="video-player-container">
                <video
                  src={video.file_url}
                  controls
                  autoPlay
                  className="video-player"
                />
              </div>
            </div>

            <div className="comments-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              </div>

              {user ? (
                showCommentForm && (
                  <form className="add-comment-form" onSubmit={(e) => { e.preventDefault(); handleAddComment(); }}>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Напишите комментарий..."
                      className="comment-input"
                      disabled={submittingComment}
                      maxLength={500}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right', marginTop: '2px' }}>
                      {newComment?.length || 0}/500
                    </div>
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={submittingComment || !newComment.trim()}
                    >
                      {submittingComment ? 'Отправка...' : 'Отправить'}
                    </button>
                  </form>
                )
              ) : (
                <p className="login-to-comment" style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  Авторизуйтесь, чтобы комментировать
                </p>
              )}

              <div className="comments-list">
                {loadingComments ? (
                  <p className="loading-comments" style={{ color: '#666' }}>Загрузка комментариев...</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      user={user}
                      onReply={handleReply}
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                      activeReplyId={activeReplyId}
                      onToggleReply={handleToggleReply}
                      activeEditId={activeEditId}
                      onToggleEdit={handleToggleEdit}
                    />
                  ))
                ) : (
                  <p className="no-comments" style={{ color: '#666' }}>Понравилась публикация?<br></br>Добавьте первый комментарий.</p>
                )}
              </div>
            </div>
          </div>

          <div className="route-detail-sidebar">
            <div className="guide-card">
              <Link to={`/user/${author}`} className="guide-card-link">
                <div className="avatar-container avatar-container--header">
                  <img
                    src={avatarError || !video.users?.avatar ? defaultAvatar : video.users.avatar}
                    alt={author}
                    onError={() => setAvatarError(true)}
                  />
                </div>
                <div className="guide-card-info">
                  <span className="guide-card-name">{video.users?.full_name || author}</span>
                  <span className="guide-card-login">@{author}</span>
                </div>
              </Link>

              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Загружено: {new Date(video.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="video-stats" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>Просмотры</span>
                  <span style={{ color: '#666' }}>{stats.viewCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className={`like-btn ${isLiked ? 'liked' : ''}`}
                    onClick={handleLikeToggle}
                    disabled={loadingLike}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {isLiked ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="#ef4444"
                        >
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ color: '#666' }}
                        >
                          <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>Лайки</span>
                  </button>
                  <span style={{ color: '#666' }}>{stats.likeCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#666' }}>Комментарии</span>
                  <span style={{ color: '#666' }}>{stats.commentCount}</span>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  className="btn btn--primary btn--full"
                  onClick={() => navigate('/map', {
                    state: {
                      center: [Number(video.longitude), Number(video.latitude)],
                      zoom: 18,
                      highlightedVideoId: video.id,
                      bearing: 0,
                      tilt: 0
                    }
                  })}
                >
                  Показать на карте
                </button>

                {video.route_id && (
                  <button
                    className="btn btn--secondary btn--full"
                    onClick={() => navigate(`/route/${video.route_id}`)}
                  >
                    Перейти к маршруту
                  </button>
                )}

                {user && (
                  <button
                    className="btn btn--secondary btn--full"
                    onClick={handleToggleMainForm}
                    style={{ color: '#666' }}
                  >
                    {showCommentForm ? 'Отмена' : 'Комментарий'}
                  </button>
                )}

                {isOwner && (
                  <button
                    className="btn btn--secondary btn--full"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    {deleting ? 'Удаление...' : 'Удалить видео'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showModal}
        title="Удаление видео"
        message="Вы уверены, что хотите удалить это видео? Это действие нельзя отменить."
        confirmLabel="Удалить"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}

export default VideoPage;
