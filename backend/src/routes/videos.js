import express from 'express';
import { upload } from '../middleware/upload.js';
import { videoStorageService } from '../services/videoStorage.js';
import { videoService } from '../services/video.js';
import { requireAuth } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /videos - Загрузка нового видео
 */
router.post('/videos', upload.single('video'), async (req, res) => {
  try {
    const { userId, latitude, longitude, isLive, routeStart, routeEnd, routeGeometry, videoDuration } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const additionalData = {
      isLive: isLive === 'true' || isLive === true,
      routeStart: routeStart ? (typeof routeStart === 'string' ? JSON.parse(routeStart) : routeStart) : null,
      routeEnd: routeEnd ? (typeof routeEnd === 'string' ? JSON.parse(routeEnd) : routeEnd) : null,
      routeGeometry: routeGeometry ? (typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry) : null,
      videoDuration: videoDuration ? parseInt(videoDuration) : null,
    };

    const video = await videoStorageService.uploadVideo(
      req.file,
      userId,
      latitude,
      longitude,
      additionalData
    );

    res.json({ success: true, video });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos - Получение всех видео
 */
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    const videos = await videoService.getAllVideos({ latitude, longitude, radius });

    res.json(videos);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos/:id - Получение видео по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const video = await videoService.getVideoById(req.params.id);
    res.json(video);
  } catch (error) {
    console.error('Fetch video error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos/:id/stats - Получение статистики видео
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await videoService.getVideoStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /videos/:id/view - Добавление просмотра
 */
router.post('/:id/view', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await videoService.addView(req.params.id, userId);

    if (!userId) {
      return res.status(401).json({ error: 'Требуется авторизация', viewed: false });
    }

    res.json(result);
  } catch (error) {
    console.error('Add view error:', error);
    res.status(500).json({ error: error.message, viewed: false });
  }
});

/**
 * POST /videos/:id/like - Лайк/дизлайк видео
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await videoService.toggleLike(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos/:id/like - Проверка лайка пользователя
 */
router.get('/:id/like', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.json({ liked: false });
    }

    const result = await videoService.checkLike(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /videos/:id - Удаление видео
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Получаем видео для проверки владельца
    const video = await videoService.getVideoById(id);

    // Проверяем, что пользователь является владельцем
    if (video.user_id !== userId) {
      return res.status(403).json({ error: 'Удаление доступно только владельцу' });
    }

    await videoStorageService.deleteVideo(id, video.file_url);

    res.json({ success: true, message: 'Видео удалено' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /videos/get-duration - Получение длительности видео
 */
router.post('/get-duration', async (req, res) => {
  try {
    const { videoPath } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'Не указан путь к видео' });
    }

    const duration = await videoStorageService.getVideoDuration(videoPath);

    res.json({ success: true, duration });
  } catch (error) {
    console.error('Get duration error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
