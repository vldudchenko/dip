import express from 'express';
import { mediaStorageService } from '../services/mediaStorage.js';
import { videoService } from '../services/video.js';
import { requireAuth, optionalAuth } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * POST /videos/upload-url - Получение Signed URL для прямой загрузки видео
 */
router.post('/upload-url', requireAuth, async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'Не указано имя файла' });
    }

    // Генерируем Signed URL для загрузки в бакет 'raw-videos'
    const { data, error } = await mediaStorageService.generateSignedUploadUrl('raw-videos', fileName);
    
    if (error) {
      throw error;
    }

    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /videos - Подтверждение загрузки видео и запуск обработки
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { userId, routeId, latitude, longitude, isLive, routeStart, routeEnd, routeGeometry, videoDuration, filePath, originalName } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Не указан путь к файлу' });
    }

    const additionalData = {
      routeId,
      isLive: isLive === 'true' || isLive === true,
      routeStart: routeStart ? (typeof routeStart === 'string' ? JSON.parse(routeStart) : routeStart) : null,
      routeEnd: routeEnd ? (typeof routeEnd === 'string' ? JSON.parse(routeEnd) : routeEnd) : null,
      routeGeometry: routeGeometry ? (typeof routeGeometry === 'string' ? JSON.parse(routeGeometry) : routeGeometry) : null,
      videoDuration: videoDuration ? parseInt(videoDuration) : null,
    };

    // Создаем запись в БД со статусом 'processing'
    const video = await mediaStorageService.registerVideo(
      userId,
      latitude,
      longitude,
      originalName,
      filePath,
      additionalData
    );

    // Запускаем фоновую обработку асинхронно
    // Импортируем динамически, чтобы избежать циклических зависимостей
    import('../services/videoProcessor.js').then(({ videoProcessorService }) => {
      videoProcessorService.processVideo(video.id, filePath).catch(err => {
        console.error(`Ошибка фоновой обработки видео ${video.id}:`, err);
      });
    });

    res.json({ success: true, video });
  } catch (error) {
    console.error('Upload confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos/clusters - Получение кластеров
 */
router.post('/clusters', async (req, res) => {
  try {
    const { bounds, zoom } = req.body;
    const clusters = await videoService.getClusters({ bounds, zoom });
    res.json(clusters);
  } catch (error) {
    console.error('Fetch clusters error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /videos - Получение всех видео
 */
  router.get('/', async (req, res) => {
    try {
      const { latitude, longitude, radius, routeId } = req.query;
  
      const videos = await videoService.getAllVideos({ latitude, longitude, radius, routeId });

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
 * POST /videos/:id/view - Добавление просмотра (мягкая авторизация)
 * userId берётся из JWT-куки (если есть) или из тела запроса
 */
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await videoService.addView(req.params.id, userId);
    res.json(result);
  } catch (error) {
    console.error('Add view error:', error);
    res.status(500).json({ error: error.message, viewed: false });
  }
});

/**
 * POST /videos/:id/like - Лайк/дизлайк видео (требует авторизацию)
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body; // userId гарантированно из токена (requireAuth)
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
    // Пытаемся получить userId из токена или из запроса
    let userId = req.query.userId;
    
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const { verifyToken } = await import('../middleware/errorHandler.js');
        const decoded = await verifyToken(token);
        userId = decoded.id;
      } catch (e) {
        // Игнорируем ошибки токена для этого эндпоинта
      }
    }

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

    await mediaStorageService.deleteVideo(id, video.file_url);

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

    const duration = await mediaStorageService.getVideoDuration(videoPath);

    res.json({ success: true, duration });
  } catch (error) {
    console.error('Get duration error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
