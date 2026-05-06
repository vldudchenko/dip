import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../utils/constants';
import defaultAvatar from '../static/Avatar.png';
import { ConfirmModal } from '../components/ConfirmModal';
import { Map } from '../components/Map';
import { AddSessionForm } from '../components/AddSessionForm';
import { SessionItem } from '../components/SessionItem';
import { useYandexMaps } from '../hooks/useYandexMaps';
import { useMapProvider } from '../hooks/useMapProvider';
import {
  STATUS_CLASSES,
  STATUS_LABELS,
  TRANSPORT_MAP,
  STOP_TYPE_MAP
} from '../utils/routeConstants';
import { reverseGeocode } from '../utils/map/leaflet/helpers';

// Компонент комментария с поддержкой вложенности
function CommentItem({ comment, user, onReply, onEdit, onDelete, activeReplyId, onToggleReply }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Добавляем проверку роли для ответов на вопросы и отзывы
  const isGuideOfRoute = user?.id === comment.guide_id; // Мы передадим guide_id в пропсах
  const showReplyForm = activeReplyId === comment.id;

  const canReply = comment.type === 'question' && isGuideOfRoute;
  const isReview = comment.type === 'review';

  const isOwner = user?.id === comment.user_id;
  // Мы также позволим удалять гиду, но кнопка будет управляться через проверку в самом onDelete (бэкенд уже разрешает).
  // Для простоты, мы будем передавать isGuide как пропс, если нужно.

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
    setIsEditing(false);
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
          <img
            src={comment.users?.avatar || 'https://via.placeholder.com/32'}
            alt={comment.users?.login}
            className="comment-avatar"
          />
          <div className="comment-info">
            <span className="comment-author">{comment.users?.login}</span>
            <span className="comment-date">{formatDate(comment.created_at)}</span>
          </div>
        </Link>
        {(isOwner || comment.canDelete) && (
          <div className="comment-actions">
            {isOwner && (
              <button className="btn btn--secondary btn--small" onClick={() => setIsEditing(!isEditing)}>
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
            <button type="button" className="btn btn--secondary btn--small" onClick={() => setIsEditing(false)}>Отмена</button>
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
          <div style={{ fontSize: '0.8rem', color: '#666', textAlign: 'right', marginTop: '2px', marginBottom: '8px' }}>
            {replyContent?.length || 0}/500
          </div>
          <button type="submit" className="btn btn--primary btn--small" disabled={!replyContent.trim()}>
            Отправить
          </button>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies-wrapper">
          <button
            className="comment-show-replies-btn"
            onClick={() => setShowReplies(!showReplies)}
          >
            {showReplies ? 'Скрыть ответ' : `Ответ`}
          </button>

          {showReplies && (
            <div className="comment-replies">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
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

/**
 * Страница просмотра маршрута
 */
export const RoutePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = localStorage.getItem('user_id');
  const { provider } = useMapProvider();
  const { ymapsReady, loadError } = useYandexMaps(provider === 'yandex');

  const [route, setRoute] = useState(null);
  const [guide, setGuide] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [userJoinedSessions, setUserJoinedSessions] = useState(new Set());
  const [routeVideos, setRouteVideos] = useState([]);
  const [routeImages, setRouteImages] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);
  const [videoToDelete, setVideoToDelete] = useState(null);

  // Состояние для работы с сессиями
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [routeAddresses, setRouteAddresses] = useState({});

  // Статистика и комментарии
  const [routeStats, setRouteStats] = useState({ views: 0, completed_sessions: 0 });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState('review');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [isMediaHovered, setIsMediaHovered] = useState(false);

  const handleToggleMainForm = () => {
    const newState = !showCommentForm;
    setShowCommentForm(newState);
    if (newState) setActiveReplyId(null);
  };

  const handleToggleReply = (id) => {
    if (activeReplyId === id) {
      setActiveReplyId(null);
    } else {
      setActiveReplyId(id);
      setShowCommentForm(false);
    }
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const routeResponse = await fetch(`${API_URL}/routes/${id}`);
        if (!routeResponse.ok) {
          throw new Error('Маршрут не найден');
        }
        const routeData = await routeResponse.json();
        setRoute(routeData);

        const guideResponse = await fetch(`${API_URL}/users/${routeData.guide_id}`);
        if (guideResponse.ok) {
          setGuide(await guideResponse.json());
        }

        const sessionsResponse = await fetch(`${API_URL}/sessions/route/${id}`);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          setSessions(sessionsData);

          if (currentUserId) {
            const joinedSessions = new Set();
            for (const session of sessionsData) {
              const checkResponse = await fetch(
                `${API_URL}/sessions/${session.id}/is-joined?userId=${currentUserId}`
              );
              if (checkResponse.ok) {
                const { isJoined } = await checkResponse.json();
                if (isJoined) {
                  joinedSessions.add(session.id);
                }
              }
            }
            setUserJoinedSessions(joinedSessions);
          }

          // Статистика и просмотры
          try {
            if (currentUserId) {
              await fetch(`${API_URL}/routes/${id}/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId })
              });
            }

            const statsResp = await fetch(`${API_URL}/routes/${id}/stats`);
            if (statsResp.ok) setRouteStats(await statsResp.json());
          } catch (e) {
            console.error('Stats error:', e);
          }

          // Комментарии
          try {
            const commentsResp = await fetch(`${API_URL}/routes/${id}/comments`);
            if (commentsResp.ok) setComments(await commentsResp.json());
          } catch (e) {
            console.error('Comments error:', e);
          }

          // Загрузка медиа
          refreshMedia();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const refreshMedia = async () => {
      try {
        setMediaLoading(true);
        const videosResp = await fetch(`${API_URL}/videos?routeId=${id}`);
        if (videosResp.ok) setRouteVideos(await videosResp.json());

        const imagesResp = await fetch(`${API_URL}/images/route/${id}`);
        if (imagesResp.ok) setRouteImages(await imagesResp.json());
      } catch (err) {
        console.error('Error fetching media:', err);
      } finally {
        setMediaLoading(false);
      }
    };

    fetchData();
  }, [id, currentUserId]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!route?.path_data) return;

      const newAddresses = {};
      const points = route.path_data;

      // Фильтруем точки, для которых нужен адрес
      const pointsToGeocode = points.map((pt, index) => ({ pt, index }))
        .filter(({ pt, index }) => {
          const isStart = index === 0;
          const isFinish = pt.stop_type === 'finish' || index === points.length - 1;
          const isStop = pt.stop_type && pt.stop_type !== 'none' && !isFinish;
          return isStart || isFinish || isStop;
        });

      // Выполняем запросы последовательно с небольшой задержкой для Nominatim
      for (let i = 0; i < pointsToGeocode.length; i++) {
        const { pt, index } = pointsToGeocode[i];
        const coords = Array.isArray(pt) ? pt : pt.coords;
        if (!coords) continue;
        const [lng, lat] = coords;

        try {
          const address = await reverseGeocode(lng, lat);
          if (address) {
            newAddresses[index] = address;
            // Обновляем состояние частично, чтобы пользователь видел прогресс
            setRouteAddresses(prev => ({ ...prev, [index]: address }));
          }
        } catch (e) {
          console.error("Geocoding error", e);
        }

        // Небольшая пауза между запросами (OSM Nominatim policy)
        if (i < pointsToGeocode.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    };

    fetchAddresses();
  }, [route?.path_data]);

  const refreshSessions = async () => {
    const sessionsResponse = await fetch(`${API_URL}/sessions/route/${id}`);
    if (sessionsResponse.ok) {
      setSessions(await sessionsResponse.json());
    }
  };

  // -----------------------------------------------------
  // КОММЕНТАРИИ
  // -----------------------------------------------------
  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/routes/${id}/comments`);
      if (response.ok) {
        setComments(await response.json());
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${API_URL}/routes/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          content: newComment,
          type: commentType
        })
      });

      if (!response.ok) throw new Error('Ошибка при добавлении комментария');

      setNewComment('');
      setShowCommentForm(false);
      setActiveReplyId(null);
      await fetchComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReplyComment = async (parentId, content) => {
    try {
      const response = await fetch(`${API_URL}/routes/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          content,
          parentId
        })
      });

      if (!response.ok) throw new Error('Ошибка при ответе');
      setActiveReplyId(null);
      setShowCommentForm(false);
      await fetchComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEditComment = async (commentId, content) => {
    try {
      const response = await fetch(`${API_URL}/route-comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          content
        })
      });

      if (!response.ok) throw new Error('Ошибка при редактировании');
      await fetchComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`${API_URL}/route-comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Ошибка при удалении');
      await fetchComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleJoinSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось записаться на сессию');
      }

      setUserJoinedSessions(prev => new Set([...prev, sessionId]));
      refreshSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeaveSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось отписаться от сессии');
      }

      setUserJoinedSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
      refreshSessions();
    } catch (err) {
      setError(err.message);
    }
  };


  const handleEditSession = async (sessionId, data) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: data.start_date,
          end_date: data.end_date || data.start_date,
          start_time: data.start_time,
          end_time: data.end_time,
          price: Number(data.price),
          min_people: Number(data.min_people),
          max_people: Number(data.max_people)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось обновить сессию');
      }

      refreshSessions();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const response = await fetch(`${API_URL}/sessions/${sessionToDelete}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось удалить сессию');
      }

      setSessionToDelete(null);
      refreshSessions();
    } catch (err) {
      console.error('Ошибка удаления сессии:', err.message);
    }
  };


  const calculateTotalDistance = (points) => {
    if (!points || points.length < 2) return 0;

    const R = 6371; // km
    let dist = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = Array.isArray(points[i - 1]) ? points[i - 1] : points[i - 1].coords;
      const curr = Array.isArray(points[i]) ? points[i] : points[i].coords;
      if (!prev || !curr) continue;

      const [lon1, lat1] = prev;
      const [lon2, lat2] = curr;

      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      dist += R * c;
    }
    return dist;
  };

  const formatDistance = (distKm) => {
    let meters = distKm * 1000;
    meters = Math.round(meters / 50) * 50;

    if (meters < 1000) {
      return `${meters}м`;
    }
    return `${(meters / 1000).toFixed(1)}км`;
  };

  const formatAddress = (addr) => {
    return addr || '';
  };

  const generateRouteDescription = (points, addresses = {}) => {
    if (!points || points.length === 0) return [];

    const transportActionMap = {
      'walking': 'пешком',
      'bus': 'на автобусе',
      'train': 'на электричке',
      'boat': 'на пароме/лодке'
    };

    let segments = [];
    let currentTransports = []; // Будем хранить объекты { type, distance }

    segments.push({
      isStart: true,
      title: 'Старт',
      address: formatAddress(addresses[0]) || '',
      transition: null
    });

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      const prevPt = points[i - 1];
      const dist = calculateTotalDistance([prevPt, pt]);
      const t = pt.transport || 'walking';

      let last = currentTransports[currentTransports.length - 1];
      if (last && last.type === t) {
        last.distance += dist;
      } else {
        currentTransports.push({ type: t, distance: dist });
      }

      const isFinish = pt.stop_type === 'finish' || i === points.length - 1;
      const isStop = pt.stop_type && pt.stop_type !== 'none' && !isFinish;

      if (isStop || isFinish) {
        let transitionText = currentTransports
          .map(tr => `${transportActionMap[tr.type] || tr.type} ~ ${formatDistance(tr.distance)}`)
          .join(', после ');

        let stopName = '';
        if (isFinish) {
          stopName = 'Финиш';
        } else {
          const rawLabel = STOP_TYPE_MAP[pt.stop_type]?.label || 'Остановка';
          // Убираем эмодзи (простой способ для данных меток)
          stopName = rawLabel.replace(/^[\s\S]*?\s/, '').trim();
          if (!stopName) stopName = rawLabel; // Fallback если пробела нет
        }

        segments.push({
          isStart: false,
          title: stopName,
          address: formatAddress(addresses[i]) || '',
          transition: transitionText
        });

        currentTransports = [];
      }
    }

    return segments;
  };

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mapResetKey, setMapResetKey] = useState(0);

  const allMedia = [
    ...routeImages.map(img => ({ type: 'image', url: img.file_url, id: img.id, raw: img })),
    ...routeVideos.map(vid => ({ type: 'video', url: vid.file_url, id: vid.id, raw: vid }))
  ];

  useEffect(() => {
    if (allMedia.length > 0 && activeMediaIndex >= allMedia.length) {
      setActiveMediaIndex(Math.max(0, allMedia.length - 1));
    }
  }, [allMedia.length, activeMediaIndex]);

  const handleVideoUpload = async (file) => {
    if (!file) return;
    try {
      setMediaLoading(true);
      const formData = new FormData();
      formData.append('video', file);
      formData.append('userId', currentUserId);
      formData.append('routeId', id);

      const response = await fetch(`${API_URL}/videos`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить видео');
      }

      const videosResp = await fetch(`${API_URL}/videos?routeId=${id}`);
      if (videosResp.ok) setRouteVideos(await videosResp.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    try {
      setMediaLoading(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('userId', currentUserId);
      formData.append('routeId', id);

      const response = await fetch(`${API_URL}/images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить изображение');
      }

      // Обновляем список изображений
      const imagesResp = await fetch(`${API_URL}/images/route/${id}`);
      if (imagesResp.ok) setRouteImages(await imagesResp.json());
    } catch (err) {
      alert(err.message);
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    try {
      const response = await fetch(`${API_URL}/images/${imageToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Не удалось удалить изображение');
      setRouteImages(prev => prev.filter(img => img.id !== imageToDelete.id));
      setImageToDelete(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete) return;
    try {
      const response = await fetch(`${API_URL}/videos/${videoToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) throw new Error('Не удалось удалить видео');
      setRouteVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
      setVideoToDelete(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMediaUpload = (file) => {
    if (!file) return;
    if (file.type.startsWith('image/')) {
      handleImageUpload(file);
    } else if (file.type.startsWith('video/')) {
      handleVideoUpload(file);
    }
  };

  const isRouteOwner = currentUserId === route?.guide_id;
  const isAnyGuide = currentUser?.is_guide;
  const isGuide = isRouteOwner; // Для совместимости с остальными частями кода, где это касается владения маршрутом

  if (loading) {
    return <div className="route-detail-page">Загрузка...</div>;
  }

  if (error) {
    return <div className="route-detail-page">Ошибка: {error}</div>;
  }

  return (
    <div className="route-page-container">
      <div className="route-page-sidebar">
        <button className="back-button" onClick={() => navigate(-1)}>
          Назад
        </button>
      </div>

      <div className="route-detail-page">
        <div className="route-detail-content">
          <div className="route-detail-main">
            <div className="route-detail-header">
              <h1>{route.title}</h1>
            </div>

            {route.description && (
              <div className="route-detail-description">
                <p>{route.description}</p>
              </div>
            )}

            {allMedia.length > 0 && (
              <div className="route-detail-gallery" style={{ marginBottom: isGuide ? '0' : '20px' }}>
                <div
                  style={{ width: '100%', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: '#000' }}
                  onMouseEnter={() => setIsMediaHovered(true)}
                  onMouseLeave={() => setIsMediaHovered(false)}
                >
                  {/* Области навигации */}
                  <div
                    onClick={() => {
                      if (activeMediaIndex > 0) setActiveMediaIndex(prev => prev - 1);
                    }}
                    style={{
                      position: 'absolute',
                      left: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      transition: 'background 0.2s',
                      background: isMediaHovered && activeMediaIndex > 0 ? '' : 'transparent',
                      paddingBottom: '10px',
                      paddingRight: '5px'
                    }}
                  >
                    {activeMediaIndex > 0 && (
                      <div style={{
                        fontSize: '3rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        textShadow: '0 0 10px rgba(0,0,0,0.5)',
                        userSelect: 'none',
                        opacity: isMediaHovered ? 1 : 0,
                        transition: 'opacity 0.2s'
                      }}>
                        ‹
                      </div>
                    )}
                  </div>
                  <div
                    onClick={() => {
                      if (activeMediaIndex < allMedia.length - 1) setActiveMediaIndex(prev => prev + 1);
                    }}
                    style={{
                      position: 'absolute',
                      right: '20px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      transition: 'background 0.2s',
                      background: isMediaHovered && activeMediaIndex < allMedia.length - 1 ? '' : 'transparent',
                      paddingBottom: '10px',
                      paddingLeft: '5px'
                    }}
                  >
                    {activeMediaIndex < allMedia.length - 1 && (
                      <div style={{
                        fontSize: '3rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        textShadow: '0 0 10px rgba(0,0,0,0.5)',
                        userSelect: 'none',
                        opacity: isMediaHovered ? 1 : 0,
                        transition: 'opacity 0.2s'
                      }}>
                        ›
                      </div>
                    )}
                  </div>

                  {allMedia[activeMediaIndex]?.type === 'image' ? (
                    <img src={allMedia[activeMediaIndex].url} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : allMedia[activeMediaIndex]?.type === 'video' ? (
                    <video src={allMedia[activeMediaIndex]?.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }} />
                  ) : null}

                  {/* Точки индикации */}
                  {isMediaHovered && allMedia.length > 1 && (
                    <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 20, pointerEvents: 'none' }}>
                      {allMedia.map((_, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: activeMediaIndex === idx ? '#7c3aed' : 'rgba(255, 255, 255, 1)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {isGuide && allMedia[activeMediaIndex] && (
                    <button
                      onClick={() => {
                        const m = allMedia[activeMediaIndex];
                        if (m.type === 'image') setImageToDelete(m.raw);
                        else setVideoToDelete(m.raw);
                      }}
                      style={{ position: 'absolute', top: '10px', right: '0px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', zIndex: 30 }}
                    >
                      Удалить
                    </button>
                  )}
                </div>

                {/* Объединенная кнопка загрузки справа под медиа */}
                {isGuide && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginBottom: '20px' }}>
                    <label className="btn btn--secondary btn--small" style={{ cursor: 'pointer' }}>
                      Загрузить медиа
                      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleMediaUpload(e.target.files[0])} disabled={mediaLoading} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {allMedia.length === 0 && isGuide && (
              <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <p style={{ color: '#6b7280', marginBottom: '15px' }}>Нет медиа. Загрузите фото или видео для маршрута.</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label className="btn btn--secondary btn--small" style={{ cursor: 'pointer' }}>
                    Загрузить медиа
                    <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => handleMediaUpload(e.target.files[0])} disabled={mediaLoading} />
                  </label>
                </div>
              </div>
            )}

            <div className="route-detail-map" style={{ marginBottom: isGuide ? '20px' : '40px', position: 'relative' }}>
              <div className="route-path-map-container" style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', position: 'relative' }}>
                <Map
                  key={`map-${mapResetKey}`}
                  mode="route-viewer"
                  routePoints={route.path_data}
                  ymapsReady={ymapsReady}
                  loadError={loadError}
                  configLoaded={true}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  zIndex: 1000,
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#374151',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Расстояние ~ {calculateTotalDistance(route.path_data).toFixed(1)} км
                </div>
                <button
                  onClick={() => setMapResetKey(prev => prev + 1)}
                  className="btn btn--secondary btn--small"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 1000,
                    fontSize: '0.9rem',
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #ccc'
                  }}
                >
                  Сбросить положение
                </button>
              </div>

              <div className="route-summary" style={{ marginTop: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px 12px', fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.2' }}>
                  {generateRouteDescription(route.path_data, routeAddresses).map((seg, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      {!seg.isStart && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280', fontStyle: 'italic', fontSize: '0.85rem' }}>
                          <span>➔</span>
                          <span>{seg.transition}</span>
                          <span>➔</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', padding: '2px 0' }}>
                        <span style={{ fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>{seg.title}</span>
                        {seg.address && (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '-2px' }}>{seg.address}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Заголовок сессий */}
            {(sessions.filter(s => s.status !== 'completed').length > 0 || (isAnyGuide && showAddSession)) && (
              <div className="sessions-header">
                <h2>Прохождения маршрута</h2>
                {isAnyGuide && (
                  <button
                    className="btn btn--primary btn--small"
                    onClick={() => setShowAddSession(!showAddSession)}
                  >
                    {showAddSession ? 'Отмена' : 'Добавить'}
                  </button>
                )}
              </div>
            )}

            {/* Кнопка "Добавить" для гида, если сессий нет и форма закрыта */}
            {isAnyGuide && sessions.filter(s => s.status !== 'completed').length === 0 && !showAddSession && (
              <div className="sessions-header" style={{ justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button
                  className="btn btn--primary btn--small"
                  onClick={() => setShowAddSession(true)}
                >
                  Добавить прохождение
                </button>
              </div>
            )}

            {/* Сообщение "Нет сессий": для всех, если список пуст и форма закрыта */}
            {sessions.filter(s => s.status !== 'completed').length === 0 && !showAddSession && (
              <div className="no-sessions-container" style={{ marginBottom: '20px' }}>
                <p className="no-sessions">Пока нет запланированных прохождений</p>
              </div>
            )}

            {showAddSession && (
              <AddSessionForm
                routeId={id}
                currentUserId={currentUserId}
                onSessionCreated={() => {
                  setShowAddSession(false);
                  refreshSessions();
                }}
                onCancel={() => setShowAddSession(false)}
              />
            )}

            {sessions.filter(s => s.status !== 'completed').length > 0 && (
              <div className="sessions-list">
                {sessions.filter(s => s.status !== 'completed').map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    currentUserId={currentUserId}
                    isRouteOwner={isRouteOwner}
                    onJoin={handleJoinSession}
                    onLeave={handleLeaveSession}
                    onEdit={handleEditSession}
                    onDelete={(id) => setSessionToDelete(id)}
                    isJoined={userJoinedSessions.has(session.id)}
                    statusLabels={STATUS_LABELS}
                    statusClasses={STATUS_CLASSES}
                    isLoggedIn={currentUserId !== null}
                  />
                ))}
              </div>
            )}


            {/* Блок комментариев */}
            <div className="comments-section" style={{ marginTop: '20px' }}>
              <div className="comments-tabs" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
                <button
                  className={`tab-btn ${commentType === 'review' ? 'active' : ''}`}
                  onClick={() => setCommentType('review')}
                  style={{ padding: '10px 0', border: 'none', background: 'none', outline: 'none', color: commentType === 'review' ? '#7c3aed' : '#666', fontWeight: commentType === 'review' ? '600' : '400', cursor: 'pointer', position: 'relative' }}
                >
                  <span>Отзывы</span>
                  {commentType === 'review' && (
                    <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', background: '#7c3aed' }}></div>
                  )}
                </button>
                <button
                  className={`tab-btn ${commentType === 'question' ? 'active' : ''}`}
                  onClick={() => setCommentType('question')}
                  style={{ padding: '10px 0', border: 'none', background: 'none', outline: 'none', color: commentType === 'question' ? '#7c3aed' : '#666', fontWeight: commentType === 'question' ? '600' : '400', cursor: 'pointer', position: 'relative' }}
                >
                  <span>Вопросы</span>
                  {commentType === 'question' && (
                    <div style={{ position: 'absolute', bottom: '-1px', left: 0, right: 0, height: '2px', background: '#7c3aed' }}></div>
                  )}
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
                  <form onSubmit={(e) => handleAddComment(e)} className="comment-form" style={{ marginBottom: '1.5rem' }}>
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
                        canDelete: currentUserId === route?.guide_id,
                        guide_id: route?.guide_id // Передаем guide_id для проверки возможности ответа
                      }}
                      user={{ id: currentUserId }}
                      onReply={handleReplyComment}
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                      activeReplyId={activeReplyId}
                      onToggleReply={handleToggleReply}
                    />
                  ))}
                {comments.filter(c => c.type === commentType).length === 0 && (
                  <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>
                    {commentType === 'review' ? 'Пока нет отзывов' : 'Пока нет вопросов'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="route-detail-sidebar">
            <div className="guide-card">
              {guide && guide.login && (
                <>
                  <Link to={`/guide/${guide.login}`} className="guide-card-link">
                    <img
                      src={avatarError || !guide?.avatar ? defaultAvatar : guide.avatar}
                      alt={guide.login}
                      className="guide-card-avatar"
                      onError={() => setAvatarError(true)}
                    />

                    <div className="guide-card-info">
                      <span className="guide-card-name">{guide.login}</span>
                    </div>
                  </Link>
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                      <span><strong>Создан:</strong> {new Date(route.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#4b5563' }}>
                      <span><strong>Просмотров:</strong> {routeStats.views}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563' }}>
                      <span><strong>Пройдено:</strong> {routeStats.completed_sessions} раз(а)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


        <ConfirmModal
          isOpen={!!imageToDelete}
          title="Удаление изображения"
          message="Вы уверены, что хотите удалить это изображение?"
          confirmLabel="Удалить"
          onConfirm={handleDeleteImage}
          onCancel={() => setImageToDelete(null)}
        />

        <ConfirmModal
          isOpen={!!videoToDelete}
          title="Удаление видео"
          message="Вы уверены, что хотите удалить это видео?"
          confirmLabel="Удалить"
          onConfirm={handleDeleteVideo}
          onCancel={() => setVideoToDelete(null)}
        />

        <ConfirmModal
          isOpen={!!sessionToDelete}
          title="Удаление прохождения"
          message="Вы уверены, что хотите удалить это прохождение? Все записи участников будут аннулированы."
          confirmLabel="Удалить"
          onConfirm={handleDeleteSession}
          onCancel={() => setSessionToDelete(null)}
        />
      </div>
    </div>
  );
};

export default RoutePage;
