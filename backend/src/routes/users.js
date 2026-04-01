import express from 'express';
import { userService } from '../services/user.js';

const router = express.Router();

/**
 * GET /api/users/:id - Получение пользователя по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/login/:login - Получение пользователя по логину
 */
router.get('/login/:login', async (req, res) => {
  try {
    const user = await userService.getUserByLogin(req.params.login);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id/guide - Обновление статуса is_guide
 */
router.patch('/:id/guide', async (req, res) => {
  try {
    const { isGuide } = req.body;
    const user = await userService.updateUserIsGuide(req.params.id, isGuide);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
