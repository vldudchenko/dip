import { supabaseAnon, supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с комментариями
 */
class CommentService {
  /**
   * Получает все комментарии к видео с группировкой по уровням
   */
  async getCommentsByVideoId(videoId) {
    const { data, error } = await supabaseAnon
      .from('comments')
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return this.groupComments(data || []);
  }

  /**
   * Группирует комментарии по уровням (родительские и ответы)
   */
  groupComments(comments) {
    if (!comments || comments.length === 0) return [];

    const commentMap = new Map();
    const roots = [];

    // Первый проход: создаем объекты с массивом replies
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Второй проход: связываем детей с родителями
    comments.forEach(comment => {
      const node = commentMap.get(comment.id);
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id).replies.push(node);
      } else {
        roots.push(node);
      }
    });

    // Сортировка по дате (старые сверху)
    const sortByDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    
    roots.sort(sortByDate);
    commentMap.forEach(node => {
      if (node.replies.length > 0) {
        node.replies.sort(sortByDate);
      }
    });

    return roots;
  }

  /**
   * Добавляет комментарий
   */
  async addComment(videoId, userId, content, parentId = null) {
    if (!content || content.trim() === '') {
      throw new Error('Комментарий не может быть пустым');
    }

    // Проверяем существование родительского комментария
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentComment) {
        throw new Error('Родительский комментарий не найден');
      }
    }

    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('comments')
      .insert({
        video_id: videoId,
        user_id: userId,
        content: content.trim(),
        parent_id: parentId || null
      })
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .single();

    if (insertError) throw insertError;

    return { ...newComment, replies: [] };
  }

  /**
   * Обновляет комментарий
   */
  async updateComment(id, userId, content) {
    if (!content || content.trim() === '') {
      throw new Error('Комментарий не может быть пустым');
    }

    const existingComment = await this.getCommentById(id);

    if (existingComment.user_id !== userId) {
      throw new Error('Можно редактировать только свои комментарии');
    }

    const { data: updatedComment, error: updateError } = await supabaseAdmin
      .from('comments')
      .update({ content: content.trim() })
      .eq('id', id)
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .single();

    if (updateError) throw updateError;

    return updatedComment;
  }

  /**
   * Удаляет комментарий
   */
  async deleteComment(id, userId) {
    const existingComment = await this.getCommentById(id);

    if (existingComment.user_id !== userId) {
      throw new Error('Можно удалять только свои комментарии');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  }

  /**
   * Получает комментарий по ID
   */
  async getCommentById(id) {
    const { data: existingComment, error: commentError } = await supabaseAnon
      .from('comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (commentError || !existingComment) {
      throw new Error('Комментарий не найден');
    }

    return existingComment;
  }


  // ==========================================
  // МАРШРУТЫ (ROUTE COMMENTS)
  // ==========================================

  async getCommentsByRouteId(routeId) {
    const { data, error } = await supabaseAdmin
      .from('route_comments')
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .eq('route_id', routeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return this.groupComments(data || []);
  }

  async addRouteComment(routeId, userId, content, type = 'review', parentId = null) {
    if (!content || content.trim() === '') {
      throw new Error('Комментарий не может быть пустым');
    }

    // Проверка: писать отзывы к маршруту может только пользователь, который его прошел
    if (type === 'review' && !parentId) {
      const { data: participation, error: partError } = await supabaseAdmin
        .from('session_participants')
        .select(`
          session_id,
          route_sessions!inner (
            route_id,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('route_sessions.route_id', routeId)
        .eq('route_sessions.status', 'completed');

      const { data: routeData } = await supabaseAdmin
        .from('routes')
        .select('guide_id')
        .eq('id', routeId)
        .single();

      const isGuide = routeData?.guide_id === userId;
      const hasParticipated = participation && participation.length > 0;

      if (!hasParticipated && !isGuide) {
        throw new Error('Оставлять отзывы могут только пользователи, прошедшие маршрут');
      }
    }

    if (parentId) {
      const { data: parentComment, error: parentError } = await supabaseAdmin
        .from('route_comments')
        .select('id, type')
        .eq('id', parentId)
        .single();

      if (parentError || !parentComment) {
        throw new Error('Родительский комментарий не найден');
      }
      // Ответ наследует тип родителя
      type = parentComment.type;
    }

    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('route_comments')
      .insert({
        route_id: routeId,
        user_id: userId,
        content: content.trim(),
        type: type,
        parent_id: parentId || null
      })
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .single();

    if (insertError) throw insertError;

    return { ...newComment, replies: [] };
  }

  async updateRouteComment(id, userId, content) {
    if (!content || content.trim() === '') {
      throw new Error('Комментарий не может быть пустым');
    }

    const { data: existingComment, error: commentError } = await supabaseAdmin
      .from('route_comments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (commentError || !existingComment) {
      throw new Error('Комментарий не найден');
    }

    if (existingComment.user_id !== userId) {
      throw new Error('Можно редактировать только свои комментарии');
    }

    const { data: updatedComment, error: updateError } = await supabaseAdmin
      .from('route_comments')
      .update({ content: content.trim() })
      .eq('id', id)
      .select(`
        *,
        users (
          id,
          login,
          avatar
        )
      `)
      .single();

    if (updateError) throw updateError;

    return updatedComment;
  }

  async deleteRouteComment(id, userId) {
    const { data: existingComment, error: commentError } = await supabaseAdmin
      .from('route_comments')
      .select('user_id, route_id')
      .eq('id', id)
      .single();

    if (commentError || !existingComment) {
      throw new Error('Комментарий не найден');
    }

    // Проверяем, является ли пользователь гидом маршрута
    const { data: route, error: routeError } = await supabaseAnon
      .from('routes')
      .select('guide_id')
      .eq('id', existingComment.route_id)
      .single();

    const isGuide = !routeError && route && route.guide_id === userId;
    const isOwner = existingComment.user_id === userId;

    if (!isOwner && !isGuide) {
      throw new Error('Можно удалять только свои комментарии или комментарии к своим маршрутам');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('route_comments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
  }
}

export const commentService = new CommentService();
export default commentService;
