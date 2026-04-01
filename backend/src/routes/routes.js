import express from 'express';
import { routesService } from '../services/routes.js';

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

export default router;
