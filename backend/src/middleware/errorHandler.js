import { userService } from '../services/user.js';

/**
 * Middleware для обработки ошибок
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'PGRST116') {
    return res.status(404).json({ error: 'Ресурс не найден' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
};

/**
 * Middleware для проверки авторизации
 */
export const requireAuth = (req, res, next) => {
  const userId = req.headers['user-id'] || req.body.userId || req.query.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  next();
};

/**
 * Middleware для проверки статуса гида
 */
export const requireGuide = async (req, res, next) => {
  const userId = req.headers['user-id'] || req.body.userId || req.query.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    const user = await userService.getUserById(userId);
    if (!user || !user.is_guide) {
      return res.status(403).json({ error: 'У вас нет прав гида для выполнения этого действия' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Ошибка проверки прав доступа' });
  }
};

export default { errorHandler, requireAuth, requireGuide };
