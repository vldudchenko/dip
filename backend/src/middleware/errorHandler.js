import { userService } from '../services/user.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

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
 * Вспомогательная функция для извлечения и проверки токена
 */
export const verifyToken = (req) => {
  let token = req.cookies?.token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    throw { status: 401, message: 'Требуется авторизация (отсутствует токен)' };
  }

  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    throw { status: 401, message: 'Неверный или просроченный токен' };
  }
};

/**
 * Middleware для проверки авторизации
 */
export const requireAuth = (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    req.user = decoded; // { userId, is_guide }
    
    // Безопасность: ВСЕГДА используем userId из токена, перекрывая данные из body
    req.body.userId = decoded.userId;
    
    next();
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }
};

/**
 * Middleware для проверки статуса гида
 */
export const requireGuide = async (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    req.user = decoded;
    
    // Безопасность: ВСЕГДА используем userId из токена
    req.body.userId = decoded.userId;

    if (!decoded.is_guide) {
      // Проверка в БД для актуальности данных (на случай депортации гида)
      const user = await userService.getUserById(decoded.userId);
      if (!user || !user.is_guide) {
        return res.status(403).json({ error: 'У вас нет прав гида для выполнения этого действия' });
      }
    }
    
    next();
  } catch (error) {
    return res.status(error.status || 401).json({ error: error.message });
  }
};

/**
 * Middleware для мягкой проверки авторизации.
 * Если кука есть — записывает userId из токена.
 * Если нет — оставляет userId из req.body без ошибки.
 */
export const optionalAuth = (req, res, next) => {
  try {
    const decoded = verifyToken(req);
    req.user = decoded;
    req.body.userId = decoded.userId;
  } catch (_) {
    // Не блокируем запрос — userId остаётся тем, что пришло в body
  }
  next();
};

export default { errorHandler, requireAuth, requireGuide, optionalAuth };
