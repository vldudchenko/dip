import express from 'express';
import { userService } from '../services/user.js';

const router = express.Router();

const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const validateId = (id, res) => {
  if (!id || !isValidUUID(id)) {
    res.status(400).json({ error: 'Неверный формат ID' });
    return false;
  }
  return true;
};

/**
 * GET /api/users/:id - Получение пользователя по ID
 */
router.get('/:id', async (req, res) => {
  try {
    if (!validateId(req.params.id, res)) return;
    
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/login/:login - Получение пользователя по логину
 */
router.get('/login/:login', async (req, res) => {
  try {
    const login = req.params.login;
    if (!login || login.length < 3 || login.length > 50) {
      return res.status(400).json({ error: 'Неверный логин' });
    }
    
    const user = await userService.getUserByLogin(login);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/users/:id/guide - Обновление статуса is_guide
 */
router.patch('/:id/guide', async (req, res) => {
  try {
    if (!validateId(req.params.id, res)) return;
    
    const { isGuide, userId: requesterId } = req.body;
    if (requesterId !== req.params.id) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    if (typeof isGuide !== 'boolean') {
      return res.status(400).json({ error: 'isGuide должен быть boolean' });
    }
    
    const user = await userService.updateUserIsGuide(req.params.id, isGuide);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
