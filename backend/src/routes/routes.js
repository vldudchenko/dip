import express from 'express';
import { routesService } from '../services/routes.js';
import { requireAuth, requireGuide } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/routes - Получение всех маршрутов
 */
router.get('/', async (req, res) => {
  try {
    const routes = await routesService.getAllRoutes();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/guide/:guideId - Получение всех маршрутов гида
 */
router.get('/guide/:guideId', async (req, res) => {
  try {
    const routes = await routesService.getRoutesByGuideId(req.params.guideId);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/:id - Получение маршрута по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const route = await routesService.getRouteById(req.params.id);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/:id/stats - Получение статистики маршрута
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const stats = await routesService.getRouteStats(req.params.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/routes/:id/view - Регистрация уникального просмотра маршрута
 */
router.post('/:id/view', requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await routesService.addView(req.params.id, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, viewed: false });
  }
});

/**
 * POST /api/routes - Создание нового маршрута
 */
router.post('/', requireGuide, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.userId;
    
    const route = await routesService.createRoute(data);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/routes/:id - Обновление маршрута
 */
router.patch('/:id', requireGuide, async (req, res) => {
  try {
    const { userId } = req.body;
    const route = await routesService.getRouteById(req.params.id);

    if (route.guide_id !== userId) {
      return res.status(403).json({ error: 'Вы не являетесь владельцем этого маршрута для редактирования' });
    }

    // Удаляем userId перед обновлением
    const data = { ...req.body };
    delete data.userId;

    const updatedRoute = await routesService.updateRoute(req.params.id, data);
    res.json(updatedRoute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/routes/:id - Удаление маршрута
 */
router.delete('/:id', requireGuide, async (req, res) => {
  try {
    const { userId } = req.body;
    const route = await routesService.getRouteById(req.params.id);

    if (route.guide_id !== userId) {
      return res.status(403).json({ error: 'Вы не являетесь владельцем этого маршрута' });
    }

    await routesService.deleteRoute(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/routes/search - Поиск маршрутов
 */
router.get('/search/all', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Необходимо указать поисковый запрос' });
    }
    const routes = await routesService.searchRoutes(query);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
