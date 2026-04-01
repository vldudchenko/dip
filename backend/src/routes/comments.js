import express from 'express';
import { commentService } from '../services/comment.js';
import { requireAuth } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/videos/:videoId/comments - Получение комментариев к видео
 */
router.get('/videos/:videoId/comments', async (req, res) => {
  try {
    const comments = await commentService.getCommentsByVideoId(req.params.videoId);
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/videos/:videoId/comments - Добавление комментария
 */
router.post('/videos/:videoId/comments', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId, content, parentId } = req.body;

    const comment = await commentService.addComment(videoId, userId, content, parentId);

    res.json({ success: true, comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(error.message.includes('пустым') || error.message.includes('найден') ? 400 : 500).json({ error: error.message });
  }
});

/**
 * PUT /api/comments/:id - Обновление комментария
 */
router.put('/videos/:videoId/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;

    const comment = await commentService.updateComment(id, userId, content);

    res.json({ success: true, comment });
  } catch (error) {
    const status = error.message.includes('пустым') ? 400 :
                   error.message.includes('найден') ? 404 :
                   error.message.includes('свои') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

/**
 * DELETE /api/comments/:id - Удаление комментария
 */
router.delete('/videos/:videoId/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    await commentService.deleteComment(id, userId);

    res.json({ success: true, message: 'Комментарий удалён' });
  } catch (error) {
    const status = error.message.includes('найден') ? 404 :
                   error.message.includes('свои') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

export default router;
