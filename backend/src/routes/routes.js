import express from 'express';
import { routesService } from '../services/routes.js';
import { requireAuth } from '../middleware/errorHandler.js';

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
router.post('/', async (req, res) => {
  try {
    const route = await routesService.createRoute(req.body);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/routes/:id - Обновление маршрута
 */
router.patch('/:id', async (req, res) => {
  try {
    const route = await routesService.updateRoute(req.params.id, req.body);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/routes/:id - Удаление маршрута
 */
router.delete('/:id', async (req, res) => {
  try {
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
