import express from 'express';
import { sessionService } from '../services/session.js';
import { requireGuide } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/sessions/route/:routeId - Получение всех сессий для маршрута
 */
router.get('/route/:routeId', async (req, res) => {
  try {
    const sessions = await sessionService.getSessionsByRouteId(req.params.routeId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/guide/:guideId - Получение всех сессий гида
 */
router.get('/guide/:guideId', async (req, res) => {
  try {
    const sessions = await sessionService.getSessionsByGuideId(req.params.guideId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/user/:userId - Получение сессий пользователя
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const sessions = await sessionService.getUserSessions(req.params.userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:id - Получение сессии по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await sessionService.getSessionById(req.params.id);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions - Создание новой сессии
 */
router.post('/', requireGuide, async (req, res) => {
  try {
    const { start_date, start_time, userId } = req.body;

    // Проверка: сессию можно создать не ранее чем через 24 часа
    if (start_date && start_time) {
      const sessionDateTime = new Date(`${start_date}T${start_time}`);
      const now = new Date();
      const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 часа от текущего времени

      if (sessionDateTime < minDateTime) {
        return res.status(400).json({
          error: 'Ошибка: Запись на прохождение возможна не ранее чем через 24 часа от текущего времени'
        });
      }
    }

    // Удаляем не-бд поля перед передачей в сервис
    const data = { ...req.body };
    const fieldsToStrip = ['userId', 'participants', 'route', 'guide', 'session_participants'];
    fieldsToStrip.forEach(field => delete data[field]);

    const session = await sessionService.createSession(data);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/sessions/:id - Обновление сессии
 */
router.patch('/:id', requireGuide, async (req, res) => {
  try {
    const { userId } = req.body;
    const session = await sessionService.getSessionById(req.params.id);

    if (session.guide_id !== userId) {
      return res.status(403).json({ error: 'Вы не являетесь организатором этого прохождения' });
    }

    // Удаляем не-бд поля перед передачей в сервис
    const data = { ...req.body };
    const fieldsToStrip = ['userId', 'participants', 'route', 'guide', 'session_participants'];
    fieldsToStrip.forEach(field => delete data[field]);

    const updatedSession = await sessionService.updateSession(req.params.id, data);
    res.json(updatedSession);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:id - Удаление сессии
 */
router.delete('/:id', requireGuide, async (req, res) => {
  try {
    const { userId } = req.body;
    const session = await sessionService.getSessionById(req.params.id);

    if (session.guide_id !== userId) {
      return res.status(403).json({ error: 'Вы не являетесь организатором этого прохождения' });
    }

    await sessionService.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sessions/:id/join - Запись пользователя на сессию
 */
router.post('/:id/join', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Необходимо указать userId' });
    }

    const participant = await sessionService.addParticipant(req.params.id, userId);
    res.json(participant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sessions/:id/leave - Отписка пользователя от сессии
 */
router.delete('/:id/leave', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Необходимо указать userId' });
    }

    await sessionService.removeParticipant(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions/:id/is-joined - Проверка, записан ли пользователь
 */
router.get('/:id/is-joined', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Необходимо указать userId' });
    }

    const isJoined = await sessionService.isUserJoined(req.params.id, userId);
    res.json({ isJoined });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
