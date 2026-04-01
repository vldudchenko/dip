import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { LiveMarkerMap } from './LiveMarkerMap';

// Компонент комментария с поддержкой вложенности
function CommentItem({ comment, user, onReply, onEdit, onDelete }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = user?.id === comment.user_id;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    await onEdit(comment.id, editContent);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить комментарий?')) return;
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
        <img
          src={comment.users?.avatar || 'https://via.placeholder.com/32'}
          alt={comment.users?.login}
          className="comment-avatar"
        />
        <div className="comment-info">
          <span className="comment-author">{comment.users?.login}</span>
          <span className="comment-date">{formatDate(comment.created_at)}</span>
        </div>
        {isOwner && (
          <div className="comment-actions">
            <button className="comment-action-btn" onClick={() => setIsEditing(!isEditing)}>
              ✏️
            </button>
            <button className="comment-action-btn" onClick={handleDelete}>
              🗑
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <form className="comment-edit-form" onSubmit={handleEdit}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="comment-edit-textarea"
          />
          <div className="comment-edit-buttons">
            <button type="submit" className="btn btn--primary">Сохранить</button>
            <button type="button" className="btn btn--secondary" onClick={() => setIsEditing(false)}>Отмена</button>
          </div>
        </form>
      ) : (
        <div className="comment-content">{comment.content}</div>
      )}

      <div className="comment-footer">
        <button className="comment-reply-btn" onClick={() => setShowReplyForm(!showReplyForm)}>
          Ответить
        </button>
      </div>

      {showReplyForm && (
        <form className="comment-reply-form" onSubmit={handleReply}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Ваш ответ..."
            className="comment-reply-textarea"
          />
          <div className="comment-reply-buttons">
            <button type="submit" className="btn btn--primary btn--small">Отправить</button>
            <button type="button" className="btn btn--secondary btn--small" onClick={() => setShowReplyForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
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

  // Статистика и лайки
  const [stats, setStats] = useState({ viewCount: 0, likeCount: 0, commentCount: 0 });
  const [isLiked, setIsLiked] = useState(false);
  const [loadingLike, setLoadingLike] = useState(false);

  // Комментарии
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Live маркер
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

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
        // Параллельные запросы
        const [statsData, likeData, commentsData] = await Promise.all([
          api.getVideoStats(id),
          user?.id ? api.checkLike(id, user.id) : Promise.resolve({ liked: false }),
          api.getComments(id)
        ]);

        setStats(statsData);
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
  const isLiveMarker = video?.is_live && video.route_geometry;

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
        if (!parentId) {
          setNewComment('');
        }
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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  if (loading) {
    return (
      <div className="video-page-loading">
        <p>Загрузка видео...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-page-error">
        <p>{error || 'Видео не найдено'}</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  const author = video.users?.login;
  const avatarUrl = video.users?.avatar || 'https://via.placeholder.com/50';

  return (
    <div className="video-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← Назад к карте
      </button>

      <div className="video-page-content">
        <div className="video-main">
          <div className="video-content-with-sidebar">
            <div className="video-playback-section">
              {isLiveMarker && (
                <div className="live-marker-section live-marker-section--inline">
                  <LiveMarkerMap
                    routeGeometry={video.route_geometry}
                    videoDuration={videoDuration || video.video_duration}
                    currentTime={currentTime}
                    video={video}
                    inline
                  />
                </div>
              )}

              <div className="video-playback-layout">
                <div className="video-player-container">
                  <video
                    ref={videoRef}
                    src={video.file_url}
                    controls
                    autoPlay
                    className="video-player"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                  />
                </div>
              </div>
            </div>

            <div className="video-sidebar">
              <div className="video-details">
                <div className="video-author">
                  <img src={avatarUrl} alt={author} className="video-author-avatar" />
                  <div className="video-author-info">
                    <h3>{author}</h3>
                    <p>Загружено: {new Date(video.created_at).toLocaleDateString()}</p>
                    {isLiveMarker && (
                      <p className="live-badge">🎥 Live</p>
                    )}
                  </div>
                </div>

                <div className="video-stats">
                  <div className="stat-item">
                    <span className="stat-icon">👁️</span>
                    <span className="stat-value">{stats.viewCount}</span>
                    <span className="stat-label">Просмотров</span>
                  </div>
                  <div className="stat-item">
                    <button
                      className={`stat-btn like-btn ${isLiked ? 'liked' : ''}`}
                      onClick={handleLikeToggle}
                      disabled={loadingLike}
                    >
                      <span className="stat-icon">{isLiked ? '❤️' : '🤍'}</span>
                      <span className="stat-value">{stats.likeCount}</span>
                    </button>
                    <span className="stat-label">Лайков</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">💬</span>
                    <span className="stat-value">{stats.commentCount}</span>
                    <span className="stat-label">Комментариев</span>
                  </div>
                </div>

                {isOwner && (
                  <button
                    className="delete-video-button"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    {deleting ? 'Удаление...' : '🗑 Удалить видео'}
                  </button>
                )}

                <div className="video-location">
                  <h4>📍 Местоположение</h4>
                  <button
                    className="show-on-map-button"
                    onClick={() => navigate('/', {
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
                </div>
              </div>
            </div>
          </div>

          <div className="comments-section">
            <h3 className="comments-title">
              Комментарии ({stats.commentCount})
            </h3>

            {user ? (
              <form className="add-comment-form" onSubmit={(e) => { e.preventDefault(); handleAddComment(); }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Напишите комментарий..."
                  className="comment-input"
                  disabled={submittingComment}
                />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submittingComment || !newComment.trim()}
                >
                  {submittingComment ? 'Отправка...' : 'Отправить'}
                </button>
              </form>
            ) : (
              <p className="login-to-comment">
                <button className="btn btn--primary" onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/auth/yandex`}>
                  Войдите, чтобы комментировать
                </button>
              </p>
            )}

            <div className="comments-list">
              {loadingComments ? (
                <p className="loading-comments">Загрузка комментариев...</p>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    user={user}
                    onReply={handleReply}
                    onEdit={handleEditComment}
                    onDelete={handleDeleteComment}
                  />
                ))
              ) : (
                <p className="no-comments">Комментариев пока нет. Будьте первым!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Удаление видео</h3>
            <p className="modal-message">
              Вы уверены, что хотите удалить это видео? Это действие нельзя отменить.
            </p>
            <div className="modal-buttons">
              <button
                className="modal-button modal-button--cancel"
                onClick={handleDeleteCancel}
              >
                Отмена
              </button>
              <button
                className="modal-button modal-button--delete"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPage;
