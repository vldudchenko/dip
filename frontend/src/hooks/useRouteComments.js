import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/constants';

/**
 * Хук для управления комментариями (отзывами и вопросами) маршрута
 */
export const useRouteComments = (routeId, currentUserId) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const response = await fetch(`${API_URL}/routes/${routeId}/comments`);
      if (response.ok) {
        setComments(await response.json());
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [routeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (content, type) => {
    const response = await fetch(`${API_URL}/routes/${routeId}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({
        userId: currentUserId,
        content,
        type
      })
    });

    if (!response.ok) throw new Error('Ошибка при добавлении комментария');
    await fetchComments();
  }, [routeId, currentUserId, fetchComments]);

  const replyComment = useCallback(async (parentId, content) => {
    const response = await fetch(`${API_URL}/routes/${routeId}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({
        userId: currentUserId,
        content,
        parentId
      })
    });

    if (!response.ok) throw new Error('Ошибка при ответе');
    await fetchComments();
  }, [routeId, currentUserId, fetchComments]);

  const editComment = useCallback(async (commentId, content) => {
    const response = await fetch(`${API_URL}/route-comments/${commentId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({
        userId: currentUserId,
        content
      })
    });

    if (!response.ok) throw new Error('Ошибка при редактировании');
    await fetchComments();
  }, [currentUserId, fetchComments]);

  const deleteComment = useCallback(async (commentId) => {
    const response = await fetch(`${API_URL}/route-comments/${commentId}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'user-id': currentUserId
      },
      body: JSON.stringify({ userId: currentUserId })
    });

    if (!response.ok) throw new Error('Ошибка при удалении');
    await fetchComments();
  }, [currentUserId, fetchComments]);

  return {
    comments,
    loadingComments,
    addComment,
    replyComment,
    editComment,
    deleteComment,
    refreshComments: fetchComments
  };
};
