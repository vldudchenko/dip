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
    const commentMap = new Map();
    const rootComments = [];

    // Создаём карту всех комментариев
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Распределяем по уровням
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    // Сортируем ответы по дате (новые сверху)
    commentMap.forEach(comment => {
      comment.replies.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
    });

    return rootComments;
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
      const { data: parentComment, error: parentError } = await supabaseAnon
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

    // Проверяем владельца
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
}

export const commentService = new CommentService();
export default commentService;
